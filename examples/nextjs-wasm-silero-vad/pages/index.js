import { useEffect, useRef, useState } from 'react';
import * as ort from 'onnxruntime-web';

export default function Home() {
  const [ready, setReady] = useState(false);
  const [speech, setSpeech] = useState(false);
  const sessionRef = useRef(null);
  const stateRef = useRef(null);

  useEffect(() => {
    async function init() {
      sessionRef.current = await ort.InferenceSession.create('/silero_vad.onnx');
      stateRef.current = new ort.Tensor('float32', new Float32Array(2 * 1 * 128), [2, 1, 128]);
      await setupWorklet();
      setReady(true);
    }
    init();
  }, []);

  async function setupWorklet() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext({ sampleRate: 16000 });
    await audioContext.audioWorklet.addModule('/vad-worklet.js');
    const source = audioContext.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(audioContext, 'vad-worklet');
    workletNode.port.onmessage = (e) => process(e.data);
    source.connect(workletNode);
    workletNode.connect(audioContext.destination);
  }

  async function process(audio) {
    if (!sessionRef.current || !stateRef.current) return;
    const input = new ort.Tensor('float32', audio, [1, audio.length]);
    const sr = new ort.Tensor('int64', new BigInt64Array([16000n]), [1]);
    const feeds = { input, state: stateRef.current, sr };
    const results = await sessionRef.current.run(feeds);
    stateRef.current = results.stateN;
    setSpeech(results.output.data[0] > 0.5);
  }

  return (
    <main>
      <h1>Silero VAD Next.js Demo</h1>
      {ready ? <p>{speech ? 'Speech' : 'Silence'}</p> : <p>Loading...</p>}
      <p><a href="/denoise">Denoise Demo</a></p>
    </main>
  );
}
