import { useGameState } from "./state";
import { joinRoom, leaveRoom, startMic } from "./voice";

let currentVoiceRoom = null;

export function updateVoiceForPhase() {
  const { phase, players, me } = useGameState.getState();
  if (!me || !me.role) return;

  const alive = players.find(p => p.id === me.id)?.alive;

  const role = me.role;

  // Determine target room
  let targetRoom = null;

  if (!alive) {
    targetRoom = "spectator";
  } else {
    switch (phase) {
      case "night":
        targetRoom = role === "mafia" ? "mafia" : "spectator";
        break;

      case "day":
      case "voting":
        targetRoom = "town";
        break;

      case "endgame":
        targetRoom = "postgame";
        break;

      default:
        targetRoom = null;
    }
  }

  // Switch rooms if needed
  if (targetRoom !== currentVoiceRoom) {
    if (currentVoiceRoom) {
      leaveRoom();
    }
    
    if (targetRoom) {
      joinRoom(targetRoom);
      
      // Enable mic for speaking phases
      if (targetRoom === "mafia" || targetRoom === "town" || targetRoom === "postgame") {
        startMic();
      }
    }
    
    currentVoiceRoom = targetRoom;
  }
}

// Call this whenever phase or alive status changes
useGameState.subscribe((state, prevState) => {
  if (state.phase !== prevState.phase || 
      state.players !== prevState.players) {
    updateVoiceForPhase();
  }
});