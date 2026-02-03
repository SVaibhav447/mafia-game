import { useEffect, useState } from "react";

export default function VUMeter({ stream }) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!stream) return;

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;

    const data = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);

    let animationId;
    function tick() {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / data.length / 255;
      setLevel(avg);
      animationId = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      cancelAnimationFrame(animationId);
      source.disconnect();
      ctx.close();
    };
  }, [stream]);

  return (
    <div className="vu-meter">
      <div 
        className="vu-fill" 
        style={{ width: `${Math.min(level, 1) * 100}%` }} 
      />
    </div>
  );
}