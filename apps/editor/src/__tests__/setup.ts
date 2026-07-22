import '@testing-library/jest-dom'

class ResizeObserverMock {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    // Fire immediately with a large width so virtual-window culling
    // doesn't hide clips in test fixtures. Max clip end-frame is 1200
    // at ppf=4, so we need vpWidth >= 4800px.
    this.callback(
      [{
        target,
        contentRect: {
          width: 4800, height: 600,
          top: 0, left: 0, right: 4800, bottom: 600,
          x: 0, y: 0,
          toJSON() { return this; },
        },
        borderBoxSize: [],
        contentBoxSize: [],
        devicePixelContentBoxSize: [],
      }] as unknown as ResizeObserverEntry[],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: ResizeObserverMock,
    writable: true,
    configurable: true,
  });
}
