class VadWorkletProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0][0];
    if (input) {
      this.port.postMessage(new Float32Array(input));
    }
    return true;
  }
}

registerProcessor('vad-worklet', VadWorkletProcessor);
