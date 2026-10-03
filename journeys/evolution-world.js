import * as THREE from '../vendor/three.module.js';
import {sampleEvolution,N} from './evolution-model.js';

export const EVOLUTION_FOCUS=[[-5,1.55,0],[0,3,-1.8],[5,2.8,.5],[0,1.6,0]];
export const evolutionOverview={yaw:.08,pitch:.5,distance:9.5};
const COLORS={A:0xb7e293,B:0xd9a4d3,mutation:0xffbf79,reference:0xf5c885};

export function createEvolutionScene(lesson,es){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x142432);scene.fog=new THREE.Fog(0x142432,42,95);
 const resources=[],targets=[],stands=[],parents=[],offspring=[],links=[],own=x=>(resources.push(x),x);
 const t=(a,b)=>es?a:b,L=(a,b)=>[a,b],number=n=>new Intl.NumberFormat(es?'es':'en',{maximumFractionDigits:2}).format(n);
 const mutationName=event=>event.direction?.split('').join(' → ')||'';
 const mat=(color,extra={})=>own(new THREE.MeshStandardMaterial({color,roughness:.58,metalness:.08,...extra}));
 scene.add(new THREE.HemisphereLight(0xe2f5ff,0x354a42,2.1));
 const sun=new THREE.DirectionalLight(0xffe9cc,3.2);sun.position.set(-7,15,9);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-16,right:16,top:14,bottom:-14,near:.1,far:45});sun.shadow.normalBias=.05;scene.add(sun);resources.push(sun.shadow);
 const fillLight=new THREE.DirectionalLight(0xa6d6ec,1.1);fillLight.position.set(8,6,-6);scene.add(fillLight);
 function mesh(g,geometry,material,p=[0,0,0]){const m=new THREE.Mesh(geometry,material);m.position.set(...p);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
 function box(g,p,size,color,extra){return mesh(g,own(new THREE.BoxGeometry(...size)),mat(color,extra),p);}
 function cylinder(g,p,r,h,color,extra){return mesh(g,own(new THREE.CylinderGeometry(r,r,h,32)),mat(color,extra),p);}
 function label(g,words,p,width=3,{height=96,bg=true}={}){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=height;const ctx=canvas.getContext('2d');
  const texture=own(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;
  const material=own(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false}));const m=new THREE.Sprite(material);m.scale.set(width,width*height/768,1);m.position.set(...p);g.add(m);let previous;
  function set(text){if(text===previous)return;previous=text;ctx.clearRect(0,0,768,height);if(bg){ctx.fillStyle='#142b3aeb';ctx.fillRect(0,0,768,height);}ctx.fillStyle='#eff7f2';ctx.font='600 65px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';const lines=text.split('\n');lines.forEach((line,i)=>ctx.fillText(line,384,height*(i+.5)/lines.length,740));texture.needsUpdate=true;}
  set(words);return {m,set};
 }
 function alleleMaterial(allele){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle=allele==='A'?'#b7e293':'#d9a4d3';ctx.fillRect(0,0,128,128);ctx.fillStyle='#152a30';ctx.font='700 94px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(allele,64,68);const texture=own(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;return own(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false}));}
 const badgeMaterials={A:alleleMaterial('A'),B:alleleMaterial('B')};
 const cellGeo=own(new THREE.SphereGeometry(1,16,12)),locusGeo=own(new THREE.SphereGeometry(.075,12,8)),locusMaterials={A:mat(COLORS.A,{emissive:COLORS.A,emissiveIntensity:.3}),B:mat(COLORS.B,{emissive:COLORS.B,emissiveIntensity:.3})};
 const chromosomeCurve=new THREE.CatmullRomCurve3([[-.15,0,.10],[-.09,.035,.16],[-.03,-.025,.18],[.03,.025,.18],[.09,-.035,.16],[.15,0,.10]].map(p=>new THREE.Vector3(...p)));
 const chromosomeGeo=own(new THREE.TubeGeometry(chromosomeCurve,20,.018,6,false)),chromosomeMat=mat(0xf0ecd5),haloGeo=own(new THREE.TorusGeometry(.32,.025,6,28));
 function cell(g,p,allele,index){
  const group=new THREE.Group();group.position.set(...p);g.add(group);const material=mat(COLORS[allele],{transparent:true,opacity:.84,roughness:.43});const body=mesh(group,cellGeo,material);body.scale.set(.29,.16,.22);
  const chromosome=mesh(group,chromosomeGeo,chromosomeMat,[0,.025,0]);const locus=mesh(group,locusGeo,locusMaterials[allele],[0,.045,.16]);
  const badge=new THREE.Sprite(badgeMaterials[allele]);badge.position.set(0,.24,0);badge.scale.set(.23,.23,1);group.add(badge);
  const halo=mesh(group,haloGeo,mat(COLORS.mutation,{emissive:COLORS.mutation,emissiveIntensity:.6,transparent:true,opacity:.85}),[0,.025,0]);halo.rotation.x=Math.PI/2;halo.visible=false;
  const record={group,body,chromosome,locus,badge,halo,index,allele,id:null};body.userData.cell=record;targets.push(body);
  return record;
 }
 function setAllele(record,allele){record.allele=allele;record.body.material.color.setHex(COLORS[allele]);record.locus.material=locusMaterials[allele];record.badge.material=badgeMaterials[allele];}
 // A laboratory provides context; the capsules are schematic haploid organisms.
 box(scene,[0,-.16,0],[27,.3,23],0x263d48);const grid=new THREE.GridHelper(26,26,0x547278,0x3a5661);resources.push(grid.geometry,grid.material);grid.position.y=.005;scene.add(grid);
 box(scene,[0,.85,0],[23,.25,7.4],0x78908d,{roughness:.38,metalness:.2});box(scene,[0,.98,0],[23.1,.035,7.5],0xa2b2a6,{roughness:.32});
 for(const x of [-10.5,10.5])for(const z of [-2.9,2.9])box(scene,[x,.36,z],[.32,.9,.32],0x78939d,{metalness:.7,roughness:.3});
 // No background wall obscures the cohort or the path of a copy.
 const railMat=mat(0x647d8a,{metalness:.7,roughness:.3});for(const x of [-11.5,11.5])mesh(scene,own(new THREE.CylinderGeometry(.075,.075,6,12)),railMat,[x,3,-4.7]);
 box(scene,[0,5.8,-4.7],[23,.12,.18],0x648595,{metalness:.6});box(scene,[0,5.65,-4.7],[16,.08,.1],0xcce9e7,{emissive:0xa4d5d5,emissiveIntensity:.8});
 const dishes=[];
 for(const x of [-5,5]){
  cylinder(scene,[x,1.04,0],3.4,.10,0x304955,{metalness:.25});cylinder(scene,[x,1.12,0],3.27,.06,0x96b9a2,{roughness:.45});
  const rim=mesh(scene,own(new THREE.TorusGeometry(3.35,.055,10,80)),mat(0xc8e2e1,{transparent:true,opacity:.62,metalness:.3,roughness:.2}),[x,1.23,0]);rim.rotation.x=Math.PI/2;rim.castShadow=false;
  const glass=cylinder(scene,[x,1.17,0],3.37,.20,0xb7dce3,{transparent:true,opacity:.1,depthWrite:false,roughness:.2});glass.castShadow=false;dishes.push({rim,glass});
 }
 const parentsGroup=new THREE.Group(),offspringGroup=new THREE.Group();scene.add(parentsGroup,offspringGroup);
 const position=(i,x)=>new THREE.Vector3(x-2.7+(i%10)*.6,1.37,-1.4+Math.floor(i/10)*.7);
 for(let i=0;i<N;i++){parents.push(cell(parentsGroup,position(i,-5).toArray(),i<N/2?'A':'B',i));const c=cell(offspringGroup,position(i,5).toArray(),i<N/2?'A':'B',i);c.group.visible=false;offspring.push(c);}
 const parentCaption=label(scene,'',[-5,1.8,3.45],6.6,{height:144}),offspringCaption=label(scene,'',[5,1.8,3.45],6.6,{height:144});
 const locusCaption=label(scene,t('UN LOCUS · A / B','ONE LOCUS · A / B'),[-5,2.15,-3.5],4.5);
 // Microscope, slides and a pipette anchor the enlarged alleles to a lab example.
 const microscope=new THREE.Group();microscope.position.set(-9.4,1.05,-2.7);scene.add(microscope);
 box(microscope,[0,.10,0],[1.4,.18,1],0x435f71,{metalness:.5});box(microscope,[.43,.85,-.3],[.28,1.4,.3],0xb2c2c5,{metalness:.6});box(microscope,[0,.75,0],[1,.12,.75],0x2e4453);
 const barrel=cylinder(microscope,[0,1.45,0],.20,.8,0xb5c5c8,{metalness:.65});barrel.rotation.z=-.24;cylinder(microscope,[.1,1.95,0],.24,.22,0x293c4b);box(microscope,[0,.83,0],[.70,.035,.27],0xc9e7e2,{transparent:true,opacity:.7});
 for(let i=0;i<4;i++)box(scene,[-10.2+i*.35,1.025,2.5],[.27,.025,.70],0xc5d9d6,{transparent:true,opacity:.7});
 const pipette=cylinder(scene,[10.1,1.25,1.8],.09,1.4,0xdce4e1);pipette.rotation.z=-.9;
 const exampleGroup=new THREE.Group();scene.add(exampleGroup);const examples=[cell(exampleGroup,[-1.05,1.9,.6],'A','example-A'),cell(exampleGroup,[1.05,1.9,.6],'B','example-B')];examples.forEach(c=>{c.group.scale.setScalar(2.2);c.body.userData.info=L('Detalle ampliado de un organismo haploide esquemático. La letra marca una variante de un único locus; no es una especie.','Enlarged schematic haploid organism. The letter marks a variant at one locus; it is not a species.');});
 label(exampleGroup,t('A / B · detalle ampliado','A / B · enlarged detail'),[0,1.35,.6],3.8);
 // Magnify one recorded copy, not an invented mutation at every positive rate.
 const spotlightGroup=new THREE.Group();spotlightGroup.position.set(5,3.05,0);scene.add(spotlightGroup);
 const spotlightParent=cell(spotlightGroup,[-1.05,0,0],'A','spotlight-parent'),spotlightDaughter=cell(spotlightGroup,[1.05,0,0],'A','spotlight-daughter');
 spotlightParent.group.scale.setScalar(2.5);spotlightDaughter.group.scale.setScalar(2.5);
 box(spotlightGroup,[0,-.45,0],[3.7,.07,.9],0x365669,{metalness:.4});
 const spotlightCaption=label(spotlightGroup,'',[0,1.05,0],6.5,{height:144}),spotlightOrigin=label(spotlightGroup,t('progenitor','parent'),[-1.05,.66,0],1.65),spotlightCopy=label(spotlightGroup,t('copia','copy'),[1.05,.66,0],1.65);
 const copyCurve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-1.05,.05,.26),new THREE.Vector3(0,.45,.26),new THREE.Vector3(1.05,.05,.26));
 const copyPath=mesh(spotlightGroup,own(new THREE.TubeGeometry(copyCurve,24,.018,6,false)),mat(0xd1ded0,{transparent:true,opacity:.6}));
 const copyMarker=mesh(spotlightGroup,own(new THREE.SphereGeometry(.075,12,8)),mat(COLORS.A,{emissive:COLORS.A,emissiveIntensity:.8}));copyMarker.visible=false;
 let spotlightEvent=null;
 // Relative reproductive weights and probabilities are distinct from actual counts.
 const selectionPanel=new THREE.Group();selectionPanel.position.set(0,0,-2.3);scene.add(selectionPanel);
 box(selectionPanel,[0,3.15,-.12],[4.3,3.35,.18],0x203d4e,{metalness:.35});label(selectionPanel,t('REPRODUCCIÓN PONDERADA','WEIGHTED REPRODUCTION'),[0,4.55,.05],4.1);
 const weightCaption=label(selectionPanel,'',[0,4.12,.08],3.9),selectedCaption=label(selectionPanel,'',[0,3.53,.08],3.9),mutatedCaption=label(selectionPanel,'',[0,2.6,.08],3.9);
 function probabilityBar(g,y){box(g,[0,y,0],[3.45,.19,.06],0x3d5869);const a=box(g,[-1.725,y,.06],[3.45,.22,.08],COLORS.A),b=box(g,[1.725,y,.06],[3.45,.22,.08],COLORS.B);return {a,b,width:3.45};}
 const selectedBar=probabilityBar(selectionPanel,3.13),mutatedBar=probabilityBar(selectionPanel,2.20);
 function paintBar(bar,value){const f=Math.max(0,Math.min(1,value));bar.a.scale.x=f;bar.a.position.x=-bar.width/2+bar.width*f/2;bar.b.scale.x=1-f;bar.b.position.x=bar.width*f/2;}
 const processCaption=label(scene,'',[0,4.75,.45],7,{height:128});
 // Inspectable parent-to-copy paths are rebuilt from recorded events, never from RNG.
 for(let i=0;i<N;i++){
  const geometry=own(new THREE.BufferGeometry());geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(13*3),3));
  const line=new THREE.Line(geometry,own(new THREE.LineBasicMaterial({color:0xbfd9d5,transparent:true,opacity:.4})));line.visible=false;scene.add(line);targets.push(line);links.push({line,m:line,curve:null,event:null,parentIndex:null});
 }
 // A small laboratory monitor compares completed generations with the no-drift reference.
 const monitor=new THREE.Group();monitor.position.set(5.3,0,-3.7);scene.add(monitor);box(monitor,[0,3.72,0],[6.7,3.2,.22],0x284252,{metalness:.4});box(monitor,[0,3.72,.13],[6.4,2.95,.03],0x132735,{roughness:.75});
 label(monitor,t('FRACCIÓN A · ENTRE GENERACIONES','A FRACTION · ACROSS GENERATIONS'),[0,4.95,.19],6.2);label(monitor,t('verde: realización · amarillo: referencia sin deriva','green: realization · yellow: no-drift reference'),[0,2.42,.19],6.2);
 const plotWidth=5.9,plotHeight=1.8,plotLeft=-2.95,plotBottom=2.87,plotZ=.19,plotLines=[];
 for(const color of [COLORS.A,COLORS.reference]){const geometry=own(new THREE.BufferGeometry());geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(81*3),3));const line=new THREE.Line(geometry,own(new THREE.LineBasicMaterial({color})));monitor.add(line);plotLines.push(line);}
 const axes=own(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(plotLeft,plotBottom+plotHeight,plotZ),new THREE.Vector3(plotLeft,plotBottom,plotZ),new THREE.Vector3(plotLeft+plotWidth,plotBottom,plotZ)]));monitor.add(new THREE.Line(axes,own(new THREE.LineBasicMaterial({color:0x8ca3ae}))));
 const cursor=box(monitor,[plotLeft,plotBottom+plotHeight/2,plotZ],[.018,plotHeight,.02],0xe7eee3,{emissive:0xb7c5c5,emissiveIntensity:.35});
 const expectedGroup=new THREE.Group();expectedGroup.position.set(5,0,0);scene.add(expectedGroup);box(expectedGroup,[0,1.75,0],[6.2,1.8,.15],0x213e4d);
 const expectedCaption=label(expectedGroup,'',[0,2.30,.12],5.9),expectedBar=probabilityBar(expectedGroup,1.85);label(expectedGroup,t('Fracción continua · no 50 cuerpos redondeados','Continuous fraction · no rounded 50 bodies'),[0,1.33,.12],5.8);
 const standsGroup=new THREE.Group();scene.add(standsGroup);
 for(let i=0;i<4;i++){const x=[-9,-3,3,9][i],z=8.5;box(standsGroup,[x,.52,z],[1.65,1.04,.75],0x314f61);box(standsGroup,[x,1.09,z],[1.8,.10,.95],0x7e999e);const button=box(standsGroup,[x,1.22,z+.12],[.8,.20,.5],0xb7e8c3,{emissive:0x88cda6,emissiveIntensity:.45});button.userData.action=i;button.userData.info=L('Escuchar esta etapa.','Listen to this chapter.');targets.push(button);stands.push(button);label(standsGroup,`${i+1} · ${(es?['VARIACIÓN','REPRODUCCIÓN','MUTACIÓN','DERIVA']:['VARIATION','REPRODUCTION','MUTATION','DRIFT'])[i]}`,[x,.68,z+.46],1.55);label(standsGroup,t('▶ ESCUCHAR','▶ LISTEN'),[x,1.48,z+.25],1.05);}
 let lastState,traceId,preparedGeneration=-1,lastPlot=-1;
 function prepare(s){
  const generation=s.generation??s.t;
  if(preparedGeneration===generation&&traceId===currentTrace)return;
  preparedGeneration=generation;traceId=currentTrace;
  const finite=Array.isArray(s.cohort),indexById=new Map((s.cohort||[]).map((c,i)=>[c.id,i]));
  parents.forEach((record,i)=>{const individual=s.cohort?.[i],event=s.events?.[i];record.group.visible=!!individual;record.group.position.copy(position(i,-5));record.group.scale.setScalar(1);record.halo.visible=!!event?.mutated;if(individual){record.id=individual.id;setAllele(record,individual.allele);record.body.userData.event=event||null;record.body.userData.info=L(`Generación ${generation} · organismo ${i+1}. Variante ${individual.allele}; un locus haploide.${event?.mutated?' Surgió de una copia con mutación '+mutationName(event)+'.':''}`,`Generation ${generation} · organism ${i+1}. Variant ${individual.allele}; one haploid locus.${event?.mutated?' It arose from a copy with mutation '+mutationName(event)+'.':''}`);}});
  links.forEach((link,i)=>{const event=s.next?.events?.[i],parentIndex=event?indexById.get(event.parentId):undefined;link.event=event||null;link.parentIndex=parentIndex;link.curve=null;
   if(!finite||!event||parentIndex===undefined){link.line.visible=false;return;}
   const start=position(parentIndex,-5).add(new THREE.Vector3(0,.1,0)),end=position(i,5),mid=start.clone().add(end).multiplyScalar(.5);mid.y=3.1+(i%5)*.085;
   const curve=new THREE.QuadraticBezierCurve3(start,mid,end);link.curve=curve;const array=link.line.geometry.attributes.position;for(let j=0;j<13;j++){const point=curve.getPoint(j/12);array.setXYZ(j,point.x,point.y,point.z);}array.needsUpdate=true;link.line.geometry.computeBoundingSphere();
   link.line.userData.event=event;link.line.userData.info=L(`Copia ${i+1}: progenitor ${event.parentAllele} → descendiente ${event.allele}. ${event.mutated?'Mutación '+mutationName(event)+'.':'Sin mutación.'} Esta conexión procede del evento registrado.`,`Copy ${i+1}: parent ${event.parentAllele} → offspring ${event.allele}. ${event.mutated?'Mutation '+mutationName(event)+'.':'No mutation.'} This connection comes from the recorded event.`);
  });
 }
 let currentTrace;
 function update(model,time=0,phase=0,whole=false,immersive=false){
  currentTrace=model.trace;const s=sampleEvolution(currentTrace,Number.isFinite(time)?time:0);lastState=s;prepare(s);
  const generation=s.generation??s.t,finite=Array.isArray(s.cohort),next=s.next,p=Math.max(0,Math.min(1,s.progress??0)),copied=Math.max(0,Math.min(1,(p-.4)/.3)),mutationStage=p>=.72;
  parentsGroup.visible=finite;offspringGroup.visible=finite&&!!next;expectedGroup.visible=!finite&&(whole||phase===2||phase===3);exampleGroup.visible=phase===0||phase===1;
  exampleGroup.position.set(phase===0?-5:0,phase===0?1.7:0,phase===0?-2.8:0);
  selectionPanel.visible=whole||phase===1;monitor.visible=whole||phase===3;
  parentCaption.m.position.y=offspringCaption.m.position.y=immersive?.6:1.8;parentCaption.m.visible=whole||phase===0||phase===3;offspringCaption.m.visible=whole||phase===2||phase===3;locusCaption.m.visible=whole||phase===0;
  processCaption.m.visible=whole;processCaption.m.position.set(0,5.35,-.8);
  const selected=next?.selected??s.selected??s.frequency,mutated=next?.mutated??s.mutated??s.frequency;
  weightCaption.set(t('Peso A: ','A weight: ')+number(1+(model.advantage??currentTrace.params?.advantage??0))+' · B: 1');
  selectedCaption.set(t('Tras selección · A ','After selection · A ')+number(selected*100)+'%');mutatedCaption.set(t('Tras mutación · A ','After mutation · A ')+number(mutated*100)+'%');paintBar(selectedBar,selected);paintBar(mutatedBar,mutated);
  parentCaption.set(finite?t(`Generación ${generation} · ${s.countA} A / ${N-s.countA} B\n${N} progenitores`, `Generation ${generation} · ${s.countA} A / ${N-s.countA} B\n${N} parents`):t(`Generación ${generation} · referencia sin deriva\nA: ${number(s.frequency*100)}%`,`Generation ${generation} · no-drift reference\nA: ${number(s.frequency*100)}%`));
  offspringCaption.set(!next?t('Horizonte alcanzado · 80 generaciones','Horizon reached · 80 generations'):finite?t(`Generación ${generation+1} · en formación\n${p<.72?'Copias antes de mutación':`${next.countA} A / ${N-next.countA} B · ${next.mutations} ${next.mutations===1?'mutación':'mutaciones'}`}`,`Generation ${generation+1} · forming\n${p<.72?'Copies before mutation':`${next.countA} A / ${N-next.countA} B · ${next.mutations} ${next.mutations===1?'mutation':'mutations'}`}`):t('Referencia determinista · no población observada','Deterministic reference · not an observed population'));
  const stage=phase===0?t('Variación heredable','Heritable variation'):!next?t('Generación completada','Generation complete'):p<.4?t('1 · Ponderar reproducción','1 · Weight reproduction'):p<.72?t('2 · Copiar al descendiente','2 · Copy to offspring'):p<.94?t('3 · Cambiar solo las copias que mutan','3 · Change only the copies that mutate'):t('4 · Sustituir la generación · población fija','4 · Replace generation · fixed population');processCaption.set(stage);
  offspring.forEach((record,i)=>{const link=links[i],event=link.event;record.group.visible=finite&&!!next&&!!event&&!!link.curve&&p>=.4;record.halo.visible=false;link.line.visible=finite&&!!next&&!!link.curve&&p>.02;link.line.material.opacity=phase===1?.54:phase===2?.38:.20;link.line.material.color.setHex(mutationStage&&event?.mutated?COLORS.mutation:0xa9c9c5);
   if(!record.group.visible)return;
   record.id=event.id;setAllele(record,mutationStage?event.allele:event.parentAllele);record.group.position.copy(link.curve.getPoint(copied));record.group.scale.setScalar(.08+.92*Math.min(1,copied*1.8));record.halo.visible=mutationStage&&event.mutated;
   record.body.userData.event=event;record.body.userData.info=L(`Descendiente ${i+1} de la generación ${generation+1}. Copia del progenitor ${event.parentAllele}. ${mutationStage?(event.mutated?'Mutación '+mutationName(event)+'.':'Copia sin mutación.'):'La fase de mutación todavía no se ha mostrado.'}`,`Offspring ${i+1} of generation ${generation+1}. Copy from parent ${event.parentAllele}. ${mutationStage?(event.mutated?'Mutation '+mutationName(event)+'.':'Copy without mutation.'):'The mutation stage has not been shown yet.'}`);
  });
  const pendingMutation=next?.events?.find(event=>event.mutated),completedMutation=s.events?.find(event=>event.mutated);
  spotlightEvent=p>.001&&phase===2?(pendingMutation||next?.events?.[0]||null):(completedMutation||null);
  spotlightGroup.visible=finite&&!!spotlightEvent&&(phase===2||phase===3);
  if(spotlightGroup.visible){
   const completed=spotlightEvent===completedMutation,event=spotlightEvent,revealed=completed||mutationStage;
   setAllele(spotlightParent,event.parentAllele);setAllele(spotlightDaughter,revealed?event.allele:event.parentAllele);spotlightDaughter.halo.visible=revealed&&event.mutated;
   spotlightDaughter.group.visible=completed||p>=.4;spotlightDaughter.group.scale.setScalar(2.5*(completed?1:.1+.9*Math.min(1,copied*1.8)));
   copyMarker.visible=!completed&&p>=.4&&p<.72;copyPath.visible=!completed&&p<.72;if(copyMarker.visible){copyMarker.material.color.setHex(COLORS[event.parentAllele]);copyMarker.material.emissive.setHex(COLORS[event.parentAllele]);copyMarker.position.copy(copyCurve.getPoint(Math.min(1,(p-.4)/.32)));}
   const destination=completed?generation:generation+1,index=event.index??0;
   const direction=event.direction?.split('').join(' → '),noMutations=(completed?s.mutations:next?.mutations)===0;
   const result=revealed?(event.mutated?t('Mutación ','Mutation ')+direction:noMutations?t('Sin mutaciones registradas','No mutations recorded'):t('Copia sin mutación','Copy without mutation')):t('Ampliación · antes de mutar','Enlarged detail · before mutation');
   spotlightCaption.set(t(`Progenitor ${Number(event.parentId.split(':')[1])+1} → copia ${index+1}`,`Parent ${Number(event.parentId.split(':')[1])+1} → copy ${index+1}`)+'\n'+result);
   const info=L(`Ampliación de la copia ${index+1} registrada para la generación ${destination}. ${revealed?(event.mutated?'Mutación '+direction+'.':'Sin mutación.'):'Todavía conserva la variante de su progenitor.'}`,`Enlarged view of recorded copy ${index+1} for generation ${destination}. ${revealed?(event.mutated?'Mutation '+direction+'.':'No mutation.'):'It still carries its parent variant.'}`);
   for(const record of [spotlightParent,spotlightDaughter]){record.body.userData.event=event;record.body.userData.info=info;}
  }
  expectedCaption.set(t('A: ','A: ')+number(s.frequency*100)+'% · B: '+number((1-s.frequency)*100)+'%');paintBar(expectedBar,s.frequency);
  const plotGeneration=Math.min(80,Math.max(0,Math.floor(generation)));
  if(lastPlot!==plotGeneration||traceId!==plotTrace){
   lastPlot=plotGeneration;plotTrace=traceId;const states=currentTrace.generations||[];
   plotLines.forEach((line,k)=>{const attribute=line.geometry.attributes.position;for(let g=0;g<=plotGeneration;g++){const fallback=states[g]?.frequency??s.frequency,value=k===0?fallback:(currentTrace.reference?.[g]??(model.series?.[1]?.values[g]??fallback*100)/100);attribute.setXYZ(g,plotLeft+g/80*plotWidth,plotBottom+Math.max(0,Math.min(1,value))*plotHeight,plotZ+.015*k);}attribute.needsUpdate=true;line.geometry.setDrawRange(0,plotGeneration+1);line.geometry.computeBoundingSphere();});
  }
  cursor.position.x=plotLeft+plotGeneration/80*plotWidth;plotLines[0].visible=finite;stands.forEach((button,i)=>button.material.emissiveIntensity=i===phase?1:.16);
 }
 let plotTrace;
 return {scene,resources,targets,stands,standsGroup,parents,offspring,links,cohortmeshes:{parents,offspring},parentsGroup,offspringGroup,expectedGroup,exampleGroup,selectionPanel,selectedBar,mutatedBar,expectedBar,parentCaption,offspringCaption,processCaption,dishes,monitor,spotlight:{group:spotlightGroup,parent:spotlightParent,daughter:spotlightDaughter,marker:copyMarker,get event(){return spotlightEvent;}},outlines:[],focus:EVOLUTION_FOCUS,update,get state(){return lastState;}};
}

