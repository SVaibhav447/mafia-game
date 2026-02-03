function checkWin(room) {
  const alive = room.players.filter(p => p.alive);
  
  const mafiaAlive = alive.filter(p => p.role === "mafia").length;
  const civiliansAlive = alive.filter(p => p.role !== "mafia").length;

  if (mafiaAlive === 0) {
    return { winner: "civilians", reason: "All mafia eliminated" };
  }

  if (mafiaAlive >= civiliansAlive) {
    return { winner: "mafia", reason: "Mafia equals or outnumbers civilians" };
  }

  return null;
}

module.exports = { checkWin };