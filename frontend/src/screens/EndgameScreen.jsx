import { gameSocket } from "../core/socket";
import { useGameState } from "../core/state";
import PlayerGrid from "../components/PlayerGrid";

export default function EndgameScreen() {
  const { winner, me, players, roomCode, hostId } = useGameState();
    const shuffleSeed = useGameState(s => s.shuffleSeed);  // ✅ HERE

  function restart() {
    gameSocket.emit("resetGame", { roomCode });
  }

  const isHost = me?.id === hostId;

  return (
    <div className="endgame-screen">
      <div className="winner-announcement">
        <h1 className="winner-title">
          {winner === "mafia" ? "🔪 Mafia Victory" : "👥 Town Victory"}
        </h1>
      </div>

      <PlayerGrid players={players} showRoles={true} shuffleSeed={shuffleSeed} />

      <div className="endgame-controls">
        {isHost ? (
          <button onClick={restart} className="play-again-button">
            Play Again
          </button>
        ) : (
          <div className="waiting-message">
            Waiting for host...
          </div>
        )}
      </div>
    </div>
  );
}