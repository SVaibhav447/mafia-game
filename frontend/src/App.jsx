import { useEffect } from "react";
import { useGameState } from "./core/state";
import LobbySetup from "./screens/LobbySetup";
import LobbyScreen from "./screens/LobbyScreen";
import NightPhase from "./screens/NightPhase";
import DayRevealScreen from "./screens/DayRevealScreen";
import DayPhase from "./screens/DayPhase";
import VotingPhase from "./screens/VotingPhase";
import LynchReveal from "./screens/LynchReveal";
import EndgameScreen from "./screens/EndgameScreen";
import RoleRevealModal from "./screens/RoleRevealModal";

export default function App() {
  const { phase, showRoleScreen, me } = useGameState();

  // Debug logging
  useEffect(() => {
    console.log("=== APP STATE ===");
    console.log("Phase:", phase);
    console.log("Me:", me);
    console.log("Show Role Screen:", showRoleScreen);
  }, [phase, me, showRoleScreen]);

  if (!me) {
    return (
      <div className="app">
        <LobbySetup />
      </div>
    );
  }

  return (
    <div className="app">
      {phase === "lobby" && <LobbyScreen />}
      {phase === "night" && <NightPhase />}
      {phase === "dayReveal" && <DayRevealScreen />}
      {phase === "day" && <DayPhase />}
      {phase === "voting" && <VotingPhase />}
      {phase === "lynchReveal" && <LynchReveal />}
      {phase === "endgame" && <EndgameScreen />}
      
      {showRoleScreen && <RoleRevealModal />}
    </div>
  );
}

