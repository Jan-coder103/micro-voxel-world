import { describe, expect, it } from 'vitest';
import { Simulation } from '../../src/engine/simulation';
const idle = { x: 0, z: 0, pulse: false };
describe('engine simulation', () => {
  it('produces the same state across frame rates', () => {
    const run = (hz: number) => { const s = new Simulation(); s.start(); for (let i = 0; i < hz; i++) s.advance(1 / hz, { x: 1, z: 0, pulse: true }); return s; };
    const a = run(30), b = run(144);
    expect(a.ticks).toBe(60); expect(b.ticks).toBe(60); expect(a.x).toBeCloseTo(3); expect(a.pulses).toEqual(b.pulses);
  });
  it('guards lifecycle, pauses time and resets all state', () => {
    const s = new Simulation(); s.advance(1, idle); expect(s.ticks).toBe(0);
    s.start(); s.advance(1 / 60, { x: 1, z: 0, pulse: true }); s.pause(); s.advance(10, idle);
    expect(s.ticks).toBe(1); s.start(); s.advance(1 / 60, idle); expect(s.ticks).toBe(2);
    s.reset(); expect(s.status).toBe('ready'); expect(s.x).toBe(0); expect(s.pulses.some((p) => p.active)).toBe(false);
    s.dispose(); s.start(); s.reset(); s.advance(1, idle); expect(s.status).toBe('disposed'); expect(s.ticks).toBe(0);
  });
  it('bounds catchup and reuses a fixed pool without stale effects', () => {
    const s = new Simulation(); const entries = [...s.pulses]; s.start(); s.advance(10, idle);
    expect(s.ticks).toBe(8); expect(s.droppedSeconds).toBeCloseTo(10 - 8 / 60);
    for (let i = 0; i < 600; i++) s.advance(1 / 60, { x: 0, z: 0, pulse: true });
    expect(s.pulses.length).toBe(16); s.pulses.forEach((p, i) => expect(p).toBe(entries[i]));
    for (let i = 0; i < 61; i++) s.advance(1 / 60, idle);
    expect(s.pulses.every((p) => !p.active)).toBe(true);
    s.advance(NaN, idle); expect(Number.isFinite(s.x)).toBe(true);
  });
});

it('resolves test movement against injected collision queries and slides along bounds', () => {
  const s = new Simulation((x) => x <= 1);
  s.start();
  for (let i = 0; i < 120; i++) s.advance(1 / 60, { x: 1, z: 1, pulse: false });
  expect(s.x).toBeLessThanOrEqual(1);
  expect(s.x).toBeGreaterThan(.9);
  expect(s.z).toBeGreaterThan(4);
  s.reset(); expect(s.x).toBe(0); expect(s.z).toBe(0);
});
