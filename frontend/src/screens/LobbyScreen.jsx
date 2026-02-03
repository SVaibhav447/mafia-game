import { useGameState } from "../core/state";
import { gameSocket } from "../core/socket";
import PlayerGrid from "../components/PlayerGrid";

export default function LobbyScreen() {
  const { players, me, hostId, roomCode } = useGameState();

  function start() {
    gameSocket.emit("startGame", { roomCode });
  }

  const isHost = me?.id === hostId;
  const canStart = players.length >= 4;
  const needMore = 4 - players.length;

  // Role distribution
  const n = players.length;
  const mafia = 1;
  const doctor = n > 6 ? 1 : 0;
  const civilians = n - mafia - doctor;

  return (
    <div className="lobby-screen-modern">
      {/* Hero Section */}
      <div className="lobby-hero">
        <div className="lobby-title-section">
          <h1 className="lobby-game-title">🕵️ MAFIA</h1>
          <div className="lobby-room-badge">
            <span className="room-label">Room Code</span>
            <span className="room-code">{roomCode}</span>
          </div>
        </div>

        <div className="lobby-player-count">
          <div className="count-circle">
            <span className="count-number">{players.length}</span>
            <span className="count-label">Players</span>
          </div>
          {!canStart && (
            <div className="waiting-indicator">
              Need {needMore} more player{needMore !== 1 ? 's' : ''} to start
            </div>
          )}
        </div>
      </div>

      {/* Roles Preview Card */}
      <div className="lobby-roles-card">
        <h3 className="roles-card-title">
          <span className="roles-icon">🎭</span>
          Game Roles
        </h3>
        <div className="roles-grid">
          <div className="role-item role-mafia">
            <span className="role-emoji">🔪</span>
            <span className="role-name">Mafia</span>
            <span className="role-count">{mafia}</span>
          </div>
          {doctor > 0 && (
            <div className="role-item role-doctor">
              <span className="role-emoji">💊</span>
              <span className="role-name">Doctor</span>
              <span className="role-count">{doctor}</span>
            </div>
          )}
          <div className="role-item role-civilian">
            <span className="role-emoji">👥</span>
            <span className="role-name">Civilians</span>
            <span className="role-count">{civilians}</span>
          </div>
        </div>
      </div>

      {/* Players Section */}
      <div className="lobby-players-section">
        <h3 className="section-title">Players in Lobby</h3>
        <div className="lobby-player-grid">
          {players.map((p, index) => (
            <div key={p.id} className="lobby-player-card">
              <div className="player-avatar">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="player-info">
                <div className="player-name">{p.name}</div>
                {p.id === hostId && (
                  <div className="player-badge host-badge">👑 Host</div>
                )}
                {p.id === me?.id && (
                  <div className="player-badge you-badge">You</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Section */}
      <div className="lobby-action-section">
        {isHost ? (
          <button 
            onClick={start}
            disabled={!canStart}
            className="lobby-start-button"
          >
            {canStart ? (
              <>
                <span className="button-icon">🎮</span>
                Start Game
              </>
            ) : (
              <>
                <span className="button-icon">⏳</span>
                Waiting for Players
              </>
            )}
          </button>
        ) : (
          <div className="waiting-host-message">
            <span className="waiting-icon">⏱️</span>
            Waiting for host to start the game...
          </div>
        )}
      </div>
    </div>
  );
}