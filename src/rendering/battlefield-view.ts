import { BackSide, BoxGeometry, BufferAttribute, BufferGeometry, Color, DirectionalLight, Fog, Group, HemisphereLight, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, ShaderMaterial, SphereGeometry, Vector3 } from 'three';
import treeSource from '../../assets/source/ref-field-tree.voxel.json';
import pineSource from '../../assets/source/ref-pine-tree.voxel.json';
import { createVoxelMesh } from './voxel-mesh';
import { heightAt } from '../streaming/terrain-data';
import { sceneryRandom, woodland } from './battlefield-surface';
import type { VoxelSource } from '../assets/voxel-source';

/** Derive a 0.4 m foliage LOD; authoritative 0.1 m editable sources stay untouched. */
export function vegetationLod(source: VoxelSource, step=4): VoxelSource {
  const cells = new Map<string, VoxelSource['cells'][number]>();
  for(const cell of source.cells){const position=cell.position.map(n=>Math.floor(n/step)) as [number,number,number];const key=position.join(',');if(!cells.has(key)||cell.palette.startsWith('bark'))cells.set(key,{position,palette:cell.palette});}
  return {...source,id:`${source.id}-lod-${step}`,size:source.size.map(n=>Math.ceil(n/step)) as [number,number,number],cells:[...cells.values()]};
}

