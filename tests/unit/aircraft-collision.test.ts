import { describe,it,expect } from 'vitest';
import { Euler,Vector3 } from 'three';
import source from '../../assets/source/ref-attack-aircraft.voxel.json';
import { voxelCollisionBoxes } from '../../src/assets/collision-hull';
import { ATTACK_AIRCRAFT_BOXES } from '../../src/flight/attack-aircraft-hull';
import { PLAYER_FIXED_HULL,HELICOPTER_HULL } from '../../src/flight/aircraft-hulls';
import { boxContact,axes,transform,prepareHull,sweepAircraft,type Bounds,type CollisionBox } from '../../src/flight/collision';
import type { FlightPose } from '../../src/flight/flight';
import { Sortie } from '../../src/game/sortie';
const pose=(x=0,y=10,z=0,heading=0,pitch=0,bank=0):FlightPose=>({position:{x,y,z},heading,pitch,bank});
const box:CollisionBox=[0,0,0,2,2,2],hull=prepareHull([box]);
const wall:Bounds={minX:5,maxX:5.1,minY:0,maxY:20,minZ:-2,maxZ:2};
const neutral={pitch:0,bank:0,throttle:0,fire:false,weapon:'shell' as const};

describe('aircraft contact geometry',()=>{
  it('derives an exact, disjoint voxel hull with the visible pivot offset',()=>{
    expect(voxelCollisionBoxes(source,-2.4)).toEqual(ATTACK_AIRCRAFT_BOXES);
    const occupied=new Set(source.cells.map(c=>c.position.join(','))),covered=new Set<string>();
    for(const [x,y,z,w,h,d] of ATTACK_AIRCRAFT_BOXES){
      const start=[Math.round((x-w/2+8.7)*10),Math.round((y-h/2+2.4)*10),Math.round((z-d/2+8.2)*10)];
      for(let iz=0;iz<Math.round(d*10);iz++)for(let iy=0;iy<Math.round(h*10);iy++)for(let ix=0;ix<Math.round(w*10);ix++){
        const key=[start[0]+ix,start[1]+iy,start[2]+iz].join(',');expect(occupied.has(key)).toBe(true);expect(covered.has(key)).toBe(false);covered.add(key);
      }
    }
    expect(covered.size).toBe(occupied.size);expect(PLAYER_FIXED_HULL.radius).toBeLessThan(9);
  });
  it('transforms hulls exactly like the visible YXZ aircraft at combined attitudes',()=>{
    for(const [heading,pitch,bank] of [[0,0,0],[1.2,.4,-.7],[-2,-.6,1.05]]){
      const p=pose(3,20,-7,heading,pitch,bank),local={x:4,y:-1,z:6};
      const actual=transform(local,p),expected=new Vector3(local.x,local.y,local.z).applyEuler(new Euler(pitch,-heading,-bank,'YXZ')).add(new Vector3(3,20,-7));
      for(const axis of ['x','y','z'] as const)expect(actual[axis]).toBeCloseTo(expected[axis],10);
    }
  });
  it('allows close roof passes and clips wing corners even when the centre misses',()=>{
    const roof={minX:-10,maxX:10,minY:0,maxY:1,minZ:-10,maxZ:10};
    expect(boxContact(box,pose(0,2.01),axes(pose()),roof)).toBe(false);
    expect(boxContact(box,pose(0,2),axes(pose()),roof)).toBe(true);
    const wing:CollisionBox=[0,0,0,8,.2,1],post={minX:3,maxX:3.2,minY:9.5,maxY:10.5,minZ:.1,maxZ:.3};
    expect(boxContact(box,pose(),axes(pose()),post)).toBe(false);expect(boxContact(wing,pose(),axes(pose()),post)).toBe(true);
  });
  it('sweeps to actual contact without a large invisible gap, including reverse travel and overlap',()=>{
    const world={obstacles:()=>[wall]},hit=sweepAircraft(pose(),pose(20),hull,()=>-100,world)!;
    expect(hit.reason).toBe('Obstacle collision');expect(hit.pose.position.x).toBeCloseTo(4,3);
    const reverse=sweepAircraft(pose(10),pose(0),hull,()=>-100,world)!;expect(reverse.pose.position.x).toBeCloseTo(6.1,3);
    expect(sweepAircraft(pose(5),pose(5),hull,()=>-100,world)!.pose.position.x).toBe(5);
  });
  it('detects a wing rotating into terrain without translation',()=>{
    const wing=prepareHull([[0,0,0,8,.2,1]]),from=pose(0,2),to=pose(0,2,0,0,0,Math.PI/3);
    const hit=sweepAircraft(from,to,wing,()=>0,{})!;expect(hit.reason).toBe('Terrain collision');expect(hit.pose.bank).toBeGreaterThan(.45);expect(hit.pose.bank).toBeLessThan(.55);
    expect(sweepAircraft(from,from,wing,()=>0,{})).toBeUndefined();
  });
  it('detects yaw-only tail contact while hovering and a whole wing over a terrain ridge',()=>{
    const tail=prepareHull([[0,0,4,.5,.5,4]]),obstacle={minX:-5,maxX:-4,minY:9,maxY:11,minZ:2,maxZ:3};
    expect(sweepAircraft(pose(),pose(0,10,0,Math.PI/2),tail,()=>-100,{obstacles:()=>[obstacle]})?.reason).toBe('Obstacle collision');
    const wing=prepareHull([[0,0,0,8,.2,2]]);
    expect(sweepAircraft(pose(0,2),pose(0,2),wing,(x,z)=>Math.abs(x-2)<.3&&Math.abs(z)<.3?3:0,{})?.reason).toBe('Terrain collision');
  });
  it('lets both real aircraft hover/pass below old margins but stops on their visible underside',()=>{
    for(const aircraft of ['fixed-wing','helicopter'] as const){
      const s=new Sortie(12012);s.setAircraft(aircraft);s.flight.position={x:16,y:s.ground(16,192)+5,z:192};s.start();s.advance(1/60,neutral);expect(s.flight.state).toBe('running');
      s.flight.position.y=s.ground(16,192)+.5;s.advance(1/60,neutral);expect(s.flight.reason).toBe('Terrain collision');
    }
    expect(Math.min(...HELICOPTER_HULL.points.map(p=>p.y))).toBeCloseTo(-1.6);
  });
  it('keeps depot collision available outside resident chunks and across neighbouring chunk boundaries',()=>{
    const s=new Sortie(12012);s.hordes.resident.clear();
    const bounds={minX:31,maxX:48,minY:-20,maxY:30,minZ:10,maxZ:22};
    expect(s.hordes.obstacles(bounds)).toContainEqual({minX:46,maxX:50,minZ:10,maxZ:22,minY:s.ground(48,16),maxY:s.ground(48,16)+3});
  });
});
