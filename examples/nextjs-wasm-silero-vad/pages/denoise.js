import { useEffect, useRef, useState } from 'react';

export default function Denoise() {
  const [ready, setReady] = useState(false);
  const workerRef = useRef(null);
  const nodeRef = useRef(null);
  const sabInRef = useRef(null);
  const sabOutRef = useRef(null);

  useEffect(() => {
    async function init() {
      sabInRef.current = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 480);
      sabOutRef.current = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 480);

      workerRef.current = new Worker('/denoise-worker.js');
      workerRef.current.onmessage = (e) => {
        if (e.data.type === 'ready') {
          setReady(true);
        } else if (e.data.type === 'outputReady') {
          nodeRef.current.port.postMessage({ type: 'outputReady' });
        }
      };
      workerRef.current.postMessage({
        type: 'init',
        modelUrl: '/deepfilternet.onnx',
        sabIn: sabInRef.current,
        sabOut: sabOutRef.current,
      }, [sabInRef.current, sabOutRef.current]);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext({ sampleRate: 48000 });
      await audioContext.audioWorklet.addModule('/denoise-worklet.js');
      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContext, 'denoise-worklet', {
        processorOptions: {
          sabIn: sabInRef.current,
          sabOut: sabOutRef.current,
        },
      });
      nodeRef.current = workletNode;
      workletNode.port.onmessage = (e) => {
        if (e.data.type === 'input') {
          workerRef.current.postMessage({ type: 'process' });
        }
      };
      source.connect(workletNode);
      workletNode.connect(audioContext.destination);
    }
    init();
  }, []);

  return (
    <main>
      <h1>DeepFilterNet3 Denoise Demo</h1>
      {ready ? <p>Processing...</p> : <p>Loading model...</p>}

    </main>
  );
}
