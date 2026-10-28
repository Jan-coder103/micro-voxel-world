/** Original static 4 × 3 × 12 m depot; exact legacy obstacle envelope. */
import { writeFileSync } from 'node:fs';
const cells: { position:number[];palette:string }[]=[];
for(let x=0;x<40;x++)for(let y=0;y<30;y++)for(let z=0;z<120;z++){
  if(x>0&&x<39&&y>0&&y<29&&z>0&&z<119)continue;
  let palette=y<3?'foundation':y>=27?'roof':x===0||x===39?(z%12===0?'rib':'wall'):'wall';
  if((z===0||z===119)&&x>=9&&x<31&&y>=3&&y<24)palette=y%4===0?'door-rib':'door';
  if((x===0||x===39)&&z%30>=9&&z%30<23&&y>=17&&y<23)palette=y===17||y===22||z%30===9||z%30===22?'frame':'glass';
  if(y===29)palette=z%12===0?'rib':'roof';
  cells.push({position:[x,y,z],palette});
}
const source={schemaVersion:1,id:'clearpass-depot',name:'Clearpass utility depot',category:'building',units:'metres',voxelSize:.1,size:[40,30,120],pivot:'base-center',orientation:{up:'+Y',front:'-Z'},palette:[['foundation','#66645b'],['wall','#8b9384'],['rib','#bbc0ac'],['roof','#4d5e58'],['door','#434e49'],['door-rib','#6b7770'],['frame','#d0c7a8'],['glass','#344e59']].map(([id,color])=>({id,color,material:'matte'})),cells,tags:['clearpass','static','depot'],provenance:'Original MVW depot by Codex, authored on the 0.1 m lattice to match the existing 4 x 3 x 12 m obstacle.'};
writeFileSync('assets/source/clearpass-depot.voxel.json',JSON.stringify(source)+'\n');