function visible(object){for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;}
const BOUNDS=[[-8.9,.8,-4.1,-1.1,4.7,3.8],[-3.7,1,-3.3,3.7,5.0,2.7],[1.1,.8,-4.1,8.9,5.2,3.8],[-11.8,0,-5,11.8,6,4.4]];
// Fit the projected box, including depth, rather than multiplying a desktop distance.
export function evolutionFraming(phase,orbit,aspect,fov){
 const whole=orbit.whole===true,index=whole?3:phase,center=new THREE.Vector3(...EVOLUTION_FOCUS[index]),yaw=orbit.yaw??.08,pitch=orbit.pitch??.5;
 const direction=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),up=new THREE.Vector3(-Math.sin(yaw)*Math.sin(pitch),Math.cos(pitch),-Math.cos(yaw)*Math.sin(pitch));
 const bounds=BOUNDS[index],tan=Math.tan(fov*Math.PI/360);let distance=4;
 for(const x of [bounds[0],bounds[3]])for(const y of [bounds[1],bounds[4]])for(const z of [bounds[2],bounds[5]]){const p=new THREE.Vector3(x,y,z).sub(center),depth=p.dot(direction);distance=Math.max(distance,depth+Math.abs(p.dot(right))/(tan*Math.max(.1,aspect)),depth+Math.abs(p.dot(up))/tan);}
 distance*=1.10*(orbit.distance??evolutionOverview.distance)/evolutionOverview.distance;
 return {center,distance,direction};
}
export function createEvolutionWorld(host,lesson,es,onInspect){
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;host.append(renderer.domElement);renderer.domElement.tabIndex=0;
 const built=createEvolutionScene(lesson,es),camera=new THREE.PerspectiveCamera(46,1,.1,120),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();ray.params.Line.threshold=.09;let model,phase=0;
 function resize(){renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.fov=camera.aspect<1?65:46;camera.updateProjectionMatrix();}const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function nearest(player){let best=null,distance=5.8;built.stands.forEach((stand,i)=>{const p=stand.getWorldPosition(new THREE.Vector3()),d=Math.hypot(player.x-p.x,player.z-p.z);if(d<distance){best=i;distance=d;}});return best;}
 function hit(x,y){const r=renderer.domElement.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2);ray.setFromCamera(pointer,camera);return ray.intersectObjects(built.targets.filter(visible))[0];}
 return {canvas:renderer.domElement,update(s,i){model=s;phase=i;},render(player,dt,animation,orbit,mode,time){
  if(model)built.update(model,time,phase,mode==='web'&&orbit.whole===true,mode==='immersive');built.standsGroup.visible=mode==='immersive';
  if(mode==='immersive'){camera.position.set(player.x,1.65,player.z);camera.rotation.set(player.pitch,player.yaw,0,'YXZ');}
  else{const framing=evolutionFraming(phase,orbit,camera.aspect,camera.fov);camera.position.copy(framing.center).addScaledVector(framing.direction,framing.distance);camera.lookAt(framing.center);}renderer.render(built.scene,camera);
 },inspect(x,y){const h=hit(x,y);if(h)onInspect(h.object.userData.action===undefined?h.object.userData.info:{chapter:h.object.userData.action});},nearest,activate(){const r=renderer.domElement.getBoundingClientRect(),h=hit(r.left+r.width/2,r.top+r.height/2),chapter=h?.object.userData.action!==undefined&&h.distance<8?h.object.userData.action:nearest({x:camera.position.x,z:camera.position.z});if(chapter!==null)onInspect({chapter});},dispose(){observer.disconnect();built.resources.forEach(resource=>resource.dispose());renderer.dispose();},poseAt:lesson.poseAt};
}
