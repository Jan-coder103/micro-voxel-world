export type Lifecycle = 'ready' | 'running' | 'paused' | 'disposed';
export interface InputFrame { x: number; z: number; pulse: boolean }
export const STEP = 1 / 60;

/** Rendering-independent state. Pool entries are allocated once and reused. */
export class Simulation {
  status: Lifecycle = 'ready';
  ticks = 0;
  x = 0;
  z = 0;
  droppedSeconds = 0;
  readonly pulses = Array.from({ length: 16 }, () => ({ active: false, age: 0, x: 0, z: 0 }));
  private accumulator = 0;
  private cooldown = 0;
  start() { if (this.status === 'ready' || this.status === 'paused') this.status = 'running'; }
  pause() { if (this.status === 'running') { this.status = 'paused'; this.accumulator = 0; } }
  reset() {
    if (this.status === 'disposed') return;
    this.status = 'ready'; this.ticks = 0; this.x = 0; this.z = 0;
    this.accumulator = 0; this.cooldown = 0; this.droppedSeconds = 0;
    this.pulses.forEach((p) => { p.active = false; p.age = 0; p.x = 0; p.z = 0; });
  }
  advance(seconds: number, input: InputFrame) {
    if (this.status !== 'running' || !Number.isFinite(seconds) || seconds <= 0) return;
    const accepted = Math.min(seconds, STEP * 8);
    this.droppedSeconds += seconds - accepted;
    this.accumulator += accepted;
    while (this.accumulator + 1e-10 >= STEP) {
      this.accumulator = Math.max(0, this.accumulator - STEP);
      this.ticks++;
      const length = Math.max(1, Math.hypot(input.x, input.z));
      this.x = Math.max(-8, Math.min(8, this.x + input.x / length * STEP * 3));
      this.z = Math.max(-8, Math.min(8, this.z + input.z / length * STEP * 3));
      this.cooldown = Math.max(0, this.cooldown - STEP);
      for (const p of this.pulses) if (p.active) { p.age += STEP; if (p.age >= 1) p.active = false; }
      if (input.pulse && this.cooldown <= 1e-10) {
        const p = this.pulses.find((entry) => !entry.active);
        if (p) { p.active = true; p.age = 0; p.x = this.x; p.z = this.z; }
        this.cooldown = 0.15;
      }
    }
  }
  dispose() { this.reset(); this.status = 'disposed'; }
}
