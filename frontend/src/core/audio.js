export function attachVUMeter(stream, onLevel) {
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;

  const data = new Uint8Array(analyser.frequencyBinCount);
  source.connect(analyser);

  function tick() {
    analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    const avg = sum / data.length / 255;
    onLevel(avg);
    requestAnimationFrame(tick);
  }
  tick();
}
