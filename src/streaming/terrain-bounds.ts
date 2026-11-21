/** Same AABB-centered sphere as BufferGeometry.computeBoundingSphere, off-thread. */
export interface TerrainBounds { center:[number,number,number];radius:number }
export function terrainBounds(positions:Float32Array):TerrainBounds{
  let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
  for(let i=0;i<positions.length;i+=3){minX=Math.min(minX,positions[i]);maxX=Math.max(maxX,positions[i]);minY=Math.min(minY,positions[i+1]);maxY=Math.max(maxY,positions[i+1]);minZ=Math.min(minZ,positions[i+2]);maxZ=Math.max(maxZ,positions[i+2]);}
  const center:[number,number,number]=positions.length?[(minX+maxX)/2,(minY+maxY)/2,(minZ+maxZ)/2]:[0,0,0];let squared=0;
  for(let i=0;i<positions.length;i+=3)squared=Math.max(squared,(positions[i]-center[0])**2+(positions[i+1]-center[1])**2+(positions[i+2]-center[2])**2);
  return {center,radius:Math.sqrt(squared)};
}
