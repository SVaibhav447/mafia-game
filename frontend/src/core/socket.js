import { io } from "socket.io-client";

export const gameSocket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:3001", {
  transports: ["websocket"]
});

gameSocket.on("connect", () => {
  console.log("game server connected");
});
