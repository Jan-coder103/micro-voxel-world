import { BufferAttribute, BufferGeometry, Mesh, MeshStandardMaterial } from 'three';
import { heightAt } from '../streaming/terrain-data';
type Field={height:number;color:number[];waterDepth?:number};
interface CoverageOptions {
  /** New samples per update after initial coverage; staging leaves the old mesh intact. */
  samplesPerUpdate?:number;
  budgetMs?:number;
  innerExtent?: number;
  innerSpacing?: number;
  drop?: number;
  /** Shared scene material; the coverage mesh never disposes it. */
  material?: MeshStandardMaterial;
}
/** Reused coarse coverage beneath authoritative detail. Collision never samples this mesh. */
export function createTerrainFallback(seed:number, sample?: (x:number,z:number)=>Field, spacing=32, options:CoverageOptions={}){
  const fieldSample:(x:number,z:number)=>Field=sample??((x:number,z:number)=>({height:heightAt(seed,x,z),color:[.41,.47,.29]}));
  const coordinates:number[]=[],extent=16*spacing,inner=options.innerExtent??0,fine=options.innerSpacing??spacing;
  for(let p=-extent;p<-inner;p+=spacing)coordinates.push(p);
  for(let p=-inner;p<=inner;p+=fine)coordinates.push(p);
  for(let p=inner+spacing;p<=extent;p+=spacing)coordinates.push(p);
  const side=coordinates.length,colors=new Float32Array(side*side*3),positions=new Float32Array(side*side*3),depths=new Float32Array(side*side),indices:number[]=[];
  for(let z=0;z<side-1;z++)for(let x=0;x<side-1;x++){const a=z*side+x,b=a+1,c=a+side,d=c+1;indices.push(a,c,b,b,c,d);}
  const geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(positions,3));geometry.setIndex(indices);geometry.setAttribute('waterDepth',new BufferAttribute(depths,1));geometry.setAttribute('color',new BufferAttribute(colors,3));const material=options.material??new MeshStandardMaterial(sample?{vertexColors:true,roughness:1}:{color:'#68784b',roughness:1}),mesh=new Mesh(geometry,material);mesh.receiveShadow=!!options.material;let anchorX=Infinity,anchorZ=Infinity,disposed=false;
  // Absolute sample coordinates retain overlap across recenterings. Only two grids
  // (the last committed grid and the staged replacement) are retained.
  type Cache=Map<number,Map<number,Field>>;
  let cache:Cache=new Map(),build:{x:number;z:number;cursor:number;cache:Cache}|undefined;
  const stagedPositions=positions.slice(),stagedColors=colors.slice(),stagedDepths=depths.slice();
  let requestedX=Infinity,requestedZ=Infinity;
  const snap=spacing*Math.max(1,Math.ceil(64/spacing));
  const update=(x:number,z:number)=>{
    if(disposed)return;
    const ax=Math.floor(x/snap)*snap,az=Math.floor(z/snap)*snap;requestedX=ax;requestedZ=az;
    // A teleport abandons obsolete work; ordinary travel finishes its current grid
    // before targeting the latest anchor, so movement cannot starve publication.
    if(build&&(Math.abs(ax-build.x)>extent/2||Math.abs(az-build.z)>extent/2))build=undefined;
    if(!build){if(ax===anchorX&&az===anchorZ)return;build={x:ax,z:az,cursor:0,cache:new Map()};}
    const initial=!Number.isFinite(anchorX),limit=initial?Infinity:options.samplesPerUpdate??Infinity;
    const deadline=initial||options.budgetMs===undefined?Infinity:performance.now()+options.budgetMs;
    let sampled=0,visited=0;
    while(build.cursor<side*side){
      if(sampled>=limit||visited>0&&visited%32===0&&performance.now()>=deadline)break;
      const vertex=build.cursor++,ix=vertex%side,iz=Math.floor(vertex/side),px=coordinates[ix],pz=coordinates[iz],i=vertex*3,wx=build.x+px,wz=build.z+pz;
      let field=cache.get(wz)?.get(wx);
      if(!field){field=fieldSample(wx,wz);sampled++;}
      let row=build.cache.get(wz);if(!row){row=new Map();build.cache.set(wz,row);}row.set(wx,field);
      stagedPositions[i]=px;stagedPositions[i+1]=field.height-(options.drop??2.5);stagedPositions[i+2]=pz;
      stagedDepths[vertex]=field.waterDepth??1000;stagedColors.set(field.color,i);visited++;
    }
    if(build.cursor<side*side)return;
    positions.set(stagedPositions);colors.set(stagedColors);depths.set(stagedDepths);
    anchorX=build.x;anchorZ=build.z;cache=build.cache;build=undefined;
    mesh.position.set(anchorX,0,anchorZ);geometry.getAttribute('position').needsUpdate=true;geometry.getAttribute('color').needsUpdate=true;geometry.getAttribute('waterDepth').needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
  };update(16,144);
  return {mesh,update,get pending(){return !disposed&&(!!build||anchorX!==requestedX||anchorZ!==requestedZ);},get cachedSamples(){let n=0;for(const row of cache.values())n+=row.size;return n;},dispose(){if(disposed)return;disposed=true;cache.clear();build=undefined;mesh.removeFromParent();geometry.dispose();if(!options.material)material.dispose();}};
}
