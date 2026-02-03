import { useEffect, useState } from "react";
import { useGameState } from "../core/state";

export default function DayRevealScreen() {
  const { dayResult, setDayResult, phase, players } = useGameState();
  const [showAlignment, setShowAlignment] = useState(false);

  useEffect(() => {
    if (!dayResult) return;
    if (phase !== "dayReveal") return;

    setShowAlignment(false);

    // Longer delay for alignment reveal - 4 seconds
    if (dayResult.killed) {
      setTimeout(() => setShowAlignment(true), 4000);
    }

    // Total display time - 12 seconds for killed, 6 for no kill
    const clearTimer = setTimeout(() => {
      setDayResult(null);
    }, dayResult.killed ? 12000 : 6000);

    return () => clearTimeout(clearTimer);
  }, [dayResult, phase]);

  if (!dayResult || phase !== "dayReveal") return null;

  // Show updated player count
  const aliveCount = players.filter(p => p.alive).length;

  return (
    <div className="reveal-screen">
      <div className="reveal-content">
        {dayResult.killed && (
          <>
            <div className="reveal-name fade-in">
              {dayResult.name} was killed last night
            </div>
            
            {showAlignment && (
              <>
                <div className="reveal-alignment fade-in-delayed">
                  {dayResult.alignment === "bad" ? (
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
        )}

        {dayResult.prevented && !dayResult.killed && (
          <>
            <div className="reveal-name fade-in">
              The doctor saved someone last night! 💊
            </div>
            <div className="players-remaining fade-in-delayed">
              {aliveCount} players remaining
            </div>
          </>
        )}

        {!dayResult.killed && !dayResult.prevented && (
          <>
            <div className="reveal-name fade-in">
              Nobody died last night
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
