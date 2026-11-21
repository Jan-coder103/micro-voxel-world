import {describe,expect,it} from 'vitest';
import {headingTape,radarContact} from '../../src/game/tactical-hud';
describe('tactical instruments',()=>{
  it('projects world contacts into heading-up radar and omits beyond range',()=>{
    expect(radarContact(0,-1250,0)).toEqual({x:50,y:28});
    expect(radarContact(1250,0,Math.PI/2)?.y).toBeCloseTo(28);
    expect(radarContact(0,-2501,0)).toBeUndefined();
    expect(radarContact(0,0,2)).toEqual({x:50,y:50});
    expect(radarContact(-1250,0,0)?.x).toBe(28);
  });
  it('wraps compass labels through north while keeping the tape continuous',()=>{
    const tape=headingTape(359);
    expect(tape).toContain('>N</span>');expect(tape).toContain('>330</span>');expect(tape).toContain('>030</span>');
    expect(tape).not.toContain('>360</span>');expect(tape.match(/<span/g)).toHaveLength(7);
  });
});
