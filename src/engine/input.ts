import type { InputFrame } from './simulation';

/** Input belongs to the focusable viewport; typing in page controls cannot move it. */
export function bindInput(host: HTMLElement) {
  const keys = new Set<string>();
  const supported = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
  const down = (event: KeyboardEvent) => { if (supported.includes(event.code)) { event.preventDefault(); keys.add(event.code); } };
  const up = (event: KeyboardEvent) => { keys.delete(event.code); };
  const clear = () => keys.clear();
  host.addEventListener('keydown', down); host.addEventListener('keyup', up); host.addEventListener('blur', clear);
  window.addEventListener('blur', clear);
  return {
    clear,
    sample(): InputFrame {
      const held = (...codes: string[]) => Number(codes.some((code) => keys.has(code)));
      return { x: held('KeyD', 'ArrowRight') - held('KeyA', 'ArrowLeft'), z: held('KeyS', 'ArrowDown') - held('KeyW', 'ArrowUp'), pulse: keys.has('Space') };
    },
    dispose() { clear(); host.removeEventListener('keydown', down); host.removeEventListener('keyup', up); host.removeEventListener('blur', clear); window.removeEventListener('blur', clear); },
  };
}
