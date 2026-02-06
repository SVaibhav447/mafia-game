const crypto = require("crypto");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const { createRoom, getRoom } = require("./rooms");
const { addPlayer, removePlayer } = require("./players");
const { assignRoles } = require("./roles");
const { checkWin } = require("./wincheck");
const {
  startNight,
  endNight,
  startVoting,
  finishVoting,
  endGame,
  resetRoom,
  startDayReveal
} = require("./state");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3001",
      "https://mafia-game-topaz.vercel.app/"
    ],
    methods: ["GET", "POST"]
  }
});

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
    state: room.state
      ? {
          phase: room.state.phase,
          round: room.state.round,
          nightEndsAt: room.state.nightEndsAt || null,
          discussionEndsAt: room.state.discussionEndsAt || null,
          votingEndsAt: room.state.votingEndsAt || null
        }
      : null
  };
}


function generateSeed() {
  return crypto.randomInt(1, 2147483647); // nice safe 32-bit seed
}

// helper: broadcast to room
function broadcast(room, event, payload) {
  io.to(room.roomCode).emit(event, payload);
}

io.on("connection", socket => {

  socket.on("createRoom", ({ roomCode, hostName, playerId }) => {
    const result = createRoom(roomCode, socket.id, hostName, playerId);
    if (result.error) return socket.emit("roomError", result.error);
    result.room.shuffleSeed = generateSeed();
    socket.emit("shuffleSeed", { shuffleSeed: result.room.shuffleSeed });


    socket.join(roomCode);
    socket.emit("youAre", { id: result.player.id, name: hostName });
    broadcast(result.room, "roomUpdate", publicRoom(result.room));
  });

  socket.on("joinRoom", ({ roomCode, playerName, playerId }) => {
    const result = addPlayer(roomCode, socket.id, playerName, playerId);
    if (result.error) return socket.emit("roomError", result.error);
    socket.emit("shuffleSeed", { shuffleSeed: result.room.shuffleSeed });

    if (result.reconnected && result.room.state?.phase !== "lobby" && result.player?.role) {
      socket.emit("roleReveal", { role: result.player.role });
    }

    socket.join(roomCode);
    socket.emit("youAre", { id: result.player.id, name: playerName });
    broadcast(result.room, "roomUpdate", publicRoom(result.room));
  });

  socket.on("startGame", ({ roomCode }) => {
    
    const room = getRoom(roomCode);
    if (!room) return;

    const host = room.players.find(p => p.id === room.hostId);
    if (!host || host.socketId !== socket.id) {
      return socket.emit("roomError", "NOT_HOST");
    }
    room.shuffleSeed = generateSeed();

    assignRoles(room);

    room.state = {
      phase: "night",
      round: 1,
      mafiaTarget: null,
      doctorTarget: null,
      mafiaSubmitted: false,
      doctorSubmitted: false,
      nightEndsAt: null,
      discussionEndsAt: null,
      votingEndsAt: null,
      votes: {},
      ready: new Set()
    };

    // private role reveal
    room.players.forEach(p => {
      if (p.socketId) {
        io.to(p.socketId).emit("roleReveal", { role: p.role });
      }
    });

    // public update (no roles during game) so clients have correct alive list/phase
    broadcast(room, "roomUpdate", publicRoom(room));
    broadcast(room, "shuffleSeed", { shuffleSeed: room.shuffleSeed });
    startNight(room, io);
  });

  socket.on("nightAction", ({ roomCode, role, targetId }) => {
    const room = getRoom(roomCode);
    if (!room || room.state.phase !== "night") return;

    const actor = room.players.find(p => p.socketId === socket.id);
    if (!actor || !actor.alive) return;

    const target = room.players.find(p => p.id === targetId);
    if (!target || !target.alive) return;

    // Don't trust client-sent role; use server-truth
    if (actor.role === "mafia") {
      room.state.mafiaTarget = targetId;
      room.state.mafiaSubmitted = true;
    }
    if (actor.role === "doctor") {
      room.state.doctorTarget = targetId;
      room.state.doctorSubmitted = true;
    }

    const hasDoctor = room.players.some(p => p.role === "doctor" && p.alive);
    const mafiaReady = room.state.mafiaSubmitted;
    const doctorReady = hasDoctor ? room.state.doctorSubmitted : true;

    if (mafiaReady && doctorReady) {
      room.state.nightEndsAt = Date.now();
      broadcast(room, "phaseChange", { 
        phase: "night", 
        round: room.state.round,
        nightEndsAt: room.state.nightEndsAt
      });
      endNight(room, io);
    }
  });

  socket.on("endNight", ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room) return;

    endNight(room, io);
  });

  socket.on("dayReady", ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room || room.state.phase !== "day") return;

    const actor = room.players.find(p => p.socketId === socket.id);
    if (!actor || !actor.alive) return;

    room.state.ready.add(actor.id);

    const alive = room.players.filter(p => p.alive).length;

    if (room.state.ready.size >= alive) {
      return startVoting(room, io);
    }

    if (room.state.ready.size >= Math.ceil(alive / 2) && !room.state.discussionTimeout) {
      broadcast(room, "discussionCountdown", { seconds: 60 });

      room.state.discussionEndsAt = Date.now() + 60000;
      broadcast(room, "phaseChange", { 
        phase: "day", 
        round: room.state.round,
        discussionEndsAt: room.state.discussionEndsAt
      });

      room.state.discussionTimeout = setTimeout(() => {
        startVoting(room, io);
      }, 60000);
    }
  });

  socket.on("submitVote", ({ roomCode, targetId }) => {
    const room = getRoom(roomCode);
    if (!room || room.state.phase !== "voting") return;

    const voter = room.players.find(p => p.socketId === socket.id);
    if (!voter || !voter.alive) return;

    const target = room.players.find(p => p.id === targetId);
    if (!target || !target.alive) return;

    room.state.votes[voter.id] = targetId;
    const alive = room.players.filter(p => p.alive).length;

    if (Object.keys(room.state.votes).length >= alive) {
      finishVoting(room, io);
    }
  });

  socket.on("resetGame", ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room) return;
     room.shuffleSeed = generateSeed();
  broadcast(room, "shuffleSeed", { shuffleSeed: room.shuffleSeed });

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
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Game backend running on port ${PORT}`);
  

});
