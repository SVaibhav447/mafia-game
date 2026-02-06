import { useState, useEffect } from "react";
import { useGameState } from "../core/state";
import { gameSocket } from "../core/socket";
import PlayerGrid from "../components/PlayerGrid";

export default function NightPhase() {
  const { me, players, roomCode, round, nightEndsAt } = useGameState();
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [nightTimer, setNightTimer] = useState(30);

  const myPlayer = players.find(p => p.id === me?.id);
  const amAlive = myPlayer?.alive;
  const myRole = me?.role;
  const canAct = myRole === "mafia" || myRole === "doctor";

  useEffect(() => {
    function updateTimer() {
      if (!nightEndsAt) {
        setNightTimer(30);
        return;
      }
      const remainingMs = nightEndsAt - Date.now();
      const remaining = Math.max(0, Math.ceil(remainingMs / 1000));
      setNightTimer(remaining);
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [nightEndsAt]);

  function handlePlayerClick(player) {
    if (submitted || !amAlive) return;
    if (myRole === "mafia" && player.id === me.id) return;
    
    // CRITICAL: Cannot select dead players
    if (!player.alive) return;
    
    setSelected(player.id);
  }

  function handleSubmit() {
    if (!selected || submitted || !amAlive) return;
    
    // DOUBLE CHECK: Selected player must be alive
    const targetPlayer = players.find(p => p.id === selected);
    if (!targetPlayer || !targetPlayer.alive) {
      setSelected(null);
      return;
    }
    
    gameSocket.emit("nightAction", {
      roomCode,
      role: myRole,
      targetId: selected
    });
    setSubmitted(true);
  }

  // Dead players or civilians just watch
  if (!amAlive || !canAct) {
    return (
      <div className="night-phase">
        <div className="night-overlay-center">
          <h2>Night {round}</h2>
          <p className="night-message">The town sleeps...</p>
          <div className="timer-display-center">{nightTimer}s</div>
        </div>
        <PlayerGrid players={players} shuffleSeed={useGameState(s => s.shuffleSeed)} />
      </div>
    );
  }

  const actionText = myRole === "mafia" ? "Choose someone to kill" : "Choose someone to heal";
  const selectedPlayer = players.find(p => p.id === selected);

  return (
    <div className="night-phase">
      <div className="night-header-center">
        <h2>Night {round}</h2>
        <h3>{actionText}</h3>
        <div className="timer-display-center">{nightTimer}s</div>
      </div>

      <PlayerGrid 
        players={players} 
        onPlayerClick={handlePlayerClick}
        selectedId={selected}
      />

      <div className="night-action-panel">
        {selected && (
          <div className="selected-target">
            Selected: <strong>{selectedPlayer?.name}</strong>
          </div>
        )}

        <button 
          onClick={handleSubmit}
          disabled={!selected || submitted}
          className="submit-action-button"
        >
          {submitted ? "ACTION CONFIRMED" : myRole === "mafia" ? "KILL" : "HEAL"}
        </button>
      </div>
    </div>
  );
}
