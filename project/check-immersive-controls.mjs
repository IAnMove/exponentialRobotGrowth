import assert from 'node:assert/strict';
import {bindFirstPerson} from './site-src/immersive/first-person.js';
import {transcriptParts,transcriptIndex} from './site-src/immersive/transcript.js';
class Events {listeners=new Map();addEventListener(k,fn){if(!this.listeners.has(k))this.listeners.set(k,new Set());this.listeners.get(k).add(fn);}removeEventListener(k,fn){this.listeners.get(k)?.delete(fn);}emit(k,e={}){for(const fn of this.listeners.get(k)||[])fn(e);}}
const doc=new Events(),win=new Events(),canvas=new Events(),looks=[],activations=[];let enabled=true,requests=0;
canvas.requestPointerLock=async()=>{requests++;doc.pointerLockElement=canvas;doc.emit('pointerlockchange');};doc.exitPointerLock=()=>{doc.pointerLockElement=null;doc.emit('pointerlockchange');};
const controls=bindFirstPerson({canvas,document:doc,window:win,coarse:false,enabled:()=>enabled,onLook:(x,y)=>looks.push([x,y]),onActivate:(x,y)=>activations.push([x,y])});
canvas.emit('pointermove',{clientX:1,clientY:1});canvas.emit('pointermove',{clientX:2,clientY:2});assert.equal(looks.length,0,'menus remain usable before camera activation');
await controls.request();win.emit('mousemove',{movementX:20,movementY:-3});assert.deepEqual(looks.at(-1),[20,-3]);canvas.emit('pointerup',{});assert.deepEqual(activations.at(-1),[null,null],'pointer-lock clicks raycast through crosshair');
controls.release();assert(!controls.locked());canvas.emit('pointermove',{clientX:12,clientY:12});canvas.emit('pointermove',{clientX:14,clientY:14});assert.equal(looks.length,1,'Escape releases look, not only cursor');
canvas.requestPointerLock=async()=>{throw Error('unsupported');};await controls.request();canvas.emit('pointermove',{clientX:20,clientY:20});assert.equal(looks.length,2,'fallback hover works after rejected capture');controls.release();enabled=false;await controls.request();assert.equal(requests,1);controls.dispose();for(const target of [doc,win,canvas])assert([...target.listeners.values()].every(x=>x.size===0));
const touchCanvas=new Events(),touchLook=[];touchCanvas.setPointerCapture=()=>{};
const touch=bindFirstPerson({canvas:touchCanvas,document:doc,window:win,coarse:true,onLook:(...p)=>touchLook.push(p),onActivate:()=>activations.push('touch')});
touchCanvas.emit('pointerdown',{button:0,pointerType:'touch',clientX:0,clientY:0,pointerId:1});touchCanvas.emit('pointermove',{pointerType:'touch',clientX:20,clientY:10});touchCanvas.emit('pointerup',{clientX:20,clientY:10});assert.equal(touchLook.length,1);assert.notEqual(activations.at(-1),'touch','drag does not trigger narration');touch.dispose();
const clip={text:'all',segments:['first','second'],cues:[{start:0,end:2},{start:2,end:5}]};assert.deepEqual(transcriptParts(clip),['first','second']);assert.equal(transcriptIndex(clip,1.99),0);assert.equal(transcriptIndex(clip,2),1);assert.deepEqual(transcriptParts({text:'One recording.'}),['One recording.']);
console.log('First-person capture, Escape, rejected-lock fallback, touch drag, cleanup and measured transcript boundaries: OK');
