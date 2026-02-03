import { useGameState } from "./state";

export function attachStream(playerId, stream) {
  const g = useGameState.getState();
  const players = g.players.map(p =>
    p.id === playerId ? { ...p, stream } : p
  );
  useGameState.setState({ players });
}
