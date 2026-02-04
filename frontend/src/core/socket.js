import { io } from "socket.io-client";
import { bindSocket, joinRoom, leaveRoom, startMic } from "./voice";
import { useGameState } from "./state";

export const gameSocket = io(import.meta.env.VITE_BACKEND_URL, {
  transports: ["websocket"]
});

// bind to voice engine
bindSocket(gameSocket);

gameSocket.on("connect", () => {
  console.log("game server connected");
});

// expose simple voice API for UI
export const voice = {
  joinRoom,
  leaveRoom,
  startMic
};
