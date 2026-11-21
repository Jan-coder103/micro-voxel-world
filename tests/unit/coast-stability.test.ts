import type {BufferAttribute} from 'three';
import {expect,it,vi} from 'vitest';
import {createTerrainFallback} from '../../src/rendering/terrain-fallback';
import {Frontier} from '../../src/game/frontier';
it('keeps the coarse world lattice fixed across half-cell movement, including negative coordinates',()=>{
  const sample=vi.fn((x:number,z:number)=>({height:Math.sin(x/95)*3+Math.cos(z/70),color:[.62,.57,.37]}));
  const view=createTerrainFallback(103,sample,128,{innerExtent:512,innerSpacing:16});
  view.update(-2000,-700);const origin=view.mesh.position.clone(),attribute=view.mesh.geometry.getAttribute('position') as BufferAttribute,version=attribute.version,calls=sample.mock.calls.length;
  view.update(-1936,-700);expect(view.mesh.position).toEqual(origin);expect(attribute.version).toBe(version);expect(sample.mock.calls.length).toBe(calls);
  view.update(-1900,-700);expect(view.mesh.position.x-origin.x).toBe(128);
  // The same far-field world samples survive a rebase rather than shifting halfway between cells.
  const position=view.mesh.geometry.getAttribute('position');
  for(let i=0;i<position.count;i++)if(Math.abs(position.getX(i))>512&&Math.abs(position.getZ(i))>512){
    expect((position.getX(i)+view.mesh.position.x)%128).toBeCloseTo(0);
    expect((position.getZ(i)+view.mesh.position.z)%128).toBeCloseTo(0);
  }
  view.dispose();
});
it('starts the player without auto-level or automatic trim and preserves an explicit settings choice on rearm',()=>{
  const game=new Frontier();expect(game.flight.assisted).toBe(false);
  game.rearm();expect(game.flight.assisted).toBe(false);
  game.flight.assisted=true;game.rearm();expect(game.flight.assisted).toBe(true);
});
