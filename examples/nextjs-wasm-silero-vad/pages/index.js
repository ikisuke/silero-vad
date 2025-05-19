import { useEffect, useRef, useState } from "react";
import { InferenceSession, Tensor } from "onnxruntime-web";

export default function Home() {
  const [ready, setReady] = useState(false);
  const [speech, setSpeech] = useState(false);
  const sessionRef = useRef(null);
  const stateRef = useRef(null);
  const bufferRef = useRef([]);
  const contextRef = useRef(new Float32Array(64).fill(0));
  const processingRef = useRef(false);

  const WINDOW = 512;
  const CONTEXT = 64;

  useEffect(() => {
    async function init() {
      sessionRef.current = await InferenceSession.create("/silero_vad.onnx");
      stateRef.current = new Tensor(
        "float32",
        new Float32Array(2 * 1 * 128),
        [2, 1, 128]
      );
      await setupWorklet();
      setReady(true);
    }
    init();
  }, []);

  async function setupWorklet() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext({ sampleRate: 16000 });
    await audioContext.audioWorklet.addModule("/vad-worklet.js");
    const source = audioContext.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(audioContext, "vad-worklet");
    workletNode.port.onmessage = (e) => processChunk(e.data);
    source.connect(workletNode);
    workletNode.connect(audioContext.destination);
  }

  async function runModel(inputData) {
    if (!sessionRef.current) return;
    const input = new Tensor("float32", inputData, [1, inputData.length]);
    const sr = new Tensor("int64", new BigInt64Array([16000n]), [1]);
    const feeds = { input, state: stateRef.current, sr };
    const results = await sessionRef.current.run(feeds);
    stateRef.current = results.stateN;
    setSpeech(results.output.data[0] > 0.5);
  }

  async function processChunk(audio) {
    bufferRef.current.push(...audio);
    if (processingRef.current) return;
    processingRef.current = true;
    while (bufferRef.current.length >= WINDOW) {
      const chunk = bufferRef.current.slice(0, WINDOW);
      bufferRef.current = bufferRef.current.slice(WINDOW);
      const inputData = new Float32Array(WINDOW + CONTEXT);
      inputData.set(contextRef.current, 0);
      inputData.set(chunk, CONTEXT);
      await runModel(inputData);
      contextRef.current = inputData.slice(WINDOW);
    }
    processingRef.current = false;
  }

  return (
    <main>
      <h1>Silero VAD Next.js Demo</h1>
      {ready ? <p>{speech ? "Speech" : "Silence"}</p> : <p>Loading...</p>}
      <p>
        <a href="/denoise">Denoise Demo</a>
      </p>
    </main>
  );
}
