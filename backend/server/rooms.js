const rooms = {};

function createRoom(roomCode, hostId, hostName) {
  if (rooms[roomCode]) return { error: "ROOM_EXISTS" };

  rooms[roomCode] = {
    roomCode,
    hostId,
    status: "lobby",
    players: [],
    state: { 
      phase: "lobby", 
      round: 0,
      mafiaTarget: null,
      doctorTarget: null,
      votes: {},
      ready: new Set()
    }
  };

  rooms[roomCode].players.push({
    id: hostId,
    name: hostName,
    alive: true,
    role: null,
    healedSelf: false
  });

  return { room: rooms[roomCode] };
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
