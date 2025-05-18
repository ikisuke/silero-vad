import React, { useEffect, useRef, useState } from 'react';
import * as ort from 'onnxruntime-web';

export default function VadApp() {
  const [ready, setReady] = useState(false);
  const [speech, setSpeech] = useState(false);
  const sessionRef = useRef(null);
  const stateRef = useRef(null);
  const processorRef = useRef(null);

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
      const ctx = new AudioContext({ sampleRate: 16000 });
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(512, 1, 1);
      const mute = ctx.createGain();
      mute.gain.value = 0;
      processor.onaudioprocess = (e) => {
        const data = e.inputBuffer.getChannelData(0);
        const copy = new Float32Array(data);
        const down = downsampleBuffer(copy, ctx.sampleRate, 16000);
        process(down);
      };
      source.connect(processor);
      processor.connect(mute);
      mute.connect(ctx.destination);
      processorRef.current = processor;

      setReady(true);
    }
    init();

    return () => {
      if (processorRef.current) {
        processorRef.current.disconnect();
      }
    };
  }, []);

  async function process(audioData) {
    if (!sessionRef.current) return;
    const input = new ort.Tensor('float32', audioData, [1, audioData.length]);
    const sr = new ort.Tensor('int64', new BigInt64Array([16000n]), [1]);
    const feeds = { input, state: stateRef.current, sr };
    const results = await sessionRef.current.run(feeds);
    stateRef.current = results.stateN;
    const out = results.output.data[0];
    setSpeech(out > 0.5);
  }

  return (
    <div>
      <h1>Silero VAD React Demo</h1>
      {ready ? <p>{speech ? 'Speech' : 'Silence'}</p> : <p>Loading model...</p>}
    </div>
  );
}
