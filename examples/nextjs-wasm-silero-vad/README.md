# Next.js + WebAssembly で silero-vad を使うサンプル

このディレクトリでは、Next.js と `onnxruntime-web` を利用してブラウザで silero-vad を実行する例を示します。マイク入力は非推奨となった ScriptProcessorNode ではなく、AudioWorklet で取得します。

## セットアップ手順

1. Node.js (v16 以上) をインストールします。
2. このディレクトリで依存関係をインストールします。
   ```bash
   npm install
   ```
3. `src/silero_vad/data/silero_vad.onnx` を `public/` にコピーします。
   ```bash
   cp ../../src/silero_vad/data/silero_vad.onnx public/
   ```
4. 開発サーバを起動します。
   ```bash
   npm run dev
   ```
5. ブラウザで `http://localhost:3000` を開き、マイク入力に対して VAD が動作するか確認します。

`public/vad-worklet.js` で AudioWorkletProcessor を定義し、`pages/index.js` から `onnxruntime-web` を用いて推論を実行します。音声は 16kHz モノラルで処理されます。
