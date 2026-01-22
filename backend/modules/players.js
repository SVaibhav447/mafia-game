// modules/players.js

const { getRoom, deleteRoom } = require("./rooms")

function addPlayer(roomId, playerId, playerName) {
  const room = getRoom(roomId)
  if (!room) return { error: "ROOM_NOT_FOUND" }

  const exists = room.players.some(p => p.id === playerId)
  if (exists) return { room }

  room.players.push({
    id: playerId,
    name: playerName,
    alive: true,
    role: null
  })

  return { room }
}

function removePlayer(playerId) {
  for (const roomId in require("./rooms").rooms) {
    const room = require("./rooms").rooms[roomId]
    const idx = room.players.findIndex(p => p.id === playerId)

    if (idx !== -1) {
      room.players.splice(idx, 1)
      if (room.players.length === 0) deleteRoom(roomId)
      return
    }
  }
}

module.exports = {
  addPlayer,
  removePlayer
}
