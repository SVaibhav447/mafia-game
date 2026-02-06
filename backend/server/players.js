
const crypto = require("crypto");
const { getRoom, allRooms } = require("./rooms");

function addPlayer(roomCode, socketId, playerName, playerId) {
  const room = getRoom(roomCode);
  if (!room) return { error: "ROOM_NOT_FOUND" };

  if (playerId) {
    const existing = room.players.find(p => p.id === playerId);
    if (existing) {
      if (existing.connected && existing.socketId && existing.socketId !== socketId) {
        return { error: "PLAYER_ALREADY_CONNECTED" };
      }
      existing.socketId = socketId;
      existing.name = playerName;
      existing.connected = true;
      return { room, player: existing, reconnected: true };
    }
  }

  if (room.state?.phase !== "lobby") {
    return { error: "GAME_IN_PROGRESS" };
  }

  const newPlayer = {
    id: playerId || crypto.randomUUID(),
    socketId,
    name: playerName,
    alive: true,
    role: null,
    connected: true,
    healedSelf: false
  };

  room.players.push(newPlayer);
  return { room, player: newPlayer };
}

function removePlayer(playerId) {
  const allRoomsObj = allRooms();
  
  for (const code in allRoomsObj) {
    const room = allRoomsObj[code];
    const idx = room.players.findIndex(p => p.socketId === playerId);
    
    if (idx !== -1) {
      room.players[idx].connected = false;
      room.players[idx].socketId = null;

      return { removed: true, roomCode: code };
    }
  }
  
  return { removed: false };
}

module.exports = { addPlayer, removePlayer };
