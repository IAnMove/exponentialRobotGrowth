// Pointer lock requires a real user gesture. If unavailable, desktop hover-look
// stays usable; touch retains drag-to-look. No re-capture after Escape.
export function bindFirstPerson({canvas,onLook,onActivate,onState=()=>{},enabled=()=>true,document:doc=document,window:win=window,coarse=matchMedia('(pointer: coarse)').matches}){
 let drag=null,lastHover=null,disposed=false,pending=false,hover=false;const listeners=[];
 const listen=(target,event,fn)=>{target.addEventListener(event,fn);listeners.push(()=>target.removeEventListener(event,fn));};
 const locked=()=>doc.pointerLockElement===canvas;
 const state=()=>onState(locked()?'locked':coarse?'touch':'free');
 async function request(){if(disposed||coarse||!enabled()||locked()||pending)return;pending=true;try{await canvas.requestPointerLock?.();if(!locked())hover=true;}catch{hover=true;state();}finally{pending=false;}}
 listen(doc,'pointerlockchange',()=>{hover=false;drag=null;lastHover=null;state();});
 listen(doc,'pointerlockerror',()=>{hover=true;state();});
 listen(win,'mousemove',e=>{if(enabled()&&locked())onLook(e.movementX,e.movementY);});
 listen(canvas,'pointerdown',e=>{if(!enabled()||e.button!==0||locked())return;drag={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,touch:e.pointerType==='touch',moved:false};if(drag.touch)canvas.setPointerCapture?.(e.pointerId);});
 listen(canvas,'pointermove',e=>{
  if(!enabled()||locked())return;
  if(e.pointerType==='touch'){if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved||=Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>5;if(drag.moved)onLook(dx,dy);drag.x=e.clientX;drag.y=e.clientY;}
  else{if(hover&&lastHover)onLook(e.clientX-lastHover.x,e.clientY-lastHover.y);lastHover={x:e.clientX,y:e.clientY};if(drag)drag.moved||=Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>5;}
 });
 listen(canvas,'pointerup',e=>{if(!enabled())return;if(locked())onActivate(null,null);else if(drag&&!drag.moved){onActivate(e.clientX,e.clientY);if(!drag.touch)request();}drag=null;});
 listen(canvas,'pointercancel',()=>{drag=null;});listen(canvas,'pointerleave',()=>{lastHover=null;drag=null;});
 listen(win,'blur',()=>{lastHover=null;drag=null;});
 state();return {request,locked,release(){hover=false;lastHover=null;if(locked())doc.exitPointerLock?.();},dispose(){disposed=true;listeners.forEach(remove=>remove());if(locked())doc.exitPointerLock?.();}};
}
