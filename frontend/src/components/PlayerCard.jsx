export default function PlayerCard({ player, onClick, selected, showRole = false }) {
  const isDead = !player.alive;

  return (
    <div
      className={`player-card ${isDead ? "dead" : ""} ${selected ? "selected" : ""}`}
      onClick={onClick}
    >
      <div className="player-card-content">
        <div className="player-name">{player.name}</div>
        
        {showRole && player.role && (
          <div className="player-role">{player.role}</div>
        )}
      </div>

      {isDead && <div className="dead-overlay">💀</div>}
    </div>
  );
}
