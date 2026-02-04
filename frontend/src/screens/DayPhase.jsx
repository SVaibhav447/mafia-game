import { useState, useEffect } from "react";
import { useGameState } from "../core/state";
import { gameSocket } from "../core/socket";
import PlayerGrid from "../components/PlayerGrid";

export default function DayPhase() {
  const { players, me, roomCode, round } = useGameState();
  const [ready, setReady] = useState(false);
const shuffleSeed = useGameState(s => s.shuffleSeed);
  const myPlayer = players.find(p => p.id === me?.id);
  const amAlive = myPlayer?.alive;
  const aliveCount = players.filter(p => p.alive).length;

  // Reset ready status when entering day phase or if player dies
  useEffect(() => {
    setReady(false);
  }, [round]); // Reset when round changes (new day phase)

  useEffect(() => {
    if (!amAlive) {
      setReady(false);
    }
  }, [amAlive]);

  function handleReady() {
    if (!amAlive || ready) return;
    
    gameSocket.emit("dayReady", { 
      roomCode
    });
    setReady(true);
  }

  return (
    <div className="day-phase">
      <div className="day-header-center">
        <h2>Day {round}</h2>
        <p className="phase-description">Discuss who you think is mafia</p>
        <div className="player-count-display">{aliveCount} players alive</div>
      </div>


<PlayerGrid players={players} shuffleSeed={shuffleSeed} />


      <div className="day-controls">
        {amAlive ? (
          <button 
            onClick={handleReady}
            disabled={ready}
            className="ready-button"
          >
            {ready ? "Waiting for others..." : "Ready to Vote"}
          </button>
        ) : (
          <div className="spectator-message">
            You are dead. Spectating discussion...
          </div>
        )}
      </div>
    </div>
  );
}