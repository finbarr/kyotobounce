// Research captures default to portable software rendering on CPU-only Linux.
// GPU machines select KYOTO_CHROME_ANGLE=gl (or vulkan) after driver validation.
export function chromeGraphicsArgs() {
  const angle = process.env.KYOTO_CHROME_ANGLE || (process.platform === 'darwin' ? 'metal' : 'swiftshader');
  if (!['metal', 'swiftshader', 'gl', 'vulkan'].includes(angle)) throw new Error(`Unsupported KYOTO_CHROME_ANGLE: ${angle}`);
  return ['--enable-webgl', '--ignore-gpu-blocklist', `--use-angle=${angle}`, ...(angle === 'swiftshader' ? ['--enable-unsafe-swiftshader'] : [])];
}
