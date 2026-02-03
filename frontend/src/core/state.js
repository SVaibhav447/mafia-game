import { create } from "zustand";
import { gameSocket } from "./socket";

export const useGameState = create((set, get) => ({
  phase: "setup", // setup, lobby, night, dayReveal, day, voting, lynchReveal, endgame
  players: [],
  me: null,
  hostId: null,
  roomCode: null,
  round: 0,
  discussionTimer: null,
  showRoleScreen: false,
  dayResult: null,
  lynch: null,
  winner: null,

  setMe: me => set({ me }),
  setPlayers: players => set({ players }),
  setPhase: phase => set({ phase }),
  setDayResult: dayResult => set({ dayResult }),
  setLynch: lynch => set({ lynch }),
}));

// SOCKET HANDLERS

gameSocket.on("youAre", ({ id, name }) => {
  const g = useGameState.getState();
  useGameState.setState({ 
    me: { ...g.me, id, name }
  });
});

gameSocket.on("roomUpdate", (room) => {
  const g = useGameState.getState();
  const my = g.me?.id ? room.players?.find(p => p.id === g.me.id) : null;

  useGameState.setState({
    players: room.players,
    hostId: room.hostId,
    roomCode: room.roomCode,
    phase: room.state?.phase ?? g.phase,
    round: room.state?.round ?? g.round,
    discussionTimer: null,
    me: g.me ? { ...g.me, alive: my?.alive } : g.me
  });
});

gameSocket.on("roleReveal", ({ role }) => {
  const g = useGameState.getState();
  const me = { ...g.me, role };
  useGameState.setState({ me, showRoleScreen: true });
  
  // Auto-hide role reveal after 3 seconds
  setTimeout(() => {
    useGameState.setState({ showRoleScreen: false });
  }, 3000);
});

gameSocket.on("phaseChange", ({ phase, round, day }) => {
  console.log("Phase change:", phase, round, day);
  const g = useGameState.getState();
  useGameState.setState({ phase, round: (round ?? day ?? g.round), discussionTimer: null });
});

gameSocket.on("nightResult", ({ killed, prevented }) => {
  // This is sent at start of dayReveal
  console.log("Night result:", { killed, prevented });
});

gameSocket.on("identityReveal", ({ id, name }) => {
  console.log("Identity reveal:", name);
  const g = useGameState.getState();
  useGameState.setState({
    dayResult: { ...(g.dayResult || {}), killed: id, name }
  });
});

gameSocket.on("alignmentReveal", ({ id, role, alignment }) => {
  const g = useGameState.getState();
  const victim = g.players.find(p => p.id === id);
  
  useGameState.setState({
    dayResult: {
      ...(g.dayResult || {}),
      killed: id,
      name: g.dayResult?.name || victim?.name || null,
      role,
      alignment
    }
  });
});

gameSocket.on("killBlocked", () => {
  useGameState.setState({
    dayResult: {
      killed: null,
      prevented: true
    }
  });
});

gameSocket.on("noKill", () => {
  useGameState.setState({
    dayResult: {
      killed: null,
      prevented: false
    }
  });
});

gameSocket.on("discussionStart", () => {
  console.log("Discussion started");
});

gameSocket.on("discussionCountdown", ({ seconds }) => {
  console.log("Discussion countdown:", seconds);
  useGameState.setState({ discussionTimer: seconds });
});

gameSocket.on("votingStart", () => {
  console.log("Voting started");
});

gameSocket.on("lynchReveal", ({ id, name }) => {
  console.log("Lynch reveal:", name);
});

gameSocket.on("lynchAlignment", ({ id, role, alignment }) => {
  const g = useGameState.getState();
  const victim = g.players.find(p => p.id === id);
  
  useGameState.setState({
    lynch: {
      killed: id,
      name: victim?.name,
      role,
      alignment
    }
  });
});

gameSocket.on("noLynch", () => {
  useGameState.setState({
    lynch: {
      killed: null
    }
  });
});

gameSocket.on("gameOver", ({ winner, reason }) => {
  useGameState.setState({ 
    winner,
    phase: "endgame"
  });
});

gameSocket.on("lobbyReset", () => {
  useGameState.setState({
    phase: "lobby",
    showRoleScreen: false,
    dayResult: null,
    lynch: null,
    winner: null
  });
  
  // Update local me object
  const g = useGameState.getState();
  if (g.me) {
    useGameState.setState({
      me: { ...g.me, role: null }
    });
  }
});

gameSocket.on("roomError", (error) => {
  console.error("Room error:", error);
  alert(`Error: ${error}`);
});

