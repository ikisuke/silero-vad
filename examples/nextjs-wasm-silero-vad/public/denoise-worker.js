let ort;
self.onmessage = async (e) => {
  const { type } = e.data;
  if (type === 'init') {
    const { modelUrl } = e.data;
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
    if (!self.session || !self.state) return;
    const input = new ort.Tensor('float32', e.data.audio, [1, e.data.audio.length]);
    try {
      const feeds = { input, state: self.state };
      const results = await self.session.run(feeds);
      self.state = results.state;
      postMessage({ type: 'output', audio: results.output.data }, [results.output.data.buffer]);
    } catch (err) {
      postMessage({ type: 'error', message: 'inference failed' });
    }
  }
};
