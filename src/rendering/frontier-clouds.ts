import { createCloudNoise,CLOUD_NOISE_SIZE } from './cloud-noise';
import { Frustum,Group,InstancedMesh,Matrix4,Object3D,PlaneGeometry,ShaderMaterial,Sphere,Vector2,Vector3,type Camera } from 'three';
import { regionalHash } from '../world/regional-terrain';
export const CLOUD_CELL=768,CLOUD_RADIUS=5,CLOUD_CAPACITY=968;
/** Stable cloud banks; only their bounded residency follows the player. */
export function cloudCell(seed:number,cx:number,cz:number){
  if(regionalHash(seed,cx,cz,2100)<.12)return [];
  const x=(cx+.2+regionalHash(seed,cx,cz,2101)*.6)*CLOUD_CELL,z=(cz+.2+regionalHash(seed,cx,cz,2102)*.6)*CLOUD_CELL;
  const y=330+regionalHash(seed,cx,cz,2103)*330;
  return Array.from({length:8},(_,i)=>{
    const n=(salt:number)=>regionalHash(seed,cx*8+i,cz,salt);
    return {x:x+(i-3.5)*43,y:y+Math.sin(i*1.9)*35+n(2104)*60,z:z+(n(2105)-.5)*115,
      width:170+n(2106)*130,height:105+n(2107)*115};
  });
}
export function createFrontierClouds(seed:number,options:{textureNoise?:boolean}={}){
  const noiseTexture=options.textureNoise===false?undefined:createCloudNoise();
  const group=new Group(),geometry=new PlaneGeometry(1,1),player={value:new Vector2()},anchor={value:new Vector2()};group.name='procedural-cloud-banks';
  const material=new ShaderMaterial({transparent:true,depthWrite:false,uniforms:{cloudPlayer:player,cloudAnchor:anchor,cloudNoise:{value:noiseTexture}},
    vertexShader:`varying vec2 vUv; varying vec3 vCloud; varying float vFade; uniform vec2 cloudPlayer;uniform vec2 cloudAnchor;
      void main(){vUv=uv;vec3 centre=instanceMatrix[3].xyz;vCloud=centre+vec3(cloudAnchor.x,0.,cloudAnchor.y);
        vFade=1.-smoothstep(2800.,3900.,distance(centre.xz,cloudPlayer));
        vec4 p=modelViewMatrix*vec4(centre,1.);
        p.xy+=position.xy*vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));
        gl_Position=projectionMatrix*p;}`,
    fragmentShader:`varying vec2 vUv;varying vec3 vCloud;varying float vFade;
      uniform highp sampler3D cloudNoise;
      float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        ${noiseTexture?`return texture(cloudNoise,(i+f+.5)/${CLOUD_NOISE_SIZE.toFixed(1)}).r;`:''}
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){vec2 p=(vUv-.5)*2.;float r=dot(p,p);if(r>1.||vFade<.001)discard;
        float depth=sqrt(max(0.,1.-r));vec3 q=vec3(p*2.7,depth*1.8)+mod(vCloud,137.)*.13;
        float n=noise(q)*.57+noise(q*2.1)*.28+noise(q*4.3)*.15;
        float mass=depth*.78+(n-.5)*.8;
        float density=smoothstep(.16,.66,mass);
        float alpha=(1.-exp(-density*4.2))*smoothstep(.05,.32,mass)*vFade;
        if(alpha<.008)discard;
        float rim=pow(1.-depth,3.);
        float light=clamp(.48+p.y*.35+n*.22-depth*.12,0.,1.);
        vec3 color=mix(vec3(.25,.22,.21),vec3(.95,.79,.60),light);
        color+=vec3(.16,.085,.025)*rim;
        gl_FragColor=vec4(color,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  const mesh=new InstancedMesh(geometry,material,CLOUD_CAPACITY),dummy=new Object3D();mesh.frustumCulled=false;mesh.count=0;group.add(mesh);
  const frustum=new Frustum(),projection=new Matrix4();
  const banks:{sphere:Sphere;matrices:Float32Array}[]=[];let selection='';
  let key='',disposed=false,builds=0;
  const compact=(indices:number[])=>{const next=indices.join(',');if(next===selection)return;selection=next;let offset=0;for(const i of indices){mesh.instanceMatrix.array.set(banks[i].matrices,offset);offset+=banks[i].matrices.length;}mesh.count=offset/16;mesh.instanceMatrix.needsUpdate=true;};
  return {group,mesh,get rebuilds(){return builds;},update(x:number,z:number){
    if(disposed)return;const cx=Math.floor(x/CLOUD_CELL),cz=Math.floor(z/CLOUD_CELL),next=`${cx},${cz}`;
    if(next!==key){key=next;builds++;group.position.set(cx*CLOUD_CELL,0,cz*CLOUD_CELL);anchor.value.set(group.position.x,group.position.z);banks.length=0;selection='';let i=0;
      for(let dz=-CLOUD_RADIUS;dz<=CLOUD_RADIUS;dz++)for(let dx=-CLOUD_RADIUS;dx<=CLOUD_RADIUS;dx++){const cells=cloudCell(seed,cx+dx,cz+dz);if(!cells.length)continue;const start=i,center=new Vector3();for(const p of cells)center.add(new Vector3(p.x-group.position.x,p.y,p.z-group.position.z));center.divideScalar(cells.length);let radius=0;for(const p of cells){
        dummy.position.set(p.x-group.position.x,p.y,p.z-group.position.z);dummy.scale.set(p.width,p.height,1);dummy.updateMatrix();mesh.setMatrixAt(i++,dummy.matrix);radius=Math.max(radius,center.distanceTo(dummy.position)+Math.hypot(p.width,p.height)/2);
      }banks.push({sphere:new Sphere(center,radius),matrices:new Float32Array(mesh.instanceMatrix.array.slice(start*16,i*16))});}
      mesh.count=i;selection=banks.map((_,i)=>i).join(',');mesh.instanceMatrix.needsUpdate=true;
    }
    player.value.set(x-group.position.x,z-group.position.z);
  },cull(camera:Camera,enabled=true){
    if(disposed)return;projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(group.matrixWorld);frustum.setFromProjectionMatrix(projection,camera.coordinateSystem,camera.reversedDepth);
    if(!enabled){compact(banks.map((_,i)=>i));return;}
    const visible:number[]=[];for(let i=0;i<banks.length;i++)if(frustum.intersectsSphere(banks[i].sphere))visible.push(i);compact(visible);
  },get bankCount(){return banks.length;},dispose(){if(disposed)return;disposed=true;banks.length=0;mesh.dispose();geometry.dispose();material.dispose();noiseTexture?.dispose();group.removeFromParent();group.clear();}};
}
