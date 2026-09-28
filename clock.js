// Native timer methods require a Window/WorkerGlobalScope receiver in Chrome.
// Store wrappers, never the detached methods on an arbitrary clock object.
export const systemClock = {
  now: () => Date.now(),
  setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimeout: id => globalThis.clearTimeout(id)
};
