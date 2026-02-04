import { useEffect, useState } from "react";
import { useGameState } from "../core/state";

export default function DayRevealScreen() {
  const { dayResult, setDayResult, phase, players } = useGameState();
  const [showAlignment, setShowAlignment] = useState(false);
  const [displayData, setDisplayData] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Reset everything when not in dayReveal phase
    if (phase !== "dayReveal") {
      setDisplayData(null);
      setShowAlignment(false);
      setIsReady(false);
      return;
    }

    // Wait for complete data before showing anything
    if (!dayResult) {
      setIsReady(false);
      return;
    }

    // For killed players, wait until we have alignment data
    if (dayResult.killed && dayResult.alignment === null) {
      console.log("Waiting for alignment data...");
      setIsReady(false);
      return;
    }

    // Now we have complete data - capture it and mark as ready
    console.log("Day reveal data complete:", dayResult);
    setDisplayData({
      killed: dayResult.killed,
      prevented: dayResult.prevented,
      name: dayResult.name,
      alignment: dayResult.alignment
    });
    
    setShowAlignment(false);
    setIsReady(true);

    // Longer delay for alignment reveal - 4 seconds
    let alignmentTimer;
    if (dayResult.killed) {
      alignmentTimer = setTimeout(() => setShowAlignment(true), 4000);
    }

    // Total display time - 12 seconds for killed, 6 for no kill
    const clearTimer = setTimeout(() => {
      setDayResult(null);
      setDisplayData(null);
      setShowAlignment(false);
      setIsReady(false);
    }, dayResult.killed ? 12000 : 6000);

    return () => {
      clearTimeout(clearTimer);
      if (alignmentTimer) clearTimeout(alignmentTimer);
    };
  }, [dayResult, phase, setDayResult]);

  // Don't render anything until we're in the right phase with complete data
  if (phase !== "dayReveal" || !isReady || !displayData) {
    return null;
  }

  // Show updated player count
  const aliveCount = players.filter(p => p.alive).length;

  return (
    <div className="reveal-screen">
      <div className="reveal-content">
        {displayData.killed && (
          <>
            <div className="reveal-name fade-in">
              {displayData.name} was killed last night
            </div>
            
            {showAlignment && (
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
        )}

        {displayData.prevented && !displayData.killed && (
          <>
            <div className="reveal-name fade-in">
              The doctor saved someone last night! 💊
            </div>
            <div className="players-remaining fade-in-delayed">
              {aliveCount} players remaining
            </div>
          </>
        )}

        {!displayData.killed && !displayData.prevented && (
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