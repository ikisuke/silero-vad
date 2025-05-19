# Next.js + WebAssembly で silero-vad を使うサンプル

このディレクトリでは、Next.js と `onnxruntime-web` を利用してブラウザで silero-vad を実行する例を示します。マイク入力は非推奨となった ScriptProcessorNode ではなく、AudioWorklet で取得します。

## セットアップ手順

1. Node.js (v16 以上) をインストールします。
2. このディレクトリで依存関係をインストールします。
   ```bash
   npm install
   ```
3. `next.config.js` では Cross-Origin Opener Policy と Cross-Origin Embedder Policy のヘッダーを付与しています。開発サーバを起動するだけで `SharedArrayBuffer` が利用可能になります。
4. `src/silero_vad/data/silero_vad.onnx` を `public/` にコピーします。
   ```bash
   cp ../../src/silero_vad/data/silero_vad.onnx public/
   ```
5. 任意で DeepFilterNet3 のモデル `deepfilternet.onnx` を `public/` に配置します。
6. `node_modules/onnxruntime-web/dist/ort.min.js` を `public/` にコピーします。
7. 開発サーバを起動します。
   ```bash
   npm run dev
   ```
8. ブラウザで `http://localhost:3000` を開き、マイク入力に対して VAD が動作するか確認します。
   `http://localhost:3000/denoise` では DeepFilterNet3 を用いたデノイズ処理のデモが実行されます（モデルと `ort.min.js` が存在する場合）。

`public/vad-worklet.js` と `public/denoise-worklet.js` で AudioWorkletProcessor を定義します。VAD ではメインスレッドから `onnxruntime-web` を用いて推論を実行し、デノイズでは `denoise-worker.js` が推論を担当します。音声は VAD では 16kHz、デノイズでは 48kHz モノラルで処理されます。

VAD モデルは 512 サンプルのフレームと 64 サンプルのコンテキストを入力として受け取ります。本サンプルでは AudioWorklet から渡されるデータをバッファに保持し、長さ `576` のテンソルを作成してから推論を行います。

バージョンアップに伴い、デノイズ処理では `SharedArrayBuffer` を利用したワーカー通信に対応しました。`next.config.js` で Cross-Origin Opener Policy と Cross-Origin Embedder Policy のヘッダーを付与しているため、開発サーバをそのまま起動すれば共有メモリを用いた高速な処理を試すことができます。

