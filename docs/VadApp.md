# VadApp.jsx Overview

`VadApp.jsx` is the heart of the React example. It loads the Silero VAD ONNX model, starts the microphone, and streams buffered audio into the model.

```jsx
useEffect(() => {
  async function init() {
    sessionRef.current = await ort.InferenceSession.create('./silero_vad.onnx');
    stateRef.current = new ort.Tensor('float32', new Float32Array(2 * 1 * 128), [2, 1, 128]);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    await ctx.audioWorklet.addModule('vad-processor.js');
    const node = new AudioWorkletNode(ctx, 'vad-processor');
    node.port.onmessage = (e) => {
      const down = downsampleBuffer(e.data, ctx.sampleRate, 16000);
      process(down);
    };
    source.connect(node);
    node.connect(ctx.destination);
  }
  init();
}, []);
```

Each audio buffer is downsampled to 16 kHz and appended to an internal buffer. Once enough samples (512) are collected, the component keeps 64 samples of context from the previous call and sends a `576`-sample tensor to the ONNX model:

```jsx
const WINDOW = 512;
const CONTEXT = 64;

async function process(audioData) {
  bufferRef.current.push(...audioData);
  while (bufferRef.current.length >= WINDOW) {
    const chunk = bufferRef.current.slice(0, WINDOW);
    bufferRef.current = bufferRef.current.slice(WINDOW);
    const inputData = new Float32Array(WINDOW + CONTEXT);
    inputData.set(contextRef.current, 0);
    inputData.set(chunk, CONTEXT);
    await runModel(inputData);
    contextRef.current = inputData.slice(WINDOW);
  }
}
```

The model output updates the component state and the UI displays `Speech` whenever the score exceeds `0.5`.
