import { create } from "zustand";
import { gameSocket } from "./socket";




export const useGameState = create((set, get) => ({
  phase: "setup", // setup, lobby, night, dayReveal, day, voting, lynchReveal, endgame
  players: [],
  me: null,
  hostId: null,
  roomCode: null,
  round: 0,
  shuffleSeed: null,
  nightEndsAt: null,
  discussionEndsAt: null,
  votingEndsAt: null,
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
  setShuffleSeed: shuffleSeed => set({ shuffleSeed }),
}));

// SOCKET HANDLERS

gameSocket.on("youAre", ({ id, name }) => {
  const g = useGameState.getState();
  useGameState.setState({ 
    me: { ...(g.me || {}), id, name }
  });
});

gameSocket.on("shuffleSeed", ({ shuffleSeed }) => {
  console.log("Received shuffleSeed:", shuffleSeed);
  useGameState.setState({ shuffleSeed });
});


gameSocket.on("roomUpdate", (room) => {
  const g = useGameState.getState();
  const my = g.me?.id ? room.players?.find(p => p.id === g.me.id) : null;
  const nextMe = g.me ? { ...g.me, alive: my?.alive } : g.me;

  useGameState.setState({
    players: room.players,
    hostId: room.hostId,
    roomCode: room.roomCode,
    phase: room.state?.phase ?? g.phase,
    round: room.state?.round ?? g.round,
    nightEndsAt: room.state?.nightEndsAt ?? g.nightEndsAt,
    discussionEndsAt: room.state?.discussionEndsAt ?? g.discussionEndsAt,
    votingEndsAt: room.state?.votingEndsAt ?? g.votingEndsAt,
    discussionTimer: null,
    me: nextMe
  });

  if (nextMe?.id && room.roomCode) {
    sessionStorage.setItem(`mafiaPlayerId:${room.roomCode}`, nextMe.id);
  }
});

gameSocket.on("roleReveal", ({ role }) => {
  const g = useGameState.getState();
  const me = { ...g.me, role };
  useGameState.setState({ me, showRoleScreen: true });
  
  // Auto-hide role reveal after 4 seconds
  setTimeout(() => {
    useGameState.setState({ showRoleScreen: false });
  }, 4000);
});

gameSocket.on("phaseChange", ({ phase, round, day, nightEndsAt, discussionEndsAt, votingEndsAt }) => {
  console.log("Phase change:", phase, round, day);
  const g = useGameState.getState();
  
  // Clear reveal data when leaving reveal phases
  const updates = { 
    phase, 
    round: (round ?? day ?? g.round), 
    discussionTimer: null,
    nightEndsAt: nightEndsAt ?? (phase === "night" ? g.nightEndsAt : null),
    discussionEndsAt: discussionEndsAt ?? (phase === "day" ? g.discussionEndsAt : null),
    votingEndsAt: votingEndsAt ?? (phase === "voting" ? g.votingEndsAt : null)
  };
  
  // Clear day result when leaving dayReveal phase
  if (g.phase === "dayReveal" && phase !== "dayReveal") {
    updates.dayResult = null;
  }
  
  // Clear lynch when leaving lynchReveal phase
  if (g.phase === "lynchReveal" && phase !== "lynchReveal") {
    updates.lynch = null;
  }
  
  useGameState.setState(updates);
});

gameSocket.on("nightResult", ({ killed, prevented }) => {
  // This is sent at start of dayReveal
  console.log("Night result:", { killed, prevented });
  
  // If nobody died and doctor didn't save anyone, set it immediately
  if (!killed && !prevented) {
    useGameState.setState({
      dayResult: {
        killed: null,
        prevented: false
      }
    });
  }
});

gameSocket.on("identityReveal", ({ id, name }) => {
  console.log("Identity reveal:", name);
  
  // Initialize dayResult with just the identity
  // Don't show on screen yet - wait for alignment
  useGameState.setState({
    dayResult: { 
      killed: id, 
      name,
      alignment: null // Waiting for alignment
    }
  });
});

gameSocket.on("alignmentReveal", ({ id, role, alignment }) => {
  const g = useGameState.getState();
  
  // Now we have complete data - update with alignment
  useGameState.setState({
    dayResult: {
      killed: id,
      name: g.dayResult?.name || g.players.find(p => p.id === id)?.name || null,
      role,
      alignment
    }
  });
});

gameSocket.on("killBlocked", () => {
  console.log("Kill was blocked by doctor");
  useGameState.setState({
    dayResult: {
      killed: null,
      prevented: true
    }
  });
});

gameSocket.on("noKill", () => {
  console.log("No kill occurred");
  useGameState.setState({
    dayResult: {
      killed: null,
      prevented: false
    }
  });
});

gameSocket.on("discussionStart", () => {
  console.log("Discussion started");
  // Reset timer
  useGameState.setState({ discussionTimer: null });
});

gameSocket.on("discussionCountdown", ({ seconds }) => {
  console.log("Discussion countdown:", seconds);
  useGameState.setState({ discussionTimer: seconds });
});

gameSocket.on("votingStart", () => {
  console.log("Voting started");
  // Reset any lingering discussion timer
  useGameState.setState({ discussionTimer: null });
});

gameSocket.on("lynchReveal", ({ id, name }) => {
  console.log("Lynch reveal:", name);
  
  // Initialize lynch with just the identity
  // Don't show complete data yet - wait for alignment
  if (id) {
    useGameState.setState({
      lynch: { 
        killed: id, 
        name,
        alignment: null // Waiting for alignment
      }
    });
  }
});

gameSocket.on("lynchAlignment", ({ id, role, alignment }) => {
  const g = useGameState.getState();
  
  // Now we have complete data - update with alignment
  useGameState.setState({
    lynch: {
      killed: id,
      name: g.lynch?.name || g.players.find(p => p.id === id)?.name,
      role,
      alignment
    }
  });
});

gameSocket.on("noLynch", () => {
  console.log("No lynch occurred");
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
    winner: null,
    discussionTimer: null
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
