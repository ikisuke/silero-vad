class DenoiseWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.outQueue = [];
    this.port.onmessage = (e) => {
      if (e.data.type === 'output') {
        this.outQueue.push(new Float32Array(e.data.audio));
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0][0];
    const output = outputs[0][0];
    if (input) {
      this.port.postMessage({ type: 'input', audio: new Float32Array(input) }, [input.buffer]);
    }
    if (this.outQueue.length > 0) {
      const data = this.outQueue.shift();
      output.set(data.subarray(0, output.length));
    } else {
      output.fill(0);
    }
    return true;
  }
}

registerProcessor('denoise-worklet', DenoiseWorkletProcessor);