/** Fixed-budget atmosphere: one sky, one skyline, shared woodland LODs, one cloud batch. */
export function createBattlefieldView(seed: number) {
  const group = new Group(); group.name = 'autumn-valley';
  const direction = new Vector3(-.35, .27, -.9).normalize();
  const fog = new Fog('#c3b6a2', 150, 1450);
  const sun = new DirectionalLight('#ffe1af', 3.4);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -105, right: 105, top: 105, bottom: -105, near: 1, far: 650 });
  sun.shadow.bias = -.00015; sun.shadow.normalBias = .08; sun.shadow.radius = 3;
  const ambient = new HemisphereLight('#b3cbe7', '#6a6048', 1.4);
  group.add(sun, sun.target, ambient);
  const skyMaterial = new ShaderMaterial({ side: BackSide, depthWrite: false, uniforms: { sunDirection: { value: direction } },
    vertexShader: `varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying vec3 vDirection; uniform vec3 sunDirection;
      void main(){vec3 d=normalize(vDirection);float h=max(d.y,0.0);
        vec3 sky=mix(vec3(.66,.62,.57),vec3(.14,.27,.5),pow(h,.48));
        float s=max(dot(d,sunDirection),0.0);
        sky+=vec3(.43,.25,.1)*pow(s,10.0)+vec3(.85,.5,.21)*pow(s,160.0);
        sky+=vec3(5.0,4.2,2.8)*smoothstep(.9994,.9998,s);
        gl_FragColor=vec4(sky,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
  const skyGeometry = new SphereGeometry(2200, 32, 16), sky = new Mesh(skyGeometry, skyMaterial);
  sky.name = 'sunlit-sky'; sky.renderOrder = -10; sky.frustumCulled = false; group.add(sky);

  // Terraced scenic terrain beyond the collision world. It follows the camera like a skybox.
  const positions:number[]=[],colors:number[]=[],color=new Color();
  const height=(x:number,z:number)=>{const r=Math.hypot(x,z),edge=Math.min(1,Math.max(0,(r-900)/350));return Math.floor((30+(1+Math.sin(x/240+seed)*Math.cos(z/270))*85+Math.sin((x+z)/95)*24)*edge/8)*8-8;};
  const quad=(vertices:number[][],tint:Color)=>{for(const index of [0,1,2,0,2,3]){positions.push(...vertices[index]);colors.push(...tint.toArray());}};
  const top=new Color('#697650'),earth=new Color('#8c8063');
  const step=32;
  for(let x=-2144;x<2144;x+=step)for(let z=-2144;z<2144;z+=step){
    const r=Math.hypot(x,z);if(r<960||r>2144)continue;
    const y=height(x,z),x1=x+step,z1=z+step;
    const haze=Math.min(.75,Math.max(0,(r-1100)/1400));
    color.copy(top).lerp(new Color('#aab2b6'),haze).multiplyScalar(.92+sceneryRandom(seed,x,z)*.13);
    quad([[x,y,z],[x,y,z1],[x1,y,z1],[x1,y,z]],color);
    color.copy(earth).lerp(new Color('#aab2b6'),haze);
    const left=height(x-step,z),right=height(x1,z),back=height(x,z-step),front=height(x,z1);
    if(left<y)quad([[x,left,z],[x,left,z1],[x,y,z1],[x,y,z]],color);
    if(right<y)quad([[x1,right,z1],[x1,right,z],[x1,y,z],[x1,y,z1]],color);
    if(back<y)quad([[x1,back,z],[x,back,z],[x,y,z],[x1,y,z]],color);
    if(front<y)quad([[x,front,z1],[x1,front,z1],[x1,y,z1],[x,y,z1]],color);
  }
  const ridgeGeometry=new BufferGeometry();ridgeGeometry.setAttribute('position',new BufferAttribute(new Float32Array(positions),3));ridgeGeometry.setAttribute('color',new BufferAttribute(new Float32Array(colors),3));ridgeGeometry.computeVertexNormals();ridgeGeometry.computeBoundingSphere();
  const ridgeMaterial=new MeshStandardMaterial({vertexColors:true,roughness:1});
  const ridge=new Mesh(ridgeGeometry,ridgeMaterial);ridge.name='distant-ridgelines';group.add(ridge);

  const tree=createVoxelMesh(vegetationLod(treeSource as VoxelSource)),pine=createVoxelMesh(vegetationLod(pineSource as VoxelSource));
  const farTree=createVoxelMesh(vegetationLod(treeSource as VoxelSource,10)),farPine=createVoxelMesh(vegetationLod(pineSource as VoxelSource,10));
  tree.mesh.geometry.scale(4,4,4);pine.mesh.geometry.scale(4,4,4);farTree.mesh.geometry.scale(10,10,10);farPine.mesh.geometry.scale(10,10,10);
  // Runtime autumn palette; editable reference sources remain intact.
  const leafColors=new Map(tree.source.palette.filter(p=>p.id.startsWith('leaf')).map((p,i)=>[new Color(p.color).getHex(),new Color(['#8c552c','#bf833b','#d6a94e'][i])]));
  for(const asset of [tree,farTree]){const attribute=asset.mesh.geometry.getAttribute('color');for(let i=0;i<attribute.count;i++){color.fromBufferAttribute(attribute,i);const autumn=leafColors.get(color.getHex());if(autumn)attribute.setXYZ(i,autumn.r,autumn.g,autumn.b);}}
  const placements=woodland(seed),dummy=new Object3D();
  const patches=new Map<string,typeof placements>();
  for(const p of placements){const key=`${Number(p.pine)}:${Math.floor(p.x/96)},${Math.floor(p.z/96)}`,items=patches.get(key)??[];items.push(p);patches.set(key,items);}
  const batches=[...patches.values()].map(items=>{
    const asset=items[0].pine?pine:tree,farAsset=items[0].pine?farPine:farTree;
    const centre=new Vector3(items.reduce((s,p)=>s+p.x,0)/items.length,0,items.reduce((s,p)=>s+p.z,0)/items.length);
    const batch=new InstancedMesh(centre.distanceTo(new Vector3(16,0,192))>220?farAsset.mesh.geometry:asset.mesh.geometry,asset.mesh.material,items.length);
    batch.userData={centre,nearGeometry:asset.mesh.geometry,farGeometry:farAsset.mesh.geometry};
    batch.name=items[0].pine?'pine-woodland':'autumn-woodland';batch.castShadow=batch.receiveShadow=true;
    items.sort((a,b)=>sceneryRandom(seed,a.x,a.z)-sceneryRandom(seed,b.x,b.z));
    items.forEach((p,i)=>{dummy.position.set(p.x,heightAt(seed,p.x,p.z)-.1,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.set(1.25,1,1.25);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);batch.setColorAt(i,color.setRGB(p.tint,p.tint,p.tint));});
    batch.computeBoundingSphere(); group.add(batch);return batch;
  });
  const cloudGeometry=new BoxGeometry(),cloudMaterial=new MeshBasicMaterial({vertexColors:true,fog:false});
  const cloudColors=new Float32Array(cloudGeometry.getAttribute('position').count*3),cloudNormals=cloudGeometry.getAttribute('normal');
  for(let i=0;i<cloudNormals.count;i++){color.set(cloudNormals.getY(i)>.5?'#fff6e9':cloudNormals.getY(i)<-.5?'#b4bccb':'#e1dfdf');cloudColors.set(color.toArray(),i*3);}
  cloudGeometry.setAttribute('color',new BufferAttribute(cloudColors,3));
  const clouds=new InstancedMesh(cloudGeometry,cloudMaterial,140);clouds.name='voxel-clouds';
  for(let i=0;i<140;i++){
    const cluster=Math.floor(i/7),r=sceneryRandom(seed,cluster,1),angle=r*Math.PI*2,distance=480+sceneryRandom(seed,cluster,2)*1050;
    const x=Math.cos(angle)*distance+(i%7-3)*27,z=Math.sin(angle)*distance+Math.sin(i*2.4)*24,y=210+sceneryRandom(seed,cluster,3)*70+Math.sin(i*1.7)*8;
    const matrix=new Matrix4().makeScale(35+sceneryRandom(seed,i,4)*48,9+sceneryRandom(seed,i,5)*18,30+sceneryRandom(seed,i,6)*30);matrix.setPosition(x,y,z);clouds.setMatrixAt(i,matrix);
  }
  clouds.computeBoundingSphere();group.add(clouds);
  let disposed=false,low=false;
  return {group,fog,sun,get quality(){return low?'low':'high';},get treeCount(){return batches.reduce((n,b)=>n+b.count,0);},setQuality(reduced:boolean){if(disposed)return;low=reduced;for(const b of batches)b.count=low?Math.ceil(b.instanceMatrix.count*.55):b.instanceMatrix.count;},update(position:Vector3){
    if(disposed)return;for(const batch of batches){const d=Math.hypot(batch.userData.centre.x-position.x,batch.userData.centre.z-position.z);batch.geometry=d>(low?100:220)?batch.userData.farGeometry:batch.userData.nearGeometry;batch.castShadow=!low&&d<180;}sky.position.copy(position);ridge.position.set(position.x,0,position.z);clouds.position.set(position.x,0,position.z);
    sun.target.position.set(Math.round(position.x/16)*16,0,Math.round(position.z/16)*16);sun.position.copy(sun.target.position).addScaledVector(direction,400);
  },dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const b of batches)b.dispose();clouds.dispose();tree.dispose();pine.dispose();farTree.dispose();farPine.dispose();skyGeometry.dispose();skyMaterial.dispose();ridgeGeometry.dispose();ridgeMaterial.dispose();cloudGeometry.dispose();cloudMaterial.dispose();sun.dispose();group.clear();}};
}
