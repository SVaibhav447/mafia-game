
const { getRoom, deleteRoom, allRooms } = require("./rooms");

function addPlayer(roomCode, playerId, playerName) {
  const room = getRoom(roomCode);
  if (!room) return { error: "ROOM_NOT_FOUND" };

  const exists = room.players.some(p => p.id === playerId);
  if (!exists) {
    room.players.push({
      id: playerId,
      name: playerName,
      alive: true,
      role: null,
      healedSelf: false,
      
    });
   
  }
  return { room };
}

function removePlayer(playerId) {
  const allRoomsObj = allRooms();
  
  for (const code in allRoomsObj) {
    const room = allRoomsObj[code];
    const idx = room.players.findIndex(p => p.id === playerId);
    
    if (idx !== -1) {
      room.players.splice(idx, 1);
      
      if (room.players.length === 0) {
        deleteRoom(code);
        return { removed: true, roomCode: null };
      }
      
      return { removed: true, roomCode: code };
    }
  }
  
  return { removed: false };
}

module.exports = { addPlayer, removePlayer };