import { BoxGeometry,CylinderGeometry,Group,Mesh,MeshBasicMaterial,MeshStandardMaterial,type Material } from 'three';
/** Created only for FPV. Local metres: pilot eye at origin, nose along -Z. */
export function createCockpit(){
  const group=new Group();group.name='pilot-cockpit';group.position.set(0,.04,-.35);
  const box=new BoxGeometry(1,1,1),dial=new CylinderGeometry(.095,.095,.012,24),dark=new MeshStandardMaterial({color:'#18232b',roughness:.65}),trim=new MeshStandardMaterial({color:'#53626b',metalness:.5,roughness:.35}),glass=new MeshBasicMaterial({color:'#101919'}),lit=new MeshBasicMaterial({color:'#a6efba'});
  const block=(x:number,y:number,z:number,w:number,h:number,d:number,material:Material=dark)=>{const m=new Mesh(box,material);m.position.set(x,y,z);m.scale.set(w,h,d);group.add(m);return m;};
  block(0,-.52,-.92,1.35,.42,.2);block(0,-.28,-.94,1.4,.08,.32);block(-.76,-.35,-.1,.16,.6,1.8);block(.76,-.35,-.1,.16,.6,1.8);
  // Slim canopy frame and windscreen posts leave the gunsight unobstructed.
  for(const x of [-.72,.72]){const post=block(x,.23,-1.1,.035,1.05,.035,trim);post.rotation.z=-x*.28;block(x,.68,-.2,.04,.04,1.85,trim);}
  block(0,.76,-1.04,1.46,.035,.035,trim);
  const needles:Mesh[]=[];
  for(let i=0;i<6;i++){
    const x=(i%3-1)*.29,y=-.39-Math.floor(i/3)*.18;
    const rim=new Mesh(dial,trim);rim.rotation.x=Math.PI/2;rim.position.set(x,y,-.80);group.add(rim);
    const face=new Mesh(dial,glass);face.rotation.x=Math.PI/2;face.scale.setScalar(.86);face.position.set(x,y,-.79);group.add(face);
    for(let t=0;t<8;t++){const a=t*Math.PI/4;const tick=block(x+Math.sin(a)*.067,y+Math.cos(a)*.067,-.777,.009,.018,.006,lit);tick.rotation.z=-a;}
    const pivot=new Group();pivot.position.set(x,y,-.765);group.add(pivot);const needle=new Mesh(box,lit);needle.scale.set(.009,.058,.006);needle.position.y=.023;pivot.add(needle);needles.push(needle);
  }
  block(0,-.73,-.38,.055,.35,.055,trim);block(0,-.57,-.38,.28,.04,.05);block(.56,-.48,-.4,.04,.18,.04,trim);
  let disposed=false;
  return {group,update(speed:number,altitude:number,throttle:number,bank:number,pitch:number,verticalSpeed:number){[speed/100,altitude/2000,throttle,bank/Math.PI,pitch/Math.PI,verticalSpeed/100].forEach((v,i)=>needles[i].parent!.rotation.z=-v*4.5);},dispose(){if(disposed)return;disposed=true;group.removeFromParent();group.clear();box.dispose();dial.dispose();dark.dispose();trim.dispose();glass.dispose();lit.dispose();}};
}
