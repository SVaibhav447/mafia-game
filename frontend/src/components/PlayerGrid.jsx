import PlayerCard from "./PlayerCard";

export default function PlayerGrid({ players, onPlayerClick, selectedId, showRoles = false }) {
  if (!players || players.length === 0) {
    return <div className="player-grid-empty">No players</div>;
  }

  return (
    <div className="player-grid">
      {players.map((p) => (
        <PlayerCard
          key={p.id}
          player={p}
          onClick={() => onPlayerClick && onPlayerClick(p)}
          selected={selectedId === p.id}
          showRole={showRoles}
        />
      ))}
    </div>
  );
}