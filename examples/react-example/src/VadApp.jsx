import React, { useEffect, useRef, useState } from 'react';
import * as ort from 'onnxruntime-web';

export default function VadApp() {
  const [ready, setReady] = useState(false);
  const [speech, setSpeech] = useState(false);
  const sessionRef = useRef(null);
  const stateRef = useRef(null);

  useEffect(() => {
    async function init() {
      sessionRef.current = await ort.InferenceSession.create('./silero_vad.onnx');
      stateRef.current = new ort.Tensor('float32', new Float32Array(2 * 1 * 128), [2, 1, 128]);
      setReady(true);
    }
    init();
  }, []);

  async function process(audioData) {
    if (!ready) return;
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
