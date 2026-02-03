const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const { registerVoice } = require("../voice-server/voice");
const { createRoom, getRoom, deleteRoom } = require("./rooms");
const { addPlayer, removePlayer } = require("./players");
const { assignRoles } = require("./roles");
const { checkWin } = require("./wincheck");
const {
  startNight,
  startVoting,
  finishVoting,
  endGame,
  resetRoom,
  resolveNight,
  startDayReveal
} = require("./state");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

registerVoice(io);

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

// helper: broadcast to room
function broadcast(room, event, payload) {
  io.to(room.roomCode).emit(event, payload);
}

io.on("connection", socket => {

  socket.on("createRoom", ({ roomCode, hostName }) => {
    const result = createRoom(roomCode, socket.id, hostName);
    if (result.error) return socket.emit("roomError", result.error);

    socket.join(roomCode);
    socket.emit("youAre", { id: socket.id, name: hostName });
    broadcast(result.room, "roomUpdate", publicRoom(result.room));
  });

  socket.on("joinRoom", ({ roomCode, playerName }) => {
    const result = addPlayer(roomCode, socket.id, playerName);
    if (result.error) return socket.emit("roomError", result.error);

    socket.join(roomCode);
    socket.emit("youAre", { id: socket.id, name: playerName });
    broadcast(result.room, "roomUpdate", publicRoom(result.room));
  });

  socket.on("startGame", ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room) return;

    if (socket.id !== room.hostId) {
      return socket.emit("roomError", "NOT_HOST");
    }

    assignRoles(room);

    room.state = {
      phase: "night",
      round: 1,
      mafiaTarget: null,
      doctorTarget: null,
      votes: {},
      ready: new Set()
    };

    // private role reveal
    room.players.forEach(p => {
      io.to(p.id).emit("roleReveal", { role: p.role });
    });

    // public update (no roles during game) so clients have correct alive list/phase
    broadcast(room, "roomUpdate", publicRoom(room));

    startNight(room, io);
  });

  socket.on("nightAction", ({ roomCode, role, targetId }) => {
    const room = getRoom(roomCode);
    if (!room || room.state.phase !== "night") return;

    const actor = room.players.find(p => p.id === socket.id);
    if (!actor || !actor.alive) return;

    const target = room.players.find(p => p.id === targetId);
    if (!target || !target.alive) return;

    // Don't trust client-sent role; use server-truth
    if (actor.role === "mafia") room.state.mafiaTarget = targetId;
    if (actor.role === "doctor") room.state.doctorTarget = targetId;
  });

  socket.on("endNight", ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room) return;

    const resolution = resolveNight(room);
    
    const win = checkWin(room);
    if (win) {
      return endGame(room, io, win);
    }

    startDayReveal(room, io, resolution);
  });

  socket.on("dayReady", ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room || room.state.phase !== "day") return;

    const actor = room.players.find(p => p.id === socket.id);
    if (!actor || !actor.alive) return;

    room.state.ready.add(socket.id);

    const alive = room.players.filter(p => p.alive).length;

    if (room.state.ready.size >= alive) {
      return startVoting(room, io);
    }

    if (room.state.ready.size >= Math.ceil(alive / 2) && !room.state.discussionTimeout) {
      broadcast(room, "discussionCountdown", { seconds: 60 });

      room.state.discussionTimeout = setTimeout(() => {
        startVoting(room, io);
      }, 60000);
    }
  });

  socket.on("submitVote", ({ roomCode, targetId }) => {
    const room = getRoom(roomCode);
    if (!room || room.state.phase !== "voting") return;

    const voter = room.players.find(p => p.id === socket.id);
    if (!voter || !voter.alive) return;

    const target = room.players.find(p => p.id === targetId);
    if (!target || !target.alive) return;

    room.state.votes[socket.id] = targetId;
    const alive = room.players.filter(p => p.alive).length;

    if (Object.keys(room.state.votes).length >= alive) {
      finishVoting(room, io);
    }
  });

  socket.on("resetGame", ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room) return;

    resetRoom(room, io);
  });

  socket.on("disconnect", () => {
    const result = removePlayer(socket.id);
    if (!result.removed) return;

    if (result.roomCode) {
      const room = getRoom(result.roomCode);
      if (room) broadcast(room, "roomUpdate", publicRoom(room));
    }
  });

});

server.listen(3001, () => {
  console.log("Game backend running on port 3001");
  // console.log("Player" ${playerName} "joined room" ${roomcode})

});
