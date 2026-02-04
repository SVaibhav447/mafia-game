import { useState, useEffect } from "react";
import { useGameState } from "../core/state";
import { gameSocket } from "../core/socket";
import PlayerGrid from "../components/PlayerGrid";

export default function VotingPhase() {
  const { players, me, roomCode } = useGameState();
  const [selected, setSelected] = useState(null);
  const [voted, setVoted] = useState(false);
  const [votingTimer, setVotingTimer] = useState(30);

  const myPlayer = players.find(p => p.id === me?.id);
  const amAlive = myPlayer?.alive;
  const aliveCount = players.filter(p => p.alive).length;

  useEffect(() => {
    const interval = setInterval(() => {
      setVotingTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Reset vote if player dies during voting
  useEffect(() => {
    if (!amAlive) {
      setSelected(null);
      setVoted(false);
    }
  }, [amAlive]);

  function handlePlayerClick(player) {
    if (voted || !amAlive || !player.alive) return;
    setSelected(player.id);
  }

  function handleVote() {
    if (!selected || voted || !amAlive) return;

    // DOUBLE CHECK: Selected player must be alive
    const targetPlayer = players.find(p => p.id === selected);
    if (!targetPlayer || !targetPlayer.alive) {
      setSelected(null);
      return;
    }

    gameSocket.emit("submitVote", {
      roomCode,
      targetId: selected
    });
    setVoted(true);
  }

  const selectedPlayer = players.find(p => p.id === selected);

  return (
    <div className="voting-phase">
      <div className="voting-header-center">
        <h2>Voting Phase</h2>
        {amAlive ? (
          <p className="phase-description">Click on who you suspect is mafia</p>
        ) : (
          <p className="phase-description">You are dead. Wait for voting to complete.</p>
        )}
        <div className="player-count-display">{aliveCount} players alive</div>
        <div className="timer-display-center">{votingTimer}s remaining</div>
      </div>

      <PlayerGrid 
        players={players}
        onPlayerClick={amAlive ? handlePlayerClick : undefined}
        selectedId={selected}
        shuffleSeed={useGameState(s => s.shuffleSeed)}
      />

      {amAlive && (
        <div className="voting-controls">
          {selected && (
            <div className="vote-target">
              Voting for: <strong>{selectedPlayer?.name}</strong>
            </div>
          )}
          
          <button 
            onClick={handleVote}
            disabled={!selected || voted}
            className="submit-vote-button"
          >
            {voted ? "Vote Submitted ✓" : "Cast Vote"}
          </button>
        </div>
      )}
    </div>
  );
}