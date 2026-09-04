/**
 * Global test setup — adds jsdom stubs for browser APIs that jsdom does not
 * implement out of the box but that our tests need to spy on.
 */
import '@testing-library/jest-dom';

// jsdom does not implement URL.createObjectURL / URL.revokeObjectURL.
// We add them here so that vi.spyOn works in test files.
if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:stub-url';
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = () => {};
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
