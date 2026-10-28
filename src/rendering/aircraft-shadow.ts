import { DataTexture, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { FlightPose } from '../flight/flight';

/** A small reusable terrain-conforming blob: visible even with sunlight shadows disabled. */
export function createAircraftShadow() {
  const size=32,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const radius=Math.hypot((x+.5)/size*2-1,(y+.5)/size*2-1),i=(y*size+x)*4;
    data[i]=data[i+1]=data[i+2]=12;data[i+3]=Math.round(Math.pow(Math.max(0,1-radius*radius),1.3)*150);
  }
  const texture=new DataTexture(data,size,size);texture.needsUpdate=true;
  const geometry=new PlaneGeometry(1,1,16,16);geometry.rotateX(-Math.PI/2);
  const local=geometry.attributes.position.array.slice();
  const material=new MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,toneMapped:false});
  const mesh=new Mesh(geometry,material);mesh.name='aircraft-ground-shadow';
  let disposed=false;
  let lastX=NaN,lastZ=NaN,lastHeading=NaN,lastHelicopter=false,lastGround:((x:number,z:number)=>number)|undefined;
  return {mesh,update(pose:FlightPose,ground:(x:number,z:number)=>number,helicopter=false) {
    const p=pose.position,width=helicopter?11:20,length=helicopter?12:18,c=Math.cos(pose.heading),s=Math.sin(pose.heading);
    if(p.x===lastX&&p.z===lastZ&&pose.heading===lastHeading&&helicopter===lastHelicopter&&ground===lastGround)return;
    lastX=p.x;lastZ=p.z;lastHeading=pose.heading;lastHelicopter=helicopter;lastGround=ground;
    mesh.position.set(p.x,ground(p.x,p.z)+.18,p.z);
    const positions=geometry.attributes.position;
    for(let i=0;i<positions.count;i++) {
      const x=local[i*3]*width,z=local[i*3+2]*length,dx=x*c-z*s,dz=x*s+z*c;
      positions.setXYZ(i,dx,ground(p.x+dx,p.z+dz)+.18-mesh.position.y,dz);
    }
    positions.needsUpdate=true;geometry.computeBoundingSphere();
  },dispose(){if(disposed)return;disposed=true;mesh.removeFromParent();geometry.dispose();material.dispose();texture.dispose();}};
}
