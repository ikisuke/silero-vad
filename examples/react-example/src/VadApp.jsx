import React, { useEffect, useRef, useState } from 'react';
import * as ort from 'onnxruntime-web';

export default function VadApp() {
  const [ready, setReady] = useState(false);
  const [speech, setSpeech] = useState(false);
  const sessionRef = useRef(null);
  const stateRef = useRef(null);
  const workletRef = useRef(null);
  const bufferRef = useRef([]); // holds downsampled audio between model calls
  const contextRef = useRef(new Float32Array(64).fill(0)); // last 64 samples
  const processingRef = useRef(false);


  function downsampleBuffer(buffer, sampleRate, outRate) {
    if (outRate === sampleRate) {
      return buffer;
    }
    const ratio = sampleRate / outRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offset = 0;
    for (let i = 0; i < newLength; i++) {
      const nextOffset = Math.round((i + 1) * ratio);
      let accum = 0;
      let count = 0;
      for (; offset < nextOffset && offset < buffer.length; offset++) {
        accum += buffer[offset];
        count++;
      }
      result[i] = accum / count;
    }
    return result;
  }

  useEffect(() => {
    async function init() {
      sessionRef.current = await ort.InferenceSession.create('./silero_vad.onnx');
      stateRef.current = new ort.Tensor('float32', new Float32Array(2 * 1 * 128), [2, 1, 128]);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      await ctx.audioWorklet.addModule('vad-processor.js');
      const node = new AudioWorkletNode(ctx, 'vad-processor');
      const mute = ctx.createGain();
      mute.gain.value = 0;
      node.port.onmessage = (e) => {
        const down = downsampleBuffer(e.data, ctx.sampleRate, 16000);
        process(down);
      };
      source.connect(node);
      node.connect(mute);
      mute.connect(ctx.destination);
      workletRef.current = node;
      setReady(true);
    }
    init();

    return () => {
      if (workletRef.current) {
        workletRef.current.disconnect();
      }
    };
  }, []);

  const WINDOW = 512;
  const CONTEXT = 64;

  async function runModel(inputData) {
    if (!sessionRef.current) return;
    const input = new ort.Tensor('float32', inputData, [1, inputData.length]);
    const sr = new ort.Tensor('int64', new BigInt64Array([16000n]), [1]);
    const feeds = { input, state: stateRef.current, sr };
    const results = await sessionRef.current.run(feeds);
    stateRef.current = results.stateN;
    const out = results.output.data[0];
    setSpeech(out > 0.5);
  }

  async function process(audioData) {
    bufferRef.current.push(...audioData);
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
    <div>
      <h1>Silero VAD React Demo</h1>
      {ready ? <p>{speech ? 'Speech' : 'Silence'}</p> : <p>Loading model...</p>}
    </div>
  );
}
