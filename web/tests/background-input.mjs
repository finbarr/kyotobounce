// Browser acceptance uses real DOM and keyboard controls without taking the
// laptop's pointer. Headless Chrome can still lock/warp the macOS cursor.
// This deliberately does not emulate a successful pointer lock: mouse capture
// itself is covered separately by camera-focus.mjs with no browser/OS calls.
export async function backgroundInput(context) {
  await context.addInitScript(() => {
    Object.defineProperty(Element.prototype, 'requestPointerLock', {
      configurable: false,
      writable: false,
      value() { return Promise.resolve(); },
    });
  });
}
