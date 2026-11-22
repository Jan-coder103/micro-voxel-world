/** Radial clamp and dead zone keep diagonal touch input bounded and centered. */
export function joystickAxes(x:number,y:number,radius:number){
  const length=Math.hypot(x,y),scale=length>radius?radius/length:1;
  const bank=x*scale/radius,pitch=y*scale/radius;
  return {bank:Math.abs(bank)<.08?0:bank,pitch:Math.abs(pitch)<.08?0:pitch};
}

/** Follow a power setting through the same rate-limited input used by the keyboard. */
export function throttleCommand(target:number|undefined,current:number,dt:number){
  if(target===undefined||dt<=0)return 0;
  if(target===0)return -1; // Idle also holds runway/carrier brakes.
  return Math.max(-1,Math.min(1,(target-current)/(.35*dt)));
}

export function createMobileControls(root:HTMLElement,menu:HTMLDialogElement,wake:()=>void){
  const coarse=matchMedia('(pointer: coarse)'),portrait=matchMedia('(orientation: portrait)');
  const mobile=/Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent)||(navigator.maxTouchPoints>0&&coarse.matches);
  const panel=document.createElement('section');panel.className='mobile-controls';panel.hidden=true;panel.setAttribute('aria-label','Touch flight controls');
  panel.innerHTML='<div class="mobile-power"><label for="touch-throttle">THROTTLE <output id="touch-power">0%</output></label><input id="touch-throttle" aria-label="Throttle" type="range" min="0" max="100" value="0" step="1"><small>0% · BRAKE</small><button id="auto-shoot" aria-pressed="false">Auto-shoot: OFF</button></div><div class="mobile-stick"><span>FLIGHT · PULL DOWN TO CLIMB</span><div id="flight-stick" role="group" aria-label="Flight joystick"><i aria-hidden="true"></i></div></div>';
  root.append(panel);
  const notices=[root,menu].map(parent=>{const el=document.createElement('p');el.className='landscape-notice';el.setAttribute('role','status');el.textContent='For easier flying, rotate your device to landscape.';parent.append(el);return el;});
  root.classList.toggle('mobile-device',mobile);
  if(mobile)root.querySelector('#menu-button')!.textContent='Hangar / Pause';
  const orientation=()=>{for(const el of notices)el.hidden=!mobile||!portrait.matches;wake();};
  portrait.addEventListener('change',orientation);orientation();
  const stick=panel.querySelector<HTMLElement>('#flight-stick')!,knob=stick.querySelector('i')!,slider=panel.querySelector<HTMLInputElement>('input')!,power=panel.querySelector('output')!,shoot=panel.querySelector<HTMLButtonElement>('button')!;
  const state={pitch:0,bank:0,fire:false,target:undefined as number|undefined};
  let pointer:number|undefined;
  const releases:(()=>void)[]=[];
  const on=(el:EventTarget,type:string,handler:EventListener)=>{el.addEventListener(type,handler);releases.push(()=>el.removeEventListener(type,handler));};
  const center=()=>{state.pitch=state.bank=0;knob.style.transform='translate(-50%,-50%)';if(pointer!==undefined&&stick.hasPointerCapture(pointer))stick.releasePointerCapture(pointer);pointer=undefined;wake();};
  const move=(e:PointerEvent)=>{const rect=stick.getBoundingClientRect(),radius=rect.width/2;Object.assign(state,joystickAxes(e.clientX-rect.left-radius,e.clientY-rect.top-rect.height/2,radius));knob.style.transform=`translate(calc(-50% + ${state.bank*radius*.65}px),calc(-50% + ${state.pitch*radius*.65}px))`;wake();};
  on(stick,'pointerdown',event=>{const e=event as PointerEvent;if(pointer!==undefined||e.button!==0)return;e.preventDefault();pointer=e.pointerId;stick.setPointerCapture(pointer);move(e);});
  on(stick,'pointermove',event=>{const e=event as PointerEvent;if(e.pointerId===pointer)move(e);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])on(stick,type,event=>{if((event as PointerEvent).pointerId===pointer)center();});
  on(slider,'input',()=>{state.target=Number(slider.value)/100;power.textContent=`${slider.value}%`;wake();});
  on(shoot,'click',()=>{state.fire=!state.fire;shoot.setAttribute('aria-pressed',String(state.fire));shoot.textContent=`Auto-shoot: ${state.fire?'ON':'OFF'}`;wake();});
  const reset=()=>{center();state.target=undefined;state.fire=false;shoot.setAttribute('aria-pressed','false');shoot.textContent='Auto-shoot: OFF';};
  return {enabled:mobile,state,reset,update(active:boolean,throttle:number){const hidden=!mobile||!active;if(panel.hidden!==hidden)panel.hidden=hidden;if(state.target===undefined){const value=String(Math.round(throttle*100));if(slider.value!==value)slider.value=value;if(power.textContent!==`${value}%`)power.textContent=`${value}%`;}},dispose(){reset();releases.forEach(release=>release());portrait.removeEventListener('change',orientation);panel.remove();notices.forEach(el=>el.remove());root.classList.remove('mobile-device');}};
}
