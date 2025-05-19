class DenoiseWorkletProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const { sabIn, sabOut } = options.processorOptions || {};
    this.inputBuf = sabIn ? new Float32Array(sabIn) : null;
    this.outputBuf = sabOut ? new Float32Array(sabOut) : null;
    this.outQueue = [];
    this.port.onmessage = (e) => {
      if (e.data.type === 'outputReady' && this.outputBuf) {
        this.outQueue.push(this.outputBuf.slice(0));
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0][0];
    const output = outputs[0][0];
    if (input) {
      if (this.inputBuf) {
        this.inputBuf.set(input);
        this.port.postMessage({ type: 'input' });
      } else {
        this.port.postMessage({ type: 'input', audio: new Float32Array(input) }, [input.buffer]);
      }
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
