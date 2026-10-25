// Mono PCM capture only; no network, storage or audible monitoring.
class FCCareCapture extends AudioWorkletProcessor {
  constructor() {
    super(); this.pending = new Float32Array(4096); this.used = 0; this.total = 0; this.done = false;
    this.port.onmessage = event => { if (event.data === 'finish') this.finish(); };
  }
  flush() {
    if (this.used) { const samples = this.pending.slice(0, this.used); this.port.postMessage({ samples }, [samples.buffer]); this.used = 0; }
  }
  finish() { if (!this.done) { this.done = true; this.flush(); this.port.postMessage({ done: true }); } }
  process(inputs) {
    if (this.done) return false;
    const input = inputs[0]?.[0];
    if (!input) return true;
    for (const value of input) {
      if (this.total >= sampleRate * 60) { this.finish(); return false; }
      this.pending[this.used++] = value; this.total++;
      if (this.used === this.pending.length) this.flush();
    }
    return true;
  }
}
registerProcessor('fc-care-capture', FCCareCapture);
