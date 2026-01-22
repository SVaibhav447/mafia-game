import { useEffect } from "react"
import { io } from "socket.io-client"

function App() {
  useEffect(() => {
    const socket = io("http://localhost:3001")
    socket.on("connect", () => console.log("connected:", socket.id))
  }, [])

  return <div>SANCHIT BHAI SOCKET CHAL RAHA FRONT PE HI</div>
}

export default App
