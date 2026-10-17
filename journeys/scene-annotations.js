import * as THREE from '../vendor/three.module.js';
import {wrapSceneLabel,layoutSceneLabels} from './label-layout.js';

function annotationVisible(object){for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;}

export function createSceneAnnotations(scene,own,{metadataKey='sceneLabel'}={}){
 const annotations=[];
 function label(g,words,p,width=3,{height=96,bg=true,physical=false,color='#eff7f2'}={}){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=physical?height:384;const ctx=canvas.getContext('2d');
  const texture=own(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;
  const material=own(physical?new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}):new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false,toneMapped:false}));
  const m=physical?new THREE.Mesh(own(new THREE.PlaneGeometry(width,width*height/768)),material):new THREE.Sprite(material);m.position.set(...p);g.add(m);
  if(physical){let previous;const set=text=>{if(text===previous)return;previous=text;ctx.clearRect(0,0,768,height);if(bg){ctx.fillStyle='#142b3aeb';ctx.fillRect(0,0,768,height);}ctx.fillStyle=color;ctx.font='600 65px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';text.split('\n').forEach((line,i,a)=>ctx.fillText(line,384,height*(i+.5)/a.length,740));texture.needsUpdate=true;};set(words);return {m,set};}
  m.renderOrder=51;
  const geometry=own(new THREE.BufferGeometry());geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));
  const leader=new THREE.Line(geometry,own(new THREE.LineBasicMaterial({color:0xb8d3cf,transparent:true,opacity:.65,depthTest:false,depthWrite:false,toneMapped:false})));leader.renderOrder=50;leader.frustumCulled=false;leader.visible=false;scene.add(leader);
  const entry={m,leader,anchor:new THREE.Vector3(...p),canvas,texture,words,color,maxWidth:0,width:0,height:0,painted:null};annotations.push(entry);
  m.userData[metadataKey]={text:words,fontPixels:13,lines:[],layout:null};
  const set=text=>{entry.words=text;m.userData[metadataKey].text=text;};
  return {m,set,anchor:entry.anchor};
 }
 let labelLayoutKey='';
 function layoutLabels(camera,{width,height,obstacles=[]}){
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const maxWidth=Math.max(60,Math.floor(Math.min(244,width-24))),projected=[];
  for(const [id,e] of annotations.entries()){
   const m=e.m,anchor=m.parent.localToWorld(e.anchor.clone()),view=anchor.clone().applyMatrix4(camera.matrixWorldInverse),ndc=anchor.clone().project(camera);
   if(!annotationVisible(m)||view.z>=0||ndc.z< -1||ndc.z>1||Math.abs(ndc.x)>1.05||Math.abs(ndc.y)>1.05){m.material.opacity=0;e.leader.visible=false;m.userData[metadataKey].layout=null;continue;}
   if(e.maxWidth!==maxWidth||e.painted!==e.words){
    const ctx=e.canvas.getContext('2d');ctx.font='600 39px system-ui';
    const lines=e.words.split('\n').flatMap(line=>wrapSceneLabel(line,maxWidth-12,text=>ctx.measureText(text).width/3));
    e.width=Math.ceil(Math.min(maxWidth,Math.max(0,...lines.map(text=>ctx.measureText(text).width/3))+12));e.height=lines.length*18+8;
    ctx.clearRect(0,0,768,384);ctx.fillStyle='#0b202ded';ctx.fillRect(0,0,e.width*3,e.height*3);ctx.fillStyle=e.color;ctx.textAlign='center';ctx.textBaseline='middle';lines.forEach((line,i)=>ctx.fillText(line,e.width*1.5,(13+i*18)*3));
    e.texture.repeat.set(e.width/768*3,e.height/384*3);e.texture.offset.set(0,1-e.height/384*3);e.texture.needsUpdate=true;e.maxWidth=maxWidth;e.painted=e.words;m.userData[metadataKey].lines=lines;
   }
   const y=(1-ndc.y)*height/2;projected.push({id,x:(ndc.x+1)*width/2,y,priority:(e.active?100000:0)+(e.priority??0)+height-y,width:e.width,height:e.height,entry:e,anchor,depth:-view.z});
  }
  const key=JSON.stringify([width,height,obstacles,camera.matrixWorld.elements,camera.projectionMatrix.elements,projected.map(p=>[p.id,p.x,p.y,p.depth,p.width,p.height,p.priority])]);
  if(key===labelLayoutKey)return;labelLayoutKey=key;
  const placed=layoutSceneLabels(projected,{width,height,obstacles});
  for(const p of projected){
   const e=p.entry,m=e.m,box=placed.find(b=>b.id===p.id);if(!box){m.material.opacity=0;e.leader.visible=false;m.userData[metadataKey].layout=null;continue;}
   const center={x:box.x+box.width/2,y:box.y+box.height/2},units=2*p.depth*Math.tan(camera.fov*Math.PI/360)/height;
   const position=new THREE.Vector3(center.x/width*2-1,1-center.y/height*2,p.anchor.clone().project(camera).z).unproject(camera),parentScale=m.parent.getWorldScale(new THREE.Vector3());
   m.position.copy(m.parent.worldToLocal(position.clone()));m.scale.set(box.width*units/Math.abs(parentScale.x),box.height*units/Math.abs(parentScale.y),1);m.material.opacity=1;
   const points=e.leader.geometry.attributes.position;points.setXYZ(0,...p.anchor.toArray());points.setXYZ(1,...position.toArray());points.needsUpdate=true;e.leader.visible=Math.hypot(center.x-p.x,center.y-p.y)>8;
   m.userData[metadataKey].layout={...box,anchorX:p.x,anchorY:p.y};
  }
 }
 return {label,layoutLabels,annotations};
}

export function annotationViewport(host){
  const area=host.getBoundingClientRect(),obstacles=[];
  const elements=[...(host.parentElement?.querySelectorAll('.walk-controls button,#fit-network,.scene-zoom button,#position,.evolution-key,.carbon-key,.carbon-flows,.evolution-process,.electricity-key,.electricity-flows,.nuclear-key,.nuclear-progress,#inspect,.view-help')||[]),...document.querySelectorAll('.atlas-player')];
  for(const element of elements){const r=element.getBoundingClientRect();if(!r.width||!r.height)continue;const x=Math.max(0,r.left-area.left),y=Math.max(0,r.top-area.top),right=Math.min(area.width,r.right-area.left),bottom=Math.min(area.height,r.bottom-area.top);if(right>x&&bottom>y)obstacles.push({x,y,width:right-x,height:bottom-y});}
  return {width:area.width,height:area.height,obstacles};
 }
