const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")


const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: "*" }
})

app.use(cors())

server.listen(3001, () => console.log("Backend running on 3001"))
