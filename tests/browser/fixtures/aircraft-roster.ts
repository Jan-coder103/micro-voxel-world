import { ACESFilmicToneMapping,Color,DirectionalLight,HemisphereLight,Mesh,MeshStandardMaterial,PerspectiveCamera,PlaneGeometry,Scene,WebGLRenderer } from 'three';
import { createPlayerAircraft,PLANE_SOURCES } from '../../../src/rendering/player-aircraft';
import { planeDefinition,type PlaneId } from '../../../src/game/aircraft-roster';
const url=new URL(location.href),id=(url.searchParams.get('plane')??'kestrel') as PlaneId,view=url.searchParams.get('view')??'perspective',def=planeDefinition(id),aircraft=createPlayerAircraft(id);
const scene=new Scene(),renderer=new WebGLRenderer({antialias:true}),camera=new PerspectiveCamera(45,1.5,.1,200);renderer.setSize(720,480);renderer.setPixelRatio(1);renderer.toneMapping=ACESFilmicToneMapping;scene.background=new Color('#bac2b5');document.body.style.margin='0';document.body.append(renderer.domElement);scene.add(aircraft.group);
const sun=new DirectionalLight('#fff0d0',3);sun.position.set(-14,20,-12);scene.add(sun,new HemisphereLight('#c5e0ed','#5d6753',2));
const floor=new Mesh(new PlaneGeometry(200,200),new MeshStandardMaterial({color:'#646d5a'}));floor.rotation.x=-Math.PI/2;floor.position.y=-2.45;scene.add(floor);
if(view==='front'){camera.position.set(0,2,-def.length*2.1);camera.lookAt(0,0,0);}else if(view==='top'){camera.position.set(0,def.length*2.2,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);}else{camera.position.set(def.span*1.2,def.length*.72,-def.length*1.3);camera.lookAt(0,0,0);}
aircraft.update(0,0);renderer.render(scene,camera);document.body.dataset.sample=JSON.stringify({ready:true,id,rotors:aircraft.rotors.length,cells:PLANE_SOURCES[id].cells.length,triangles:renderer.info.render.triangles});
addEventListener('pagehide',()=>{aircraft.dispose();floor.geometry.dispose();(floor.material as MeshStandardMaterial).dispose();renderer.dispose();},{once:true});
