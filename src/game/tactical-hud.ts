/** Heading-up radar; contacts outside its real range are omitted, never clamped. */
export function radarContact(dx:number,dz:number,heading:number,range=2500){
  if(Math.hypot(dx,dz)>range)return undefined;
  return {x:50+(dx*Math.cos(heading)+dz*Math.sin(heading))/range*44,
    y:50+(dz*Math.cos(heading)-dx*Math.sin(heading))/range*44};
}
export function headingTape(degrees:number){
  const centre=Math.round(degrees/10)*10;
  return Array.from({length:7},(_,i)=>{
    const angle=centre+(i-3)*10,value=(angle%360+360)%360;
    return `<span style="left:${50+(angle-degrees)*1.4}%">${value===0?'N':value===90?'E':value===180?'S':value===270?'W':value.toString().padStart(3,'0')}</span>`;
  }).join('');
}
