import { ACESFilmicToneMapping,BoxGeometry,Color,DirectionalLight,HemisphereLight,Mesh,MeshStandardMaterial,PerspectiveCamera,PlaneGeometry,Scene,WebGLRenderer } from 'three';
import { createBaseView,createEngineExhaust,createRescueView } from '../../../src/rendering/sortie-presentation';
import { createMutantView } from '../../../src/rendering/mutant-view';
import { createFrontierClouds } from '../../../src/rendering/frontier-clouds';
import { Mutants } from '../../../src/hordes/mutants';
import { airbaseHeight } from '../../../src/world/airbase';
import aircraftSource from '../../../assets/source/ref-attack-aircraft.voxel.json';
import { createVoxelMesh } from '../../../src/rendering/voxel-mesh';
const kind=new URL(location.href).searchParams.get('view')??'base',scene=new Scene(),renderer=new WebGLRenderer({antialias:true});renderer.setSize(720,480);renderer.setPixelRatio(1);renderer.toneMapping=ACESFilmicToneMapping;document.body.style.margin='0';document.body.append(renderer.domElement);scene.background=new Color('#b88b67');
const camera=new PerspectiveCamera(58,1.5,.2,5000),light=new DirectionalLight('#ffdfac',3);light.position.set(-100,250,-180);scene.add(light,new HemisphereLight('#c5d2df','#4e5534',2));
const floor=new Mesh(new PlaneGeometry(6000,6000),new MeshStandardMaterial({color:'#596744',roughness:1}));floor.rotation.x=-Math.PI/2;scene.add(floor);
const cube=new BoxGeometry(),mutants=new Mutants(103),bosses=createMutantView(mutants,cube),base=createBaseView(103),rescue=createRescueView(),exhaust=createEngineExhaust(),aircraft=createVoxelMesh(aircraftSource),clouds=createFrontierClouds(103);
if(kind==='base'){const y=airbaseHeight(103);floor.position.y=y;scene.add(base.group);camera.position.set(280,y+220,760);camera.lookAt(0,y,370);}
else if(kind==='boss'){const t=mutants.landmark;floor.position.y=t.ground;bosses.update(t.position.x,t.position.z);scene.add(bosses.group);camera.position.set(t.position.x+100,t.ground+95,t.position.z-155);camera.lookAt(t.position.x,t.ground+65,t.position.z);}
else if(kind==='clouds'){floor.visible=false;clouds.update(0,0);scene.add(clouds.group);camera.position.set(0,160,0);camera.lookAt(0,500,-1500);}
else{scene.add(aircraft.mesh,rescue.group,exhaust.group);aircraft.mesh.position.y=-2.4;exhaust.update(1,1,true);rescue.update({x:0,y:0,z:0},9,()=>0,true);camera.position.set(36,18,65);camera.lookAt(0,3,24);}
renderer.render(scene,camera);
(document.body as HTMLElement).dataset.ready=String(renderer.info.render.triangles>100);
addEventListener('pagehide',()=>{base.dispose();rescue.dispose();exhaust.dispose();aircraft.dispose();bosses.dispose();clouds.dispose();cube.dispose();floor.geometry.dispose();(floor.material as MeshStandardMaterial).dispose();renderer.dispose();},{once:true});
