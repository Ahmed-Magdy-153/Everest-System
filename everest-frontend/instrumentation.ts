// Runs before any server-side module evaluation.
// Patches the broken localStorage global that appears in some Node.js environments
// (when --localstorage-file is passed without a valid path).
export function register() {
  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).localStorage !== 'undefined') {
    try {
      const ls = (globalThis as any).localStorage
      if (typeof ls?.getItem !== 'function') {
        const mem: Record<string, string> = {}
        ;(globalThis as any).localStorage = {
          getItem:    (k: string) => mem[k] ?? null,
          setItem:    (k: string, v: string) => { mem[k] = v },
          removeItem: (k: string) => { delete mem[k] },
          clear:      () => { Object.keys(mem).forEach(k => delete mem[k]) },
          key:        (_i: number) => null,
          get length() { return Object.keys(mem).length },
        }
      }
    } catch { /* ignore */ }
  }
}
