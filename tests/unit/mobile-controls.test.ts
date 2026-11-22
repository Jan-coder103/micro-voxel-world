import { expect,test } from 'vitest';
import { joystickAxes,throttleCommand } from '../../src/game/mobile-controls';

test('joystick centers small movements, preserves aircraft pull direction and clamps diagonals',()=>{
  expect(joystickAxes(2,-3,70)).toEqual({bank:0,pitch:0});
  expect(joystickAxes(-35,35,70)).toEqual({bank:-.5,pitch:.5});
  const axes=joystickAxes(200,-200,70);
  expect(Math.hypot(axes.bank,axes.pitch)).toBeCloseTo(1);
  expect(axes.bank).toBeGreaterThan(0);expect(axes.pitch).toBeLessThan(0);
});
test('power setting follows keyboard throttle rate, holds idle brakes and releases on reset',()=>{
  expect(throttleCommand(undefined,.4,.1)).toBe(0);
  expect(throttleCommand(1,.4,0)).toBe(0);
  expect(throttleCommand(1,.4,.1)).toBe(1);
  expect(throttleCommand(.3,.7,.1)).toBe(-1);
  expect(throttleCommand(.5,.5,.1)).toBe(0);
  expect(throttleCommand(0,0,.1)).toBe(-1);
  let power=0;
  for(let i=0;i<120;i++)power+=throttleCommand(.75,power,1/60)*.35/60;
  expect(power).toBeCloseTo(.7);
});
