const { TextEncoder, TextDecoder } = require('util');

Object.defineProperty(window, 'TextEncoder', {
  writable: true,
  value: TextEncoder,
});
Object.defineProperty(window, 'TextDecoder', {
  writable: true,
  value: TextDecoder,
});
