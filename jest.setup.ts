import { webcrypto } from "crypto";
import { TextDecoder, TextEncoder } from "util";
import "@testing-library/jest-dom";

Object.assign(global, { TextEncoder, TextDecoder });
Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: () => null
});
