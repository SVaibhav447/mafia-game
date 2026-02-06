const endNight = (room) => {
  const mafiaKill = room.state.mafiaTarget;   // playerId
  const doctorSave = room.state.doctorTarget; // playerId

  let killed = null;
  let prevented = false;

  if (mafiaKill) {
    if (doctorSave && mafiaKill === doctorSave) {
      prevented = true;
    } else {
      const victim = room.players.find(p => p.id === mafiaKill);
      if (victim && victim.alive) {
        victim.alive = false;
        killed = victim.id;
      }
    }
  }

  // cleanup night actions
  room.state.mafiaTarget = null;
  room.state.doctorTarget = null;

  return { killed, prevented };
};

module.exports = { endNight };
