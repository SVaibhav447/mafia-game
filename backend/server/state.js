// backend/server/state.js

const { checkWin } = require("./wincheck");

function broadcast(room, io, event, payload) {
  io.to(room.roomCode).emit(event, payload);
}

function publicRoom(room) {
  const includeRoles = room.state?.phase === "endgame";
  return {
    roomCode: room.roomCode,
    hostId: room.hostId,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      alive: !!p.alive,
      ...(includeRoles ? { role: p.role } : {})
    })),
    state: room.state ? { phase: room.state.phase, round: room.state.round } : null
  };
}

function startNight(room, io) {
  room.state.phase = "night";
  room.state.mafiaTarget = null;
  room.state.doctorTarget = null;
  // DON'T increment round here

  broadcast(room, io, "phaseChange", { phase: "night", round: room.state.round });

  room.state.nightTimeout = setTimeout(() => {
    endNight(room, io);
  }, 30000);
}

function endNight(room, io) {
  if (room.state.phase !== "night") return;
  clearTimeout(room.state.nightTimeout);

  const resolution = resolveNight(room);
  const win = checkWin(room);
  if (win) return endGame(room, io, win);

  startDayReveal(room, io, resolution);
}

function resolveNight(room) {
  const { mafiaTarget, doctorTarget } = room.state;
  let killed = null;
  let prevented = false;

  if (mafiaTarget) {
    if (mafiaTarget === doctorTarget) {
      prevented = true;
    } else {
      const victim = room.players.find(p => p.id === mafiaTarget);
      if (victim && victim.alive) {
        victim.alive = false;
        killed = mafiaTarget;

        // ensure dead players can't count toward ready/vote
        if (room.state?.ready?.delete) room.state.ready.delete(victim.id);
        if (room.state?.votes) delete room.state.votes[victim.id];
      }
    }
  }

  room.state.mafiaTarget = null;
  room.state.doctorTarget = null;
  return { killed, prevented };
}

function startDayReveal(room, io, resolution) {
  const { killed, prevented } = resolution;

  room.state.phase = "dayReveal";
  // broadcast updated alive list immediately (no roles leaked)
  broadcast(room, io, "roomUpdate", publicRoom(room));
  broadcast(room, io, "phaseChange", { phase: "dayReveal" });
  broadcast(room, io, "nightResult", { killed, prevented });

  if (killed) {
    const victim = room.players.find(p => p.id === killed);
    
    setTimeout(() => {
      broadcast(room, io, "identityReveal", { id: victim.id, name: victim.name });

      setTimeout(() => {
        const alignment = victim.role === "mafia" ? "bad" : "good";
        broadcast(room, io, "alignmentReveal", { 
          id: victim.id, 
          role: victim.role,
          alignment 
        });

        // Wait 12 seconds total before transitioning
        setTimeout(() => startDay(room, io), 8000);
      }, 2000);
    }, 1000);

  } else if (prevented) {
    broadcast(room, io, "killBlocked", {});
    setTimeout(() => startDay(room, io), 6000);
  } else {
    broadcast(room, io, "noKill", {});
    setTimeout(() => startDay(room, io), 6000);
  }
}

function startDay(room, io) {
  // Increment round at START of day
  room.state.round++;
  room.state.phase = "day";
  room.state.ready = new Set();
  room.state.discussionTimeout = null;

  broadcast(room, io, "phaseChange", { phase: "day", round: room.state.round });
  broadcast(room, io, "discussionStart", {});
}

function startVoting(room, io) {
  clearTimeout(room.state.discussionTimeout);
  room.state.phase = "voting";
  room.state.votes = {};

  broadcast(room, io, "phaseChange", { phase: "voting" });
  broadcast(room, io, "votingStart", {});

  room.state.voteTimeout = setTimeout(() => {
    finishVoting(room, io);
  }, 45000);
}

function finishVoting(room, io) {
  if (room.state.phase !== "voting") return;
  clearTimeout(room.state.voteTimeout);

  room.state.phase = "lynchReveal";
  broadcast(room, io, "phaseChange", { phase: "lynchReveal" });

  const tally = {};
  for (const vote of Object.values(room.state.votes)) {
    tally[vote] = (tally[vote] || 0) + 1;
  }

  const entries = Object.entries(tally);
  let lynched = null;
  let max = 0;

  entries.forEach(([pid, count]) => {
    if (count > max) {
      max = count;
      lynched = pid;
    }
  });

  const tiedCount = entries.filter(([_, c]) => c === max).length;

  if (!lynched || tiedCount > 1) {
    broadcast(room, io, "noLynch", {});
    setTimeout(() => postLynch(room, io), 6000);
    return;
  }

  const victim = room.players.find(p => p.id === lynched);
  if (victim && victim.alive) {
    victim.alive = false;
    if (room.state?.ready?.delete) room.state.ready.delete(victim.id);
    if (room.state?.votes) delete room.state.votes[victim.id];
  }

  // broadcast updated alive list immediately (no roles leaked)
  broadcast(room, io, "roomUpdate", publicRoom(room));

  broadcast(room, io, "lynchReveal", {
    id: victim.id,
    name: victim.name
  });

  setTimeout(() => {
    const alignment = victim.role === "mafia" ? "bad" : "good";
    broadcast(room, io, "lynchAlignment", { 
      id: victim.id, 
      role: victim.role,
      alignment 
    });

    // Wait 12 seconds total
    setTimeout(() => postLynch(room, io), 8000);
  }, 2000);
}

function postLynch(room, io) {
  const win = checkWin(room);
  if (win) return endGame(room, io, win);
  startNight(room, io);
}

function endGame(room, io, win) {
  room.state.phase = "endgame";
  broadcast(room, io, "roomUpdate", publicRoom(room));
  broadcast(room, io, "gameOver", win);
  broadcast(room, io, "phaseChange", { phase: "endgame" });
}

function resetRoom(room, io) {
  clearTimeout(room.state.nightTimeout);
  clearTimeout(room.state.discussionTimeout);
  clearTimeout(room.state.voteTimeout);

  room.state = {
    phase: "lobby",
    round: 0,
    mafiaTarget: null,
    doctorTarget: null,
    votes: {},
    ready: new Set()
  };

  for (const p of room.players) {
    p.alive = true;
    p.role = null;
  }

  broadcast(room, io, "roomUpdate", publicRoom(room));
  broadcast(room, io, "phaseChange", { phase: "lobby" });
  broadcast(room, io, "lobbyReset", {});
}

module.exports = {
  startNight,
  endNight,
  resolveNight,
  startDayReveal,
  startDay,
  startVoting,
  finishVoting,
  postLynch,
  endGame,
  resetRoom
};