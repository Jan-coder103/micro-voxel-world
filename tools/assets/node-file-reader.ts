/** Only the Blob-to-ArrayBuffer subset used by binary, texture-free GLTFExporter.
 * Installed by Node tooling/tests, never by the browser entry point. */
export function installNodeFileReader() {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'FileReader');
  if (original) return () => {};
  class BlobReader {
    result: ArrayBuffer | null = null;
    onloadend: (() => void) | null = null;
    readAsArrayBuffer(blob: Blob) {
      void blob.arrayBuffer().then((result) => { this.result = result; this.onloadend?.(); });
    }
  }
  Object.defineProperty(globalThis, 'FileReader', { configurable: true, value: BlobReader });
  return () => { Reflect.deleteProperty(globalThis, 'FileReader'); };
}
