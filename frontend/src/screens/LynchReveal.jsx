import { useEffect, useState } from "react";
import { useGameState } from "../core/state";

export default function LynchReveal() {
  const { lynch, setLynch, phase, players } = useGameState();
  const [showAlign, setShowAlign] = useState(false);
  const [displayData, setDisplayData] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Reset everything when not in lynchReveal phase
    if (phase !== "lynchReveal") {
      setDisplayData(null);
      setShowAlign(false);
      setIsReady(false);
      return;
    }

    // Wait for complete data before showing anything
    if (!lynch) {
      setIsReady(false);
      return;
    }

    // For killed players, wait until we have alignment data
    if (lynch.killed && lynch.alignment === null) {
      console.log("Waiting for lynch alignment data...");
      setIsReady(false);
      return;
    }

    // Now we have complete data - capture it and mark as ready
    console.log("Lynch reveal data complete:", lynch);
    setDisplayData({
      killed: lynch.killed,
      name: lynch.name,
      alignment: lynch.alignment
    });

    setShowAlign(false);
    setIsReady(true);

    let alignmentTimer;
    if (lynch.killed) {
      // Show alignment after 4 seconds
      alignmentTimer = setTimeout(() => setShowAlign(true), 4000);
    }

    // Total display - 12 seconds for killed, 6 for no lynch
    const clearTimer = setTimeout(() => {
      setLynch(null);
      setDisplayData(null);
      setShowAlign(false);
      setIsReady(false);
    }, lynch.killed ? 12000 : 6000);

    return () => {
      clearTimeout(clearTimer);
      if (alignmentTimer) clearTimeout(alignmentTimer);
    };
  }, [lynch, phase, setLynch]);

  // Don't render anything until we're in the right phase with complete data
  if (phase !== "lynchReveal" || !isReady || !displayData) {
    return null;
  }

  const aliveCount = players.filter(p => p.alive).length;

  return (
    <div className="reveal-screen">
      <div className="reveal-content">
        {displayData.killed ? (
          <>
            <div className="reveal-name fade-in">
              {displayData.name} was lynched
            </div>
            
            {showAlign && (
              <>
                <div className="reveal-alignment fade-in-delayed">
                  {displayData.alignment === "bad" ? (
                    <span className="mafia-reveal">They were MAFIA 🔪</span>
                  ) : (
                    <span className="innocent-reveal">They were INNOCENT 💤</span>
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