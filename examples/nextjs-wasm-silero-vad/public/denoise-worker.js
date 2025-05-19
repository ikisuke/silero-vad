let ort;
let inputBuf;
let outputBuf;

self.onmessage = async (e) => {
  const { type } = e.data;
  if (type === 'init') {
    const { modelUrl, sabIn, sabOut } = e.data;
    inputBuf = new Float32Array(sabIn);
    outputBuf = new Float32Array(sabOut);
    if (!ort) {
      try {
        importScripts('/ort.min.js');
      } catch (err) {
        postMessage({ type: 'error', message: 'Failed to load ort.min.js' });
        return;
      }
    }
    try {
      self.session = await ort.InferenceSession.create(modelUrl);
    } catch (err) {
      postMessage({ type: 'error', message: 'Failed to load model' });
      return;
    }
    self.state = new ort.Tensor('float32', new Float32Array(2 * 1 * 512), [2, 1, 512]);
    postMessage({ type: 'ready' });
  } else if (type === 'process') {
    if (!self.session || !self.state || !inputBuf || !outputBuf) return;
    const input = new ort.Tensor('float32', inputBuf, [1, inputBuf.length]);
    try {
      const feeds = { input, state: self.state };
      const results = await self.session.run(feeds);
      self.state = results.state;
      outputBuf.set(results.output.data);
      postMessage({ type: 'outputReady' });
    } catch (err) {
      postMessage({ type: 'error', message: 'inference failed' });
    }
  }
};
