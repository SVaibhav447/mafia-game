import { useMemo } from "react";
import PlayerCard from "./PlayerCard";

// Seeded random shuffle function
function seededShuffle(array, seed) {
  const shuffled = [...array];
  let currentIndex = shuffled.length;

  const random = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  while (currentIndex !== 0) {
    const randomIndex = Math.floor(random() * currentIndex);
    currentIndex--;

    [shuffled[currentIndex], shuffled[randomIndex]] =
      [shuffled[randomIndex], shuffled[currentIndex]];
  }

  return shuffled;
}

export default function PlayerGrid({
  players,
  shuffleSeed,
  onPlayerClick,
  selectedId,
  showRoles = false
}) {
  const shuffledPlayers = useMemo(() => {
    if (!players || players.length === 0) return [];

    // sort base list first so all clients shuffle same way
    const sortedPlayers = [...players].sort((a, b) =>
      a.id.localeCompare(b.id)
    );

    if (!shuffleSeed) return sortedPlayers;

    return seededShuffle(sortedPlayers, shuffleSeed);
  }, [players, shuffleSeed]);

  if (!players || players.length === 0) {
    return <div className="player-grid-empty">No players</div>;
  }

  return (
    <div className="player-grid">
      {shuffledPlayers.map((p) => (
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
