import { useEffect, useState } from "react";
import { useGameState } from "../core/state";

export default function LynchReveal() {
  const { lynch, setLynch, phase, players } = useGameState();
  const [showAlign, setShowAlign] = useState(false);

  useEffect(() => {
    if (!lynch) return;
    if (phase !== "lynchReveal") return;

    setShowAlign(false);

    if (lynch.killed) {
      // Show alignment after 4 seconds
      setTimeout(() => setShowAlign(true), 4000);
    }

    // Total display - 12 seconds for killed, 6 for no lynch
    const clearTimer = setTimeout(() => {
      setLynch(null);
    }, lynch.killed ? 12000 : 6000);

    return () => clearTimeout(clearTimer);
  }, [lynch, phase]);

  if (!lynch || phase !== "lynchReveal") return null;

  const aliveCount = players.filter(p => p.alive).length;

  return (
    <div className="reveal-screen">
      <div className="reveal-content">
        {lynch.killed ? (
          <>
            <div className="reveal-name fade-in">
              {lynch.name} was lynched
            </div>
            
            {showAlign && (
              <>
                <div className="reveal-alignment fade-in-delayed">
                  {lynch.alignment === "bad" ? (
                    <span className="mafia-reveal">They were MAFIA 🔪</span>
                  ) : (
                    <span className="innocent-reveal">They were INNOCENT 👤</span>
                  )}
                </div>
                
                <div className="players-remaining fade-in-late">
                  {aliveCount} players remaining
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="reveal-name fade-in">
              No consensus. Nobody was lynched.
            </div>
            <div className="players-remaining fade-in-delayed">
              {aliveCount} players remaining
            </div>
          </>
        )}
      </div>
    </div>
  );
}