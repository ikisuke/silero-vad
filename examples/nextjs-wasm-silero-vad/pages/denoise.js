import { useEffect, useRef, useState } from 'react';
import * as ort from 'onnxruntime-web';

export default function Denoise() {
  const [ready, setReady] = useState(false);
  const sessionRef = useRef(null);
  const stateRef = useRef(null);
  const inputCanvasRef = useRef(null);
  const outputCanvasRef = useRef(null);

  useEffect(() => {
    async function init() {
      try {
        sessionRef.current = await ort.InferenceSession.create('/deepfilternet.onnx');
      } catch (e) {
        console.error('Failed to load DeepFilterNet model', e);
        return;
      }
      stateRef.current = new ort.Tensor('float32', new Float32Array(2 * 1 * 512), [2, 1, 512]);
      await setupWorklet();
      setReady(true);
    }
    init();
  }, []);

  async function setupWorklet() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext({ sampleRate: 48000 });
    await audioContext.audioWorklet.addModule('/denoise-worklet.js');
    const source = audioContext.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(audioContext, 'denoise-worklet');
    workletNode.port.onmessage = (e) => process(e.data, audioContext);
    source.connect(workletNode);
    workletNode.connect(audioContext.destination);
  }

  function draw(ref, data) {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    for (let i = 0; i < width; i++) {
      const idx = Math.floor((i / width) * data.length);
      const v = data[idx] * 0.5 + 0.5;
      const y = (1 - v) * height;
      i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y);
    }
    ctx.stroke();
  }

  async function process(audio, audioContext) {
    if (!sessionRef.current || !stateRef.current) return;
    draw(inputCanvasRef, audio);
    const input = new ort.Tensor('float32', audio, [1, audio.length]);
    const feeds = { input, state: stateRef.current };
    let results;
    try {
      results = await sessionRef.current.run(feeds);
    } catch (e) {
      console.error('DeepFilterNet inference failed', e);
      return;
    }
    stateRef.current = results.state;
    const output = results.output.data;
    draw(outputCanvasRef, output);
    const buffer = audioContext.createBuffer(1, output.length, 48000);
    buffer.copyToChannel(output, 0);
    const src = audioContext.createBufferSource();
    src.buffer = buffer;
    src.connect(audioContext.destination);
    src.start();
  }

  return (
    <main>
      <h1>DeepFilterNet3 Denoise Demo</h1>
      {ready ? <p>Processing...</p> : <p>Loading model...</p>}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div>
          <p>Input</p>
          <canvas ref={inputCanvasRef} width={300} height={100} />
        </div>
        <div>
          <p>Denoised</p>
          <canvas ref={outputCanvasRef} width={300} height={100} />
        </div>
      </div>
    </main>
  );
}
