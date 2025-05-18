# React Example using ONNX Runtime Web

This example demonstrates how to use the **silero-vad** ONNX model inside a React application. We rely on [`onnxruntime-web`](https://www.npmjs.com/package/onnxruntime-web) to run the model directly in the browser.

## Setup

1. Install Node.js (v16 or later).
2. Navigate to this directory and install dependencies:
   ```bash
   npm install
   ```
3. Download the model `silero_vad.onnx` from the repository (`src/silero_vad/data/`)
   and place it next to this README. The webpack configuration copies it to the
   build folder so the browser can load it.


   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm start
   ```
5. Open `http://localhost:3000` to see the demo.

## Files

- `package.json` – minimal project configuration.
- `src/VadApp.jsx` – React component loading the model, capturing microphone audio via an AudioWorklet and showing detection results.
- `src/index.jsx` – entry point rendering the component.
- `src/vad-processor.js` – AudioWorklet processor forwarding audio buffers to the React app.

The example now includes basic microphone handling so it immediately reacts to speech.
