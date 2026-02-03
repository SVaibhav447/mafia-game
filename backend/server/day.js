const { checkWin } = require("./wincheck");

function startDay(room, resolution) {
  const { killed, prevented } = resolution;

  room.state.phase = "dayReveal";
  room.state.reveal = { killed, prevented };

  room.broadcast("phaseChange", { phase: "dayReveal" });
  room.broadcast("nightResult", { killed, prevented });

  // cinematic delay 3s
  setTimeout(() => {
    // if someone died -> reveal alignment with fade
    if (killed) {
      const victim = room.players.find(p => p.id === killed);
      room.broadcast("alignmentReveal", {
        id: victim.id,
        role: victim.role,
        alignment: victim.role === "mafia" ? "bad" : "good"
      });
    }

    // then 3s delay before actual day begins
    setTimeout(() => {
      room.state.phase = "day";
      room.broadcast("phaseChange", { phase: "day" });

      // start discussion timer here (T1)
      startDiscussion(room);
    }, 3000);

  }, 3000);
}
function startDiscussion(room) {
  room.state.phase = "day";
  room.state.ready = new Set();
  room.state.discussionTimeout = null;

  // players can hit "ready"
  room.on("readyToVote", (playerId) => {
    room.state.ready.add(playerId);

    const alive = room.players.filter(p => p.alive).length;

    if (room.state.ready.size >= alive) {
      // all ready => skip directly
      return startVoting(room);
    }

    // if majority ready and no timer yet => start 60s timer
    if (room.state.ready.size >= Math.ceil(alive / 2) && !room.state.discussionTimeout) {
      room.broadcast("discussionTimerStart", { seconds: 60 });

      room.state.discussionTimeout = setTimeout(() => {
        startVoting(room);
      }, 60000);
    }
  });
}
function startVoting(room) {
  room.state.phase = "voting";
  room.state.votes = {};

  room.broadcast("phaseChange", { phase: "voting" });
  room.broadcast("votingStart", {});

  const alive = room.players.filter(p => p.alive).length;

  const voteCheck = () => {
    const votesCast = Object.keys(room.state.votes).length;
    if (votesCast >= alive) return finishVoting(room);
  };

  room.on("submitVote", ({ voterId, targetId }) => {
    room.state.votes[voterId] = targetId;
    voteCheck();
  });

  // backend owns voting time
  room.state.voteTimeout = setTimeout(() => {
    finishVoting(room);
  }, 45000);
}
function finishVoting(room) {
  room.state.phase = "lynchReveal";

  const tally = {};
  for (const v of Object.values(room.state.votes)) {
    tally[v] = (tally[v] || 0) + 1;
  }

  let lynched = null;
  let max = 0;
  Object.entries(tally).forEach(([pid, count]) => {
    if (count > max) {
      max = count;
      lynched = pid;
    }
  });

  if (lynched) {
    const p = room.players.find(p => p.id === lynched);
    p.alive = false;

    room.broadcast("lynchReveal", {
      id: p.id,
      role: p.role
    });

  } else {
    room.broadcast("noLynch", {});
  }

  setTimeout(() => {
    const win = checkWin(room);
    if (win) return endGame(room, win);

    // start next night
    room.startNight();
  }, 3000);
}


module.exports = { startDay };
