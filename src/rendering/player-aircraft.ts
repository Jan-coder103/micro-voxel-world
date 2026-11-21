import { Group } from 'three';
import { createVoxelMesh } from './voxel-mesh';
import { validateSource } from '../assets/voxel-source';
import { planeDefinition,type PlaneId } from '../game/aircraft-roster';
import kestrel from '../../assets/source/plane-kestrel.voxel.json';
import mule from '../../assets/source/plane-mule.voxel.json';
import comet from '../../assets/source/plane-comet.voxel.json';
import frontier from '../../assets/source/ref-attack-aircraft.voxel.json';
import spectre from '../../assets/source/plane-spectre.voxel.json';
export const PLANE_SOURCES={kestrel,mule,comet,frontier,spectre};
/** One resident airframe; rotating propellers derive from the same editable occupancy. */
export function createPlayerAircraft(id:PlaneId){
  const def=planeDefinition(id),source=validateSource(PLANE_SOURCES[id]),group=new Group(),parts:ReturnType<typeof createVoxelMesh>[]=[],rotors:Group[]=[];
  group.name=`player-${id}`;
  const propZ=id==='kestrel'?-4.436:-2.8;
  const rotorCells=def.propellers.map(x=>source.cells.filter(c=>['prop','stripe'].includes(c.palette)&&Math.abs((c.position[0]+.5)*.1-source.size[0]*.05-x)<1.4&&Math.abs((c.position[2]+.5)*.1-source.size[2]*.05-propZ)<.16));
  const removed=new Set(rotorCells.flat());
  const body=createVoxelMesh({...source,cells:source.cells.filter(c=>!removed.has(c))});body.mesh.position.y=-def.pivot;body.mesh.castShadow=body.mesh.receiveShadow=true;group.add(body.mesh);parts.push(body);
  rotorCells.forEach((cells,i)=>{if(!cells.length)return;const view=createVoxelMesh({...source,cells}),rotor=new Group(),x=def.propellers[i];view.mesh.position.set(-x,-2.35,-propZ);rotor.position.set(x,2.35-def.pivot,propZ);view.mesh.castShadow=true;rotor.add(view.mesh);group.add(rotor);parts.push(view);rotors.push(rotor);});
  let disposed=false;
  return {group,rotors,id,clearance:.08-Math.min(...source.cells.map(c=>c.position[1]*.1-def.pivot)),update(throttle:number,seconds:number){for(const rotor of rotors)rotor.rotation.z=seconds*(10+throttle*100);},dispose(){if(disposed)return;disposed=true;parts.forEach(p=>p.dispose());group.removeFromParent();group.clear();}};
}
