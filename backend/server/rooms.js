const rooms = {};
const crypto = require("crypto");

function createRoom(roomCode, hostSocketId, hostName, hostPlayerId) {
  if (rooms[roomCode]) return { error: "ROOM_EXISTS" };

  const playerId = hostPlayerId || crypto.randomUUID();

  rooms[roomCode] = {
    roomCode,
    hostId: playerId,
    status: "lobby",
    players: [],
    shuffleSeed: crypto.randomInt(1, 2147483647),
    state: { 
      phase: "lobby", 
      round: 0,
      mafiaTarget: null,
      doctorTarget: null,
      votes: {},
      ready: new Set()
    }
  };

  const host = {
    id: playerId,
    socketId: hostSocketId,
    name: hostName,
    alive: true,
    role: null,
    connected: true,
    healedSelf: false
  };

  rooms[roomCode].players.push(host);

  return { room: rooms[roomCode], player: host };
}

function getRoom(code) {
  return rooms[code] || null;
}

function deleteRoom(code) {
  delete rooms[code];
}

function allRooms() {
  return rooms;
}

module.exports = { createRoom, getRoom, deleteRoom, allRooms };
