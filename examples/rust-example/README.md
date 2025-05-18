# Stream example in Rust
Made after [C++ stream example](https://github.com/snakers4/silero-vad/tree/master/examples/cpp)

## Dependencies
- To build Rust crate `ort` you need `cc` installed.

## Usage
Just
```
cargo run
```
If you run example outside of this repo adjust environment variable
```
SILERO_MODEL_PATH=/path/to/silero_vad.onnx cargo run 
```
If you need to test against other wav file, not `recorder.wav`, specify it as the first argument
```
cargo run -- /path/to/audio/file.wav
```

## WebAssembly 対応

ブラウザ上でこの Rust サンプルを動かす際の基本手順です。

1. **ターゲットの追加**
   ```bash
   rustup target add wasm32-unknown-unknown
   ```
2. **`ort` クレートの設定**
   `Cargo.toml` の依存を `wasm-bindgen` 用の機能に変更します（例：`features = ["wasm-bindgen", "ndarray"]`）。
3. **ビルド**
   ```bash
   cargo build --release --target wasm32-unknown-unknown
   ```
4. **ブラウザから実行**
   生成された `.wasm` と JavaScript ラッパーをサーバー上に配置し、`silero_vad.onnx` を同じ場所から取得できるようにします。

`ort` の wasm サポートはバージョンによって変わる場合があります。詳細はクレートのドキュメントをご確認ください。
