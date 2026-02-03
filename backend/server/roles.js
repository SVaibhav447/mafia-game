function assignRoles(room) {
  const players = [...room.players];
  players.sort(() => Math.random() - 0.5);

  // Mafia
  players[0].role = "mafia";

  // Doctor if >6
  if (players.length > 6) {
    players[1].role = "doctor";
  }

  // Civilians
  for (const p of players) {
    if (!p.role) p.role = "civilian";
  }

  room.players = players;
}

module.exports = { assignRoles };
