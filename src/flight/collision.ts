import type { FlightPose, Point } from './flight.ts';

/** Local centre and full size in metres, with the same pivot as the visible airframe. */
export type CollisionBox=readonly [number,number,number,number,number,number];
export interface Bounds { minX:number;maxX:number;minY:number;maxY:number;minZ:number;maxZ:number }
interface PointTree { bounds:Bounds; points?:readonly Point[]; children?:readonly PointTree[] }
export interface Hull { boxes:readonly CollisionBox[];points:readonly Point[];radius:number;terrainTree?:PointTree }
function pointTree(points:Point[]):PointTree {
  const bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};
  for(const p of points){bounds.minX=Math.min(bounds.minX,p.x);bounds.maxX=Math.max(bounds.maxX,p.x);bounds.minY=Math.min(bounds.minY,p.y);bounds.maxY=Math.max(bounds.maxY,p.y);bounds.minZ=Math.min(bounds.minZ,p.z);bounds.maxZ=Math.max(bounds.maxZ,p.z);}
  if(points.length<=24)return {bounds,points};
  const spans=[bounds.maxX-bounds.minX,bounds.maxY-bounds.minY,bounds.maxZ-bounds.minZ],axis=(['x','y','z'] as const)[spans.indexOf(Math.max(...spans))];
  points.sort((a,b)=>a[axis]-b[axis]);const mid=Math.floor(points.length/2);
  return {bounds,children:[pointTree(points.slice(0,mid)),pointTree(points.slice(mid))]};
}
export interface FlightGeometry {
  worldLimit?:number;
  runway?: { contains:(x:number,z:number,margin?:number)=>boolean; height:number; clearance:number };
  fixedWing?:Hull;
  obstacles?:(bounds:Bounds)=>readonly Bounds[];
  /** Authoritative upper bounds, from the world generator; never estimated from a few samples. */
  maxGroundHeight?:number;
  /** Conservative terrain/water ceiling over the entire swept XZ rectangle. */
  groundCeiling?:(bounds:Bounds)=>number;
  maxObstacleHeight?:number;
}
export function prepareHull(boxes:readonly CollisionBox[]):Hull {
  const points=new Map<string,Point>();let radius=0;
  for(const [x,y,z,w,h,d] of boxes){
    const centre=[x,y,z],size=[w,h,d];
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
      const u=(axis+1)%3,v=(axis+2)%3,nu=Math.max(1,Math.ceil(size[u]/.5)),nv=Math.max(1,Math.ceil(size[v]/.5));
      for(let iu=0;iu<=nu;iu++)for(let iv=0;iv<=nv;iv++){
        const p=[...centre];p[axis]+=sign*size[axis]/2;p[u]+=size[u]*(iu/nu-.5);p[v]+=size[v]*(iv/nv-.5);
        const point={x:p[0],y:p[1],z:p[2]};points.set(p.map(n=>n.toFixed(5)).join(','),point);radius=Math.max(radius,Math.hypot(...p));
      }
    }
  }
  const samples=[...points.values()];
  return {boxes,points:samples,radius,terrainTree:pointTree([...samples])};
}
const dot=(a:Point,b:Point)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a:Point,b:Point):Point=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
/** Agrees with Three's YXZ rotation(pitch, -heading, -bank). No renderer dependency. */
export function axes(p:FlightPose):[Point,Point,Point] {
  const sh=Math.sin(p.heading),ch=Math.cos(p.heading),sp=Math.sin(p.pitch),cp=Math.cos(p.pitch),sb=Math.sin(p.bank),cb=Math.cos(p.bank);
  return [{x:ch*cb+sh*sp*sb,y:-cp*sb,z:sh*cb-ch*sp*sb},{x:ch*sb-sh*sp*cb,y:cp*cb,z:sh*sb+ch*sp*cb},{x:-sh*cp,y:-sp,z:ch*cp}];
}
export function transform(p:Point,pose:FlightPose,basis:readonly Point[]=axes(pose)):Point {
  return {x:pose.position.x+p.x*basis[0].x+p.y*basis[1].x+p.z*basis[2].x,y:pose.position.y+p.x*basis[0].y+p.y*basis[1].y+p.z*basis[2].y,z:pose.position.z+p.x*basis[0].z+p.y*basis[1].z+p.z*basis[2].z};
}
const worldAxes:Point[]=[{x:1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:0,z:1}];
/** Full 15-axis OBB/AABB separating-axis test, including corners inside wide wings. */
export function boxContact(box:CollisionBox,pose:FlightPose,basis:readonly Point[],obstacle:Bounds):boolean {
  const centre=transform({x:box[0],y:box[1],z:box[2]},pose,basis);
  // Most voxel boxes are nowhere near this obstacle. Reject before allocating SAT helpers.
  const hx=box[3]/2,hy=box[4]/2,hz=box[5]/2;
  const ex=hx*Math.abs(basis[0].x)+hy*Math.abs(basis[1].x)+hz*Math.abs(basis[2].x);
  const ey=hx*Math.abs(basis[0].y)+hy*Math.abs(basis[1].y)+hz*Math.abs(basis[2].y);
  const ez=hx*Math.abs(basis[0].z)+hy*Math.abs(basis[1].z)+hz*Math.abs(basis[2].z);
  if(centre.x+ex<obstacle.minX-1e-8||centre.x-ex>obstacle.maxX+1e-8||centre.y+ey<obstacle.minY-1e-8||centre.y-ey>obstacle.maxY+1e-8||centre.z+ez<obstacle.minZ-1e-8||centre.z-ez>obstacle.maxZ+1e-8)return false;
  const delta={x:centre.x-(obstacle.minX+obstacle.maxX)/2,y:centre.y-(obstacle.minY+obstacle.maxY)/2,z:centre.z-(obstacle.minZ+obstacle.maxZ)/2};
  const half=[box[3]/2,box[4]/2,box[5]/2],other=[(obstacle.maxX-obstacle.minX)/2,(obstacle.maxY-obstacle.minY)/2,(obstacle.maxZ-obstacle.minZ)/2];
  const separated=(axis:Point)=>Math.abs(dot(delta,axis))>half.reduce((r,h,i)=>r+h*Math.abs(dot(basis[i],axis)),0)+other[0]*Math.abs(axis.x)+other[1]*Math.abs(axis.y)+other[2]*Math.abs(axis.z)+1e-8;
  if(worldAxes.some(separated)||basis.some(separated))return false;
  for(const a of basis)for(const b of worldAxes)if(separated(cross(a,b)))return false;
  return true;
}
export interface Contact { pose:FlightPose;reason:'Terrain collision'|'Obstacle collision'|'World boundary' }
/** Cull spatial groups, retaining every original sample for sections that might touch. */
function treeContact(node:PointTree,pose:FlightPose,basis:readonly Point[],ground:(x:number,z:number)=>number,ceiling:(b:Bounds)=>number,parentCeiling:number):boolean {
  const b=node.bounds,centre=transform({x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2,z:(b.minZ+b.maxZ)/2},pose,basis);
  const hx=(b.maxX-b.minX)/2,hy=(b.maxY-b.minY)/2,hz=(b.maxZ-b.minZ)/2;
  const ex=hx*Math.abs(basis[0].x)+hy*Math.abs(basis[1].x)+hz*Math.abs(basis[2].x),ey=hx*Math.abs(basis[0].y)+hy*Math.abs(basis[1].y)+hz*Math.abs(basis[2].y),ez=hx*Math.abs(basis[0].z)+hy*Math.abs(basis[1].z)+hz*Math.abs(basis[2].z);
  if(centre.y-ey>parentCeiling+1e-7)return false;
  const bounds={minX:centre.x-ex,maxX:centre.x+ex,minY:centre.y-ey,maxY:centre.y+ey,minZ:centre.z-ez,maxZ:centre.z+ez};
  const top=Math.min(parentCeiling,ceiling(bounds));
  if(bounds.minY>top+1e-7)return false;
  if(node.children)return node.children.some(child=>treeContact(child,pose,basis,ground,ceiling,top));
  for(const point of node.points!){const p=transform(point,pose,basis);if(p.y<=top+1e-7&&p.y<=ground(p.x,p.z)+1e-7)return true;}
  return false;
}
export function sweepAircraft(from:FlightPose,to:FlightPose,hull:Hull,ground:(x:number,z:number)=>number,geometry:FlightGeometry):Contact|undefined {
  const r=hull.radius,low=Math.min(from.position.y,to.position.y)-r;
  const bounds={minX:Math.min(from.position.x,to.position.x)-r,maxX:Math.max(from.position.x,to.position.x)+r,minY:low,maxY:Math.max(from.position.y,to.position.y)+r,minZ:Math.min(from.position.z,to.position.z)-r,maxZ:Math.max(from.position.z,to.position.z)+r};
  const terrainCeiling=Math.min(geometry.maxGroundHeight??Infinity,geometry.groundCeiling?.(bounds)??Infinity);
  const terrainPossible=low<=terrainCeiling;
  const obstacles=low<=(geometry.maxObstacleHeight??Infinity)?geometry.obstacles?.(bounds)??[]:[];
  const boundaryPossible=Math.max(Math.abs(bounds.minX+r),Math.abs(bounds.maxX-r),Math.abs(bounds.minZ+r),Math.abs(bounds.maxZ-r))>(geometry.worldLimit??130850);
  if(!terrainPossible&&!obstacles.length&&!boundaryPossible)return;
  const distance=Math.hypot(to.position.x-from.position.x,to.position.y-from.position.y,to.position.z-from.position.z);
  const rotation=r*(Math.abs(to.heading-from.heading)+Math.abs(to.pitch-from.pitch)+Math.abs(to.bank-from.bank));
  const steps=Math.max(1,Math.ceil((distance+rotation)/.1));
  const at=(t:number):FlightPose=>({position:{x:from.position.x+(to.position.x-from.position.x)*t,y:from.position.y+(to.position.y-from.position.y)*t,z:from.position.z+(to.position.z-from.position.z)*t},heading:from.heading+(to.heading-from.heading)*t,pitch:from.pitch+(to.pitch-from.pitch)*t,bank:from.bank+(to.bank-from.bank)*t});
  const contact=(pose:FlightPose):Contact['reason']|undefined=>{
    if(Math.abs(pose.position.x)>(geometry.worldLimit??130850)||Math.abs(pose.position.z)>(geometry.worldLimit??130850))return 'World boundary';
    const basis=axes(pose);
    for(const obstacle of obstacles)for(const box of hull.boxes)if(boxContact(box,pose,basis,obstacle))return 'Obstacle collision';
    if(terrainPossible){
      if(hull.terrainTree&&geometry.groundCeiling){
        if(treeContact(hull.terrainTree,pose,basis,ground,geometry.groundCeiling,terrainCeiling))return 'Terrain collision';
      }else for(const point of hull.points){const p=transform(point,pose,basis);if(p.y<=terrainCeiling&&p.y<=ground(p.x,p.z)+1e-7)return 'Terrain collision';}
    }
  };
  for(let i=0;i<=steps;i++){
    const t=i/steps,reason=contact(at(t));if(!reason)continue;
    let near=Math.max(0,(i-1)/steps),far=t;
    for(let j=0;j<8&&far>near;j++){const mid=(near+far)/2;if(contact(at(mid)))far=mid;else near=mid;}
    const pose=at(far);return {pose,reason:contact(pose)??reason};
  }
}
