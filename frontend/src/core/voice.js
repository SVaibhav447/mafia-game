import * as mediasoupClient from "mediasoup-client";
import { attachStream } from "./audioMap";

let gameSocket = null;
let device;
let sendTransport;
let recvTransport;
let consumers = {};
let producers = {};
let localStream;

export function bindSocket(sock) {
  gameSocket = sock;

  // backend sends router caps
  gameSocket.on("routerCaps", async ({ routerRtpCapabilities }) => {
    await initDevice(routerRtpCapabilities);

    gameSocket.emit("createSendTransport", {}, params => {
      createSend(params);
    });

    gameSocket.emit("createRecvTransport", {}, params => {
      createRecv(params);
    });
  });

  // backend notifies new producer to consume
  gameSocket.on("newProducer", async ({ producerId }) => {
    await consume(producerId);
  });
}

export async function initDevice(routerRtpCapabilities) {
  if (!device) device = new mediasoupClient.Device();
  await device.load({ routerRtpCapabilities });
}

export async function enableMic() {
  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
    });
  }
  return localStream;
}

export function joinRoom(room) {
  gameSocket.emit("joinVoiceRoom", { room });
}

export function leaveRoom() {
  gameSocket.emit("leaveVoiceRoom");
}

function createSend(params) {
  sendTransport = device.createSendTransport(params);

  sendTransport.on("connect", ({ dtlsParameters }, cb) => {
    gameSocket.emit("connectTransport", {
      transportId: sendTransport.id,
      dtlsParameters
    });
    cb();
  });

  sendTransport.on("produce", async ({ kind, rtpParameters }, cb) => {
    gameSocket.emit(
      "produce",
      { transportId: sendTransport.id, kind, rtpParameters },
      ({ id, error }) => {
        if (error === "MUTED") return;
        producers[kind] = id;
        cb({ id });
      }
    );
  });
}

function createRecv(params) {
  recvTransport = device.createRecvTransport(params);

  recvTransport.on("connect", ({ dtlsParameters }, cb) => {
    gameSocket.emit("connectTransport", {
      transportId: recvTransport.id,
      dtlsParameters
    });
    cb();
  });
}

export async function consume(producerId) {
  gameSocket.emit(
    "consume",
    { producerId, rtpCapabilities: device.rtpCapabilities },
    async params => {
      const consumer = await recvTransport.consume(params);
      consumers[producerId] = consumer;

      const stream = new MediaStream([consumer.track]);
      attachStream(producerId, stream);

      gameSocket.emit("resumeConsumer", { consumerId: consumer.id });
    }
  );
}

export async function startMic() {
  const stream = await enableMic();
  const track = stream.getAudioTracks()[0];

  await sendTransport.produce({
    track,
    codecOptions: { opusStereo: false }
  });
}

export function closeAllVoice() {
  Object.values(consumers).forEach(c => c.close());
  Object.values(producers).forEach(p => p.close());
}
