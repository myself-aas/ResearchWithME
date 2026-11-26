export interface CapabilityReport {
  supported: boolean;
  backend: 'webgpu' | 'wasm-threads' | 'none';
  crossOriginIsolated: boolean;
}
/** User-initiated capability probe only. Never fetch weights or fall back to cloud. */
export async function probeLocalCapabilities(): Promise<CapabilityReport> {
  const isolated = typeof window !== 'undefined' && window.crossOriginIsolated === true;
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return { supported: false, backend: 'none', crossOriginIsolated: false };
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (gpu) {
    try { if (await gpu.requestAdapter()) return { supported: true, backend: 'webgpu', crossOriginIsolated: isolated }; }
    catch { /* Fall through to WASM. */ }
  }
  if (isolated && typeof SharedArrayBuffer !== 'undefined' && typeof WebAssembly !== 'undefined') return { supported: true, backend: 'wasm-threads', crossOriginIsolated: isolated };
  return { supported: false, backend: 'none', crossOriginIsolated: isolated };
}
