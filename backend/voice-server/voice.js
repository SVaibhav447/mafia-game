const { getRouter } = require("./mediasoup");

const voiceState = {
  rooms: {
    day:    { peers: [] },
    mafia:  { peers: [] },
    spec:   { peers: [] }, // spectators
    end:    { peers: [] }
  }
};

const peers = {}; // socketId -> { transports, producers, consumers, room }

function registerVoice(io, getGameRooms) {

  io.on("connection", socket => {

    peers[socket.id] = {
      transports: [],
      producers: [],
      consumers: [],
      room: null,
      alive: true,
      role: null
    };

    // ===== ROOM SWITCH CONTROL (called from state.js client) =====
    socket.on("joinVoiceRoom", ({ room }) => {
      movePeer(socket.id, room);
    });

    socket.on("leaveVoiceRoom", () => {
      movePeer(socket.id, null);
    });

    // ===== TRANSPORT CREATION =====
    socket.on("createSendTransport", async (_, callback) => {
      const router = await getRouter();
      const t = await router.createWebRtcTransport({
        listenIps: [{ ip: "0.0.0.0", announcedIp: null }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true
      });
      peers[socket.id].transports.push(t);
      callback({
        id: t.id,
        iceParameters: t.iceParameters,
        iceCandidates: t.iceCandidates,
        dtlsParameters: t.dtlsParameters
      });
    });

    socket.on("connectTransport", async ({ transportId, dtlsParameters }) => {
      const t = peers[socket.id].transports.find(t => t.id === transportId);
      await t.connect({ dtlsParameters });
    });

    // ===== PRODUCE (microphone) =====
    socket.on("produce", async ({ transportId, kind, rtpParameters }, callback) => {
      const router = await getRouter();
      const t = peers[socket.id].transports.find(t => t.id === transportId);

      if (!canSpeak(socket.id, getGameRooms())) {
        console.log(`MUTED: ${socket.id}`);
        return callback({ error: "MUTED" });
      }

      const producer = await t.produce({ kind, rtpParameters });
      peers[socket.id].producers.push(producer);

      const room = peers[socket.id].room;
      if (room && voiceState.rooms[room]) {
        for (const peerId of voiceState.rooms[room].peers) {
          if (peerId !== socket.id) {
            io.to(peerId).emit("newProducer", { producerId: producer.id });
          }
        }
      }

      callback({ id: producer.id });
    });

    // ===== CONSUME (receive voices) =====
    socket.on("consume", async ({ producerId, rtpCapabilities }, callback) => {
      const router = await getRouter();
      if (!router.canConsume({ producerId, rtpCapabilities })) {
        return callback({ error: "NO_CONSUME" });
      }

      const t = peers[socket.id].transports[0];
      const consumer = await t.consume({
        producerId,
        rtpCapabilities,
        paused: true
      });

      peers[socket.id].consumers.push(consumer);

      consumer.on("producerclose", () => {
        socket.emit("producerClosed", { producerId });
      });

      callback({
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters
      });
    });

    socket.on("resumeConsumer", async ({ consumerId }) => {
      const c = peers[socket.id].consumers.find(c => c.id === consumerId);
      if (c) await c.resume();
    });

    socket.on("disconnect", () => {
      movePeer(socket.id, null);
      delete peers[socket.id];
    });
  });

  // semi-private helper
  function movePeer(id, targetRoom) {
    const peer = peers[id];
    if (!peer) return;

    // remove from old room
    if (peer.room && voiceState.rooms[peer.room]) {
      voiceState.rooms[peer.room].peers = voiceState.rooms[peer.room].peers.filter(p => p !== id);
    }

    peer.room = targetRoom;

    if (targetRoom && voiceState.rooms[targetRoom]) {
      voiceState.rooms[targetRoom].peers.push(id);
    }
  }
}

// ===== SPEAKING RULES =====
function canSpeak(socketId, gameRooms) {
  const rooms = gameRooms.allRooms();
  for (const code in rooms) {
    const room = rooms[code];
    const p = room.players.find(p => p.id === socketId);
    if (!p) continue;

    if (!p.alive) return false;

    const phase = room.state?.phase;
    const mafiaCount = room.players.filter(x => x.role === "mafia" && x.alive).length;

    if (phase === "day") return true;
    if (phase === "night") return (p.role === "mafia" && mafiaCount > 1);
    if (phase === "endgame") return true;

    return false;
  }
  return false;
}

module.exports = { registerVoice };
