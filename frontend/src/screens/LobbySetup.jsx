import { useState } from "react";
import { gameSocket } from "../core/socket";
import { useGameState } from "../core/state";

export default function LobbySetup() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCodeInput] = useState("");
  const [error, setError] = useState("");

  function create() {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!roomCode.trim()) {
      setError("Please enter a room code");
      return;
    }
    
    setError("");
    gameSocket.emit("createRoom", { 
      roomCode: roomCode.trim().toUpperCase(), 
      hostName: name.trim() 
    });
  }

  function join() {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!roomCode.trim()) {
      setError("Please enter a room code");
      return;
    }
    
    setError("");
    gameSocket.emit("joinRoom", { 
      roomCode: roomCode.trim().toUpperCase(), 
      playerName: name.trim() 
    });
  }

  return (
    <div className="lobby-setup">
      <div className="setup-container">
        <h1>Mafia Game</h1>
        
        <input 
          placeholder="Your name" 
          value={name}
          onChange={e => setName(e.target.value)} 
          className="input-field"
        />
        
        <input 
          placeholder="Room code (e.g., GAME123)" 
          value={roomCode}
          onChange={e => setRoomCodeInput(e.target.value.toUpperCase())} 
          className="input-field"
        />
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="button-group">
          <button onClick={join} className="join-button">Join Room</button>
          <button onClick={create} className="create-button">Create Room</button>
        </div>
      </div>
    </div>
  );
}