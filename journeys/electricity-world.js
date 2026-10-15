import * as THREE from '../vendor/three.module.js';
import {sampleGrid,lineAtPower} from './electricity-model.js';

export const ELECTRICITY_FOCUS=[[-12,2.3,1.2],[-5.5,2,0],[4.7,2.2,0],[10.4,1.2,2.3]];
export const electricityOverview={yaw:.08,pitch:.4,distance:9.5};
const C={energy:0xffd278,DC:0xffb67e,AC:0x86d9e6,heat:0xff9573,charge:0x98e8bf,discharge:0xcfbcff,steel:0x8fa9b5};

export function createElectricityScene(lesson,es){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x152b3c);scene.fog=new THREE.Fog(0x152b3c,50,110);
 const resources=[],targets=[],stands=[],routes=[],panels=[],towers=[],cityLights=[],own=x=>(resources.push(x),x),t=(a,b)=>es?a:b,L=(a,b)=>[a,b];
 const format=(v,d=1)=>new Intl.NumberFormat(es?'es':'en',{maximumFractionDigits:d}).format(v),mat=(c,extra={})=>own(new THREE.MeshStandardMaterial({color:c,roughness:.6,metalness:.12,...extra}));
 scene.add(new THREE.HemisphereLight(0xcce8fc,0x49634e,2.2));const sun=new THREE.DirectionalLight(0xffe5bd,3.1);sun.position.set(-9,19,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-20,right:20,top:15,bottom:-15,near:.1,far:55});sun.shadow.normalBias=.055;scene.add(sun);resources.push(sun.shadow);
 function mesh(g,geometry,material,p=[0,0,0]){const m=new THREE.Mesh(geometry,material);m.position.set(...p);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
 function box(g,p,size,color,extra){return mesh(g,own(new THREE.BoxGeometry(...size)),mat(color,extra),p);}
 function cylinder(g,p,r,h,color,extra){return mesh(g,own(new THREE.CylinderGeometry(r,r,h,20)),mat(color,extra),p);}
 function ball(g,p,r,color,extra){return mesh(g,own(new THREE.SphereGeometry(r,14,10)),mat(color,extra),p);}
 function tube(g,points,r,color,extra,segments=40){const curve=points instanceof THREE.Curve?points:new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return {mesh:mesh(g,own(new THREE.TubeGeometry(curve,segments,r,6,false)),mat(color,extra)),curve};}
 function rod(g,a,b,r,color){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),m=cylinder(g,p.clone().add(q).multiplyScalar(.5).toArray(),r,p.distanceTo(q),color,{metalness:.65,roughness:.33});m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),q.sub(p).normalize());return m;}
 function label(g,words,p,width=3,{height=96,bg=true}={}){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=height;const ctx=canvas.getContext('2d'),texture=own(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(own(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false})));sprite.position.set(...p);sprite.scale.set(width,width*height/768,1);g.add(sprite);let previous;
  function set(text){if(text===previous)return;previous=text;ctx.clearRect(0,0,768,height);if(bg){ctx.fillStyle='#173342ed';ctx.fillRect(0,0,768,height);}ctx.fillStyle='#eff7f6';ctx.font='600 62px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';const lines=text.split('\n');lines.forEach((line,i)=>ctx.fillText(line,384,height*(i+.5)/lines.length,740));texture.needsUpdate=true;}set(words);return {m:sprite,set};
 }
 function inspect(object,esText,enText){object.userData.info=L(esText,enText);targets.push(object);return object;}
 box(scene,[0,-.16,0],[35,.3,23],0x4b7162);box(scene,[0,.01,6.2],[34,.04,2],0x3e5260);for(let x=-16;x<=16;x+=2)box(scene,[x,.045,6.2],[.7,.02,.07],0xd6d9b3);
 for(const [x,z,s] of [[-16,-5,1.2],[-16,4,.8],[-10,-6,1],[-2,-6,.9],[13,-6,1.1],[16,4,.8]]){cylinder(scene,[x,.7*s,z],.1*s,1.4*s,0x8a7052);mesh(scene,own(new THREE.ConeGeometry(.7*s,1.7*s,9)),mat(0x6fa179),[x,1.75*s,z]);}
 // An actual rotor shaft and a cutaway nacelle make the mechanical conversion visible.
 const turbine=new THREE.Group();turbine.position.set(-12,0,-2.7);scene.add(turbine);
 cylinder(turbine,[0,.10,0],.62,.2,0x77918e);mesh(turbine,own(new THREE.CylinderGeometry(.16,.29,4.6,24)),mat(0xd0ddd9),[0,2.4,0]);
 const nacelle=box(turbine,[0,4.82,0],[.76,.62,1.6],0xc9dcd9,{transparent:true,opacity:.38,depthWrite:false});nacelle.castShadow=false;
 const shaft=cylinder(turbine,[0,4.82,.45],.095,1.75,0xc6b68a,{metalness:.75,roughness:.25});shaft.rotation.x=Math.PI/2;
 const generator=new THREE.Group();generator.position.set(0,4.82,-.2);turbine.add(generator);
 const generatorRing=mesh(generator,own(new THREE.TorusGeometry(.29,.075,8,32)),mat(0xbd915e,{metalness:.65}),[0,0,0]);
 const magnetRotor=mesh(generator,own(new THREE.CylinderGeometry(.19,.19,.22,14)),mat(0x678fc2,{metalness:.6}));magnetRotor.rotation.x=Math.PI/2;
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;box(generator,[Math.sin(a)*.27,Math.cos(a)*.27,0],[.12,.12,.17],i%2?0xbf9580:0x86bbc9,{metalness:.55});}
 const rotor=new THREE.Group();rotor.position.set(0,4.82,1);turbine.add(rotor);const hub=cylinder(rotor,[0,0,0],.22,.38,0xeee9d8);hub.rotation.x=Math.PI/2;
 const bladeShape=new THREE.Shape();bladeShape.moveTo(-.06,.12);bladeShape.lineTo(.15,.32);bladeShape.quadraticCurveTo(.29,1.30,.075,2.35);bladeShape.lineTo(-.045,2.22);bladeShape.quadraticCurveTo(-.07,1.15,-.06,.12);
 const bladeGeo=own(new THREE.ExtrudeGeometry(bladeShape,{depth:.055,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.018,bevelThickness:.018,curveSegments:12})),blades=[];
 for(let i=0;i<3;i++){const blade=mesh(rotor,bladeGeo,mat(0xe2ece5));blade.rotation.z=i*2*Math.PI/3;blades.push(blade);}
 inspect(nacelle,'Aerogenerador esquemático: rotor → eje → generador de corriente alterna. El giro es ilustrativo, no calcula velocidad mecánica.','Schematic wind turbine: rotor → shaft → alternating-current generator. Rotation is illustrative; mechanical speed is not calculated.');inspect(generatorRing,'El eje mueve el rotor magnético frente a las bobinas del generador.','The shaft moves the magnetic rotor relative to the generator coils.');
 const sourceLabels=new THREE.Group();scene.add(sourceLabels);const windCaption=label(sourceLabels,'',[-12,1.35,-.45],4.1,{height:128});
 // Individually bounded photovoltaic cells, busbars and frames distinguish panels from blue tiles.
 const pv=new THREE.Group();pv.position.set(-12,0,2.5);scene.add(pv);
 const cellGeo=own(new THREE.BoxGeometry(.215,.015,.34)),cellMat=mat(0x174977,{roughness:.3,metalness:.45,emissive:0x143e60,emissiveIntensity:.08});
 for(let row=0;row<2;row++)for(let col=0;col<3;col++){
  const g=new THREE.Group();g.position.set(-1.48+col*1.5,.85,-.85+row*1.85);g.rotation.x=-.34;pv.add(g);
  const frame=box(g,[0,0,0],[1.37,.08,1.70],0xa5b5b7,{metalness:.72,roughness:.3});box(g,[0,.045,0],[1.29,.035,1.62],0x102e48);
  const cells=[];for(let z=0;z<4;z++)for(let x=0;x<5;x++){const cell=mesh(g,cellGeo,cellMat,[-.48+x*.24,.07,-.59+z*.39]);cells.push(cell);box(g,[-.48+x*.24,.081,-.59+z*.39],[.007,.004,.33],0x9dbac7,{metalness:.5});}
  for(const side of [-1,1])rod(pv,[g.position.x+side*.48,.05,g.position.z+.55],[g.position.x+side*.48,1,g.position.z+.55],.032,0xa6b6b4);
  inspect(frame,'Panel fotovoltaico: las células entregan corriente continua. La cuadrícula es representativa; no modela una instalación comercial.','Photovoltaic panel: cells supply direct current. The cell grid is representative; this is not a commercial installation model.');panels.push({group:g,frame,cells});
 }
 const solarCaption=label(sourceLabels,'',[-12,1.3,4.55],4.9,{height:128});
 function inverter(x,z,title){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);const body=box(g,[0,.55,0],[1.3,1.1,.7],0xa8b7b5,{metalness:.25});box(g,[0,.83,.37],[.85,.22,.025],0x153f52);for(let i=0;i<7;i++)box(g,[-.4+i*.13,.35,.37],[.045,.35,.035],0x415968);const lamp=ball(g,[.4,.82,.40],.055,C.AC,{emissive:C.AC,emissiveIntensity:.6});const caption=label(g,title,[0,1.5,0],2.9);return {group:g,body,lamp,caption};}
 const solarInverter=inverter(-8.3,2.8,'DC → AC');inspect(solarInverter.body,'Inversor fotovoltaico: convierte corriente continua en alterna para entregar energía al bus común. Conversión ideal en este modelo.','Solar inverter: converts DC to AC to deliver energy to the common bus. Conversion is ideal in this model.');
 const bus=box(scene,[-7.3,.5,.25],[.65,1,.6],0x708b92,{metalness:.45});inspect(bus,'Bus de generación: reúne la potencia realmente despachada por viento y solar. La capacidad recortada no llega aquí.','Generation bus: combines actual dispatched wind and solar power. Curtailed capacity never reaches this point.');
 // Each transformer has a closed ferromagnetic loop and galvanically isolated windings.
 function transformer(x,z,scale,title){
  const group=new THREE.Group();group.position.set(x,0,z);group.scale.setScalar(scale);scene.add(group);box(group,[0,.10,0],[3.5,.2,2.1],0x9cae9f);
  const core=[],coreMat=mat(0x5b6d77,{metalness:.72,roughness:.4});
  for(const [p,size] of [[[0,.30,0],[2.1,.30,.46]],[[0,2.40,0],[2.1,.30,.46]],[[-.82,1.35,0],[.46,1.8,.46]],[[.82,1.35,0],[.46,1.8,.46]]])core.push(mesh(group,own(new THREE.BoxGeometry(...size)),coreMat,p));
  for(let z=-.20;z<=.21;z+=.07){rod(group,[-1.05,.31,z],[1.05,.31,z],.008,0x94a9ae);rod(group,[-1.05,2.41,z],[1.05,2.41,z],.008,0x94a9ae);}
  function winding(cx,turns,color,angle){const points=[];for(let i=0;i<=turns*18;i++){const u=i/(turns*18),a=angle+u*turns*2*Math.PI;points.push(new THREE.Vector3(cx+Math.cos(a)*.47,.55+u*1.6,Math.sin(a)*.47));}const wire=tube(group,new THREE.CatmullRomCurve3(points),.030,color,{metalness:.72,roughness:.3},turns*24);const terminals=[points[0],points.at(-1)];terminals.forEach(p=>ball(group,p.toArray(),.075,color,{metalness:.55}));return {coil:wire.mesh,curve:wire.curve,terminals,center:cx,turns};}
  const primary=winding(-.82,9,0xdca36d,Math.PI),secondary=winding(.82,17,0x9ad5dd,0);
  inspect(primary.coil,'Bobina primaria: un circuito eléctrico separado. Las espiras dibujadas son esquemáticas, no una relación numérica de vueltas.','Primary winding: a separate electrical circuit. Drawn turns are schematic, not a numerical turns ratio.');inspect(secondary.coil,'Bobina secundaria aislada de la primaria. El flujo magnético alterno las acopla; ninguna conexión metálica atraviesa el núcleo de una bobina a la otra.','Secondary winding is isolated from the primary. Alternating magnetic flux couples them; no metallic connection crosses the core between windings.');
  core.forEach(m=>inspect(m,'Núcleo cerrado: el flujo magnético cambia de dirección con la corriente alterna. No es un camino de electrones entre bobinas.','Closed core: magnetic flux changes direction with alternating current. It is not an electron path between windings.'));
  const magneticPath=[[-.82,.3,.26],[-.82,2.4,.26],[.82,2.4,.26],[.82,.3,.26],[-.82,.3,.26]].map(p=>new THREE.Vector3(...p)),flux=[];
  const cone=own(new THREE.ConeGeometry(.08,.22,9));for(let i=0;i<4;i++){const start=magneticPath[i],end=magneticPath[i+1],direction=end.clone().sub(start).normalize(),arrow=mesh(group,cone,mat(0xe9d17c,{emissive:0xcdb561,emissiveIntensity:.5}),start.clone().lerp(end,.55).toArray());flux.push({arrow,direction});}
  const caption=label(group,title,[0,3.0,0],4.1,{height:128});return {group,core,primary,secondary,flux,caption};
 }
 const stepUp=transformer(-5.5,0,1,t('ELEVADOR · AC → AC','STEP-UP · AC → AC')),stepDown=transformer(7.5,0,.72,t('SUBESTACIÓN · REDUCIR','SUBSTATION · STEP DOWN'));
 const transformers={stepUp,stepDown};
 // Tower lattice, suspension strings and curved conductors are structural, not chart bars.
 for(const x of [-1.5,3.5]){
  const group=new THREE.Group();group.position.x=x;scene.add(group);const members=[];
  for(const side of [-1,1])for(const z of [-.38,.38])members.push(rod(group,[side*.65,.1,z],[side*.16,4.6,z*.45],.047,C.steel));
  for(let y=.4;y<4.4;y+=.7){const width=.65-y*.105;for(const z of [-.38,.38]){members.push(rod(group,[-width,y,z],[width-.07,y+.65,z],.026,C.steel));members.push(rod(group,[width,y,z],[-width+.07,y+.65,z],.026,C.steel));}}
  box(group,[0,4.6,0],[.28,.35,.28],C.steel,{metalness:.65});box(group,[0,4.57,0],[.18,.14,2.35],C.steel,{metalness:.65});const insulators=[];
  for(const z of [-.8,0,.8]){const string=new THREE.Group();string.position.set(0,4.15,z);group.add(string);for(let j=0;j<6;j++)insulators.push(cylinder(string,[0,j*.057,0],.10,.045,0xd1dfd1,{roughness:.28}));}
  members.forEach(m=>inspect(m,'Torre de transporte: sostiene conductores mediante aisladores. Su geometría no determina la resistencia equivalente del modelo.','Transmission tower: supports conductors through insulators. Geometry does not set the model equivalent resistance.'));towers.push({group,members,insulators});
 }
 const conductors=[];for(const z of [-.8,0,.8]){const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-1.5,4.14,z),new THREE.Vector3(1,3.45,z),new THREE.Vector3(3.5,4.14,z)),wire=tube(scene,curve,.024,0xc2d0c9,{metalness:.65,roughness:.36},48);conductors.push(wire.mesh);inspect(wire.mesh,'Conductor suspendido con flecha. Las luces indican energía neta; la corriente alterna local oscila. Línea representativa, cálculo de un circuito equivalente.','Sagging suspended conductor. Lights indicate net energy; local alternating current oscillates. Representative line, equivalent-circuit calculation.');}
 const lineEnds=[[-4.20,2.15,0],[-1.5,4.14,0],[1,3.80,0],[3.5,4.14,0],[6.55,1.55,0]];
 tube(scene,[[-4.2,.55,.16],[-1.5,4.14,-.8],[1,3.8,-.8],[3.5,4.14,-.8],[6.55,.40,.16]],.022,0xa6bcbf,{metalness:.6});
 // Distribution feeds an aggregate community; this one home is only an example branch.
 const distributionBus=box(scene,[9.3,.75,0],[1.05,1.5,.85],0x70898c);inspect(distributionBus,'Distribución: potencia entregada a una comunidad, no 22 MW consumidos por una casa.','Distribution: power delivered to a community, not 22 MW consumed by one house.');
 const city=new THREE.Group();city.position.set(12.5,0,-1.6);scene.add(city);const buildings=[];
 for(let i=0;i<6;i++){const x=-1.8+(i%3)*1.65,z=-1.2+Math.floor(i/3)*2.0,height=1.3+(i%3)*.65;const building=box(city,[x,height/2,z],[1.1,height,1.25],i%2?0x8296a2:0x9bacb4,{roughness:.8});box(city,[x,height+.035,z],[1.17,.09,1.32],0x617a84);buildings.push(building);for(let row=0;row<3;row++)for(let col=0;col<2;col++){const window=box(city,[x-.25+col*.5,.32+row*(height-.5)/3,z+.636],[.23,.20,.018],0xffd98a,{emissive:0xe6b56b,emissiveIntensity:.4});cityLights.push(window);}}
 const house=new THREE.Group();house.position.set(12,0,3);scene.add(house);box(house,[0,.52,0],[1.8,1.05,1.6],0xd9cbae);const roof=mesh(house,own(new THREE.ConeGeometry(1.42,.70,4)),mat(0x955d4e),[0,1.33,0]);roof.rotation.y=Math.PI/4;box(house,[.38,.41,.812],[.4,.80,.025],0x657677);const houseWindow=box(house,[-.48,.60,.82],[.48,.42,.025],0xffd98a,{emissive:0xffd98a,emissiveIntensity:.5});
 inspect(houseWindow,'Una vivienda de ejemplo al final de la distribución. Los MW de la demanda pertenecen al conjunto de la comunidad.','One example home at the end of distribution. Demand in MW belongs to the entire community.');
 tube(scene,[[9.8,.55,.15],[11,.35,1.5],[12,.75,2.18]],.032,0x687f82);const communityCaption=label(scene,t('COMUNIDAD · vivienda de ejemplo','COMMUNITY · example home'),[12.1,.52,4.25],6.1,{height:96});
 // A storage container and its separate bidirectional inverter show MW versus MWh.
 const batteryGroup=new THREE.Group();batteryGroup.position.set(9.4,0,4.1);scene.add(batteryGroup);const batteryBody=box(batteryGroup,[0,.68,0],[3.0,1.36,1.22],0x648087,{metalness:.35});for(let x=-1.3;x<=1.3;x+=.21)box(batteryGroup,[x,.68,.63],[.035,1.14,.045],0x8ca1a3);
 box(batteryGroup,[0,.76,.68],[2.50,.61,.045],0x223f4c);const batteryFill=box(batteryGroup,[-1.25,.76,.72],[2.50,.51,.035],C.charge,{emissive:0x598f73,emissiveIntensity:.28});const batteryCaption=label(batteryGroup,'',[0,1.70,0],4.4,{height:128});inspect(batteryBody,'Batería comunitaria ideal: capacidad 20 MWh; carga o descarga hasta 6 MW. La energía almacenada sigue el tiempo recorrido dentro de la hora.','Ideal community battery: 20 MWh capacity; charging or discharging up to 6 MW. Stored energy follows elapsed time within the hour.');
 const batteryInverter=inverter(7.3,4.1,'AC ↔ DC');inspect(batteryInverter.body,'Inversor bidireccional: carga desde la red o devuelve energía de la batería. Los dos flujos nunca se activan a la vez en este modelo.','Bidirectional inverter: charges from the grid or returns battery energy. Both flows are never active simultaneously in this model.');
 const battery={group:batteryGroup,body:batteryBody,fill:batteryFill,caption:batteryCaption,inverter:batteryInverter};
 const particleGeo=own(new THREE.SphereGeometry(.07,10,8));
 function route(id,points,color,info,direction=1){const data=tube(scene,points,.026,color,{transparent:true,opacity:.42}),packets=[];inspect(data.mesh,...info);for(let i=0;i<24;i++){const packet=mesh(scene,particleGeo,mat(color,{emissive:color,emissiveIntensity:.7}));packet.visible=false;packet.castShadow=false;packets.push(packet);}const r={id,path:data.mesh,curve:data.curve,packets,flow:0,direction};routes.push(r);return r;}
 route('wind',[[-12,4.82,-2.9],[-11.72,2.6,-2.9],[-11.65,.4,-2.7],[-9.6,.32,-2.2],[-7.3,.55,.25],[-6.79,2.15,0]],C.energy,L('Potencia eólica realmente despachada: desde el generador por el cable hasta la bobina primaria. No es el potencial disponible.','Actual dispatched wind power: from the generator along the cable to the primary winding. It is not available potential.'));
 route('solarDC',[[-12,.45,2.5],[-10,.32,2.8],[-8.9,.55,2.8]],C.DC,L('Energía fotovoltaica en el lado de corriente continua.','Photovoltaic energy on the DC side.'));
 route('solarAC',[[-7.65,.55,2.8],[-7.3,.32,1.5],[-7.3,.55,.25],[-6.79,2.15,0]],C.energy,L('Salida alterna del inversor solar al bus y a la bobina primaria.','Solar inverter AC output to the bus and primary winding.'));
 route('transmission',lineEnds,C.energy,L('Transferencia neta de energía por el transporte. Los paquetes son ilustrativos; no son electrones que viajan a la ciudad.','Net energy transfer through transmission. Packets are illustrative, not electrons travelling to the city.'));
 route('received',[[8.43,1.55,0],[9.0,1,0],[9.3,.75,0]],C.energy,L('Potencia recibida después de las pérdidas del conductor.','Power received after conductor losses.'));
 route('delivery',[[9.3,.75,0],[10.8,.45,-.1],[12.5,.45,-1.6]],C.energy,L('Suministro efectivo de la comunidad; puede quedar demanda sin atender.','Actual community supply; some demand may remain unserved.'));
 route('loss',[[1,3.8,0],[1.35,2.9,1.05],[2.2,1.45,1.7]],C.heat,L('Pérdida I²R: energía eléctrica transformada en calor en el conductor.','I²R loss: electrical energy converted into conductor heat.'));
 route('charge',[[9.3,.75,0],[8.2,.35,2.0],[7.3,.7,4.1],[9.4,.75,4.1]],C.charge,L('Carga real: energía de la red al inversor y a la batería.','Actual charging: grid energy to the inverter and battery.'));
 route('discharge',[[9.4,.75,4.3],[7.3,.7,4.3],[8.1,.50,2.0],[9.3,.75,.2]],C.discharge,L('Descarga real: energía almacenada vuelve a la distribución.','Actual discharge: stored energy returns to distribution.'));
 // Returning conductors remain separate; the two transformer circuits never touch.
 tube(scene,[[-12,.22,-2.55],[-9.6,.18,-2.0],[-7.1,.25,.45],[-6.79,.55,.15]],.023,0x789295);tube(scene,[[-12,.28,2.65],[-10,.18,2.95],[-8.9,.38,2.95]],.023,0x647d84);tube(scene,[[-7.65,.38,2.95],[-7.1,.20,1.65],[-6.79,.55,.15]],.023,0x758d91);
 const heatGlyph=new THREE.Group();heatGlyph.position.set(2.2,1.35,1.7);scene.add(heatGlyph);for(let i=0;i<3;i++)tube(heatGlyph,new THREE.CatmullRomCurve3(Array.from({length:17},(_,j)=>new THREE.Vector3((i-1)*.25+Math.sin(j*.45)*.06,j*.045,0))),.025,C.heat,{emissive:C.heat,emissiveIntensity:.4});
 const lineCaption=label(scene,'',[1,1.05,2.75],5.1,{height:128});
 // Curtailment is unavailable harvest at the source, never a destination or cable loss.
 const curtailGroup=new THREE.Group();curtailGroup.position.set(-9.4,1.7,4.2);scene.add(curtailGroup);const curtailGlyphs=[];for(const angle of [-.65,.65]){const stop=box(curtailGroup,[0,0,0],[.09,.55,.06],0xf5a17c,{emissive:0xc77553,emissiveIntensity:.35});stop.rotation.z=angle;curtailGlyphs.push(stop);}const curtailCaption=label(curtailGroup,'',[0,-.50,0],3.3,{height:96});const curtail={group:curtailGroup,glyphs:curtailGlyphs,caption:curtailCaption,power:0};
 const localAC=[];for(const [x,z] of [[-6.95,0],[-4.1,0],[6.6,0]]){const g=new THREE.Group();g.position.set(x,1.50,z+.62);scene.add(g);const guide=tube(g,[[-.22,0,0],[.22,0,0]],.016,C.AC,{transparent:true,opacity:.5}),marker=ball(g,[0,0,0],.045,C.AC,{emissive:C.AC,emissiveIntensity:.5});localAC.push({group:g,guide:guide.mesh,marker});}
 // Fixed power removes dispatch as a confounding factor in the voltage comparison.
 const comparisonGroup=new THREE.Group();comparisonGroup.position.set(-5.5,0,3.4);scene.add(comparisonGroup);box(comparisonGroup,[0,.08,0],[5.8,.16,1.45],0x617d86);const comparisonCaption=label(comparisonGroup,'',[0,1.4,0],5.9,{height:192});comparisonCaption.m.material.depthTest=false;comparisonCaption.m.renderOrder=10;
 const comparisonBars={low:box(comparisonGroup,[-2.4,.16,.4],[4.8,.10,.13],C.heat),selected:box(comparisonGroup,[-2.4,.28,.4],[4.8,.10,.13],C.AC)};
 const transformerNote=label(scene,t('Núcleo cerrado · circuitos aislados\nAC local oscila · energía neta avanza','Closed core · isolated circuits\nLocal AC oscillates · net energy advances'),[-5.5,4.4,0],5.8,{height:144});
 const sourceNote=label(scene,t('Viento → eje → AC · luz → células → DC → AC','Wind → shaft → AC · light → cells → DC → AC'),[-12,7.6,-2.7],7.1);
 const batteryNote=label(scene,t('MW: potencia · MWh: energía almacenada','MW: power · MWh: stored energy'),[10.4,.50,5.55],6.0);
 const profilePanel=new THREE.Group();profilePanel.position.set(6,0,3.6);scene.add(profilePanel);box(profilePanel,[0,1.1,0],[4.1,2.2,.18],0x2d4e5e);box(profilePanel,[0,1.10,.11],[3.88,2,.025],0x142d3c);
 label(profilePanel,t('SOLAR · PERFIL SINTÉTICO','SOLAR · SYNTHETIC PROFILE'),[0,2.03,.16],3.8);label(profilePanel,t('gris: disponible · amarillo: despachada','grey: available · yellow: dispatched'),[0,.28,.16],3.8);
 const profileLines=[];for(const color of [0x8ba7b5,C.energy]){const geometry=own(new THREE.BufferGeometry());geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(25*3),3));const line=new THREE.Line(geometry,own(new THREE.LineBasicMaterial({color})));profilePanel.add(line);profileLines.push(line);}
 const profileCursor=box(profilePanel,[-1.7,1.13,.19],[.020,1.05,.025],0xa6dee6,{emissive:0x689eaf,emissiveIntensity:.3});
 const overviewLabelsGroup=new THREE.Group();scene.add(overviewLabelsGroup);
 for(const [words,x,z,width] of [[t('GENERACIÓN','GENERATION'),-12,5.7,5],[t('TRANSFORMACIÓN','TRANSFORMERS'),-5.5,5.7,5],[t('TRANSPORTE','TRANSMISSION'),2,5.7,5],[t('CONSUMO + ALMACÉN','LOAD + STORAGE'),11,6.9,7]]){const caption=label(overviewLabelsGroup,words,[x,.7,z],width);caption.m.material.depthTest=false;caption.m.renderOrder=10;}
 const standsGroup=new THREE.Group();scene.add(standsGroup);
 for(let i=0;i<4;i++){const x=[-13,-5.5,4,12.5][i],z=8.5;box(standsGroup,[x,.52,z],[1.7,1.04,.75],0x294955);box(standsGroup,[x,1.09,z],[1.9,.09,.95],0x8aa4a4);const button=box(standsGroup,[x,1.23,z+.12],[.85,.20,.50],0xffd991,{emissive:0xe1b977,emissiveIntensity:.45});button.userData.action=i;targets.push(button);stands.push(button);label(standsGroup,`${i+1} · ${(es?['GENERAR','TRANSFORMAR','TRANSPORTAR','EQUILIBRAR']:['GENERATE','TRANSFORM','TRANSMIT','BALANCE'])[i]}`,[x,.67,z+.40],1.65);label(standsGroup,t('▶ ESCUCHAR','▶ LISTEN'),[x,1.34,z+.20],.86);}
 let lastState,comparison,profileTrace;
 function update(model,time=0,phase=0,whole=false,immersive=false){
  const s=sampleGrid(model.trace,Number.isFinite(time)?time:0);lastState=s;const active=s.active!==false,voltage=model.voltage??model.trace.params?.voltage??200,flow=name=>active?Math.max(0,s[name]||0):0;
  const powers={wind:flow('wind'),solarDC:flow('solar'),solarAC:flow('solar'),transmission:flow('generated'),received:flow('received'),delivery:flow('served'),loss:flow('loss'),charge:flow('charge'),discharge:flow('discharge')};
  routes.forEach(r=>{r.flow=powers[r.id];const count=r.flow>0?Math.min(24,Math.max(1,Math.ceil(r.flow*.65))):0;r.path.material.opacity=r.flow>0?.66:.18;r.packets.forEach((packet,i)=>{packet.visible=i<count;if(packet.visible){const u=(i/count+s.continuous*.16*Math.max(.3,Math.min(1.5,r.flow/15)))%1;packet.position.copy(r.curve.getPoint(r.direction===-1?1-u:u));}});});
  rotor.rotation.z=-s.continuous*(.65+(s.windPotential??s.wind??0)*.035);magnetRotor.rotation.set(Math.PI/2,0,rotor.rotation.z,'ZXY');blades.forEach(b=>b.rotation.y=Math.max(0,1-(s.wind||0)/Math.max(.001,s.windPotential??s.wind??1))*.4);
  cellMat.emissiveIntensity=.03+Math.min(.35,(s.solarPotential??s.solar??0)/100);solarInverter.lamp.material.emissiveIntensity=flow('solar')>0?.9:.05;batteryInverter.lamp.material.emissiveIntensity=flow('charge')+flow('discharge')>0?.9:.05;
  const magnetic=Math.sin(s.continuous*2*Math.PI*1.2),sign=magnetic<0?-1:1;Object.values(transformers).forEach(tr=>tr.flux.forEach(({arrow,direction})=>{arrow.visible=flow('generated')>0;arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().multiplyScalar(sign));arrow.material.emissiveIntensity=.15+Math.abs(magnetic)*.6;}));
  localAC.forEach(({group,marker})=>{group.visible=(whole||phase===1)&&flow('generated')>0;marker.position.x=Math.sin(s.continuous*2*Math.PI*1.2)*.20;});
  windCaption.set(t('Viento · ','Wind · ')+format(s.wind)+' MW\n'+t('disponibles ','available ')+format(s.windPotential??s.wind)+' MW');solarCaption.set(t('Solar despachada · ','Dispatched solar · ')+format(s.solar)+' MW\n'+t('disponibles ','available ')+format(s.solarPotential??s.solar)+' MW');
  stepUp.caption.set(t('ELEVADOR AC · ','STEP-UP AC · ')+format(voltage,0)+' kV\n'+t('espiras esquemáticas · RMS','schematic turns · RMS'));stepDown.caption.set(t('REDUCIR → DISTRIBUIR','STEP DOWN → DISTRIBUTE'));
  lineCaption.set(t('Transporte · ','Transmission · ')+format(s.current,0)+' A\n'+t('calor I²R: ','I²R heat: ')+format(s.loss,2)+' MW');
  const ratio=Math.max(0,Math.min(1,s.stored/20));batteryFill.scale.x=ratio;batteryFill.position.x=-1.25+1.25*ratio;batteryCaption.set(t('BATERÍA · ','BATTERY · ')+format(s.stored)+' / 20 MWh\n'+(!active?t('Día terminado','Day complete'):s.charge>0?t('carga ','charge ')+format(s.charge)+' MW':s.discharge>0?t('descarga ','discharge ')+format(s.discharge)+' MW':t('sin intercambio','no exchange')));
  const servedRatio=Math.max(0,Math.min(1,s.served/Math.max(.001,s.demand)));cityLights.forEach((window,i)=>{const lit=i/cityLights.length<servedRatio;window.material.color.setHex(lit?0xffd98a:0x3b5260);window.material.emissiveIntensity=lit?.45:0;});houseWindow.material.emissiveIntensity=s.served>0?.45:0;
  conductors.forEach(wire=>{wire.material.emissive.setHex(C.heat);wire.material.emissiveIntensity=active?Math.min(.42,s.loss/12):0;});heatGlyph.visible=flow('loss')>0;
  curtail.power=flow('curtailed');curtailGroup.visible=curtail.power>0&&(whole||phase===0||phase===3||immersive);curtailCaption.set(t('No cosechado: ','Not harvested: ')+format(s.curtailed)+' MW');
  overviewLabelsGroup.visible=whole;curtailCaption.m.visible=!whole&&(phase===0||phase===3);
  const low=lineAtPower(30,50),selected=lineAtPower(30,voltage);comparison={power:30,lowVoltage:50,voltage,low,selected};comparisonCaption.set(t('MISMA POTENCIA: 30 MW · RMS · PF = 1','SAME POWER: 30 MW · RMS · PF = 1')+'\n50 kV · '+format(low.current,0)+' A · '+format(low.loss,2)+' MW\n'+format(voltage,0)+' kV · '+format(selected.current,0)+' A · '+format(selected.loss,2)+' MW');
  for(const [key,value] of [['low',low.loss],['selected',selected.loss]]){const bar=comparisonBars[key];bar.scale.x=Math.max(.001,value/7.2);bar.position.x=-2.4+2.4*value/7.2;}
  if(profileTrace!==model.trace){profileTrace=model.trace;const peak=Math.max(1,model.trace.params?.sun??40);profileLines.forEach((line,k)=>{const positions=line.geometry.attributes.position;for(let hour=0;hour<=24;hour++){const record=model.trace.hours[hour],value=record?(k===0?record.solarPotential:record.solar):0;positions.setXYZ(hour,-1.7+hour/24*3.4,.60+value/peak*1.05,.18+k*.012);}positions.needsUpdate=true;line.geometry.computeBoundingSphere();});}profileCursor.position.x=-1.7+s.continuous/24*3.4;profilePanel.visible=!whole&&phase===3;
  sourceLabels.visible=!whole&&phase===0;sourceNote.m.visible=!whole&&phase===0;solarInverter.caption.m.visible=!whole&&phase===0;transformerNote.m.visible=!whole&&phase===1;stepUp.caption.m.visible=!whole&&phase===1;comparisonGroup.visible=!whole&&phase===1;
  stepDown.caption.m.visible=!whole&&phase===2;lineCaption.m.visible=!whole&&phase===2;communityCaption.m.visible=!whole&&phase===2;heatGlyph.visible=heatGlyph.visible&&(whole||phase===2);
  batteryCaption.m.visible=!whole&&phase===3;batteryNote.m.visible=!whole&&phase===3;batteryInverter.caption.m.visible=!whole&&phase===3;stands.forEach((button,i)=>button.material.emissiveIntensity=i===phase?1:.16);
 }
 return {scene,resources,targets,stands,standsGroup,routes,transformers,panels,towers,conductors,battery,curtail,sourceCurtail:curtail,localAC,comparisonBars,comparisonGroup,overviewLabelsGroup,profilePanel,profileLines,profileCursor,sourceLabels,parts:{turbine,nacelle,generator,magnetRotor,rotor,shaft,blades,pv,solarInverter,bus,distributionBus,city,buildings,house,houseWindow,heatGlyph},outlines:[],focus:ELECTRICITY_FOCUS,update,get state(){return lastState;},get comparison(){return comparison;}};
}

const BOUNDS=[[-15,.1,-5.5,-7.1,8.1,5],[-8.2,.1,-1.5,-2.7,5.1,4.5],[-2.3,.1,-2,14.8,5.2,4.5],[4,.1,-4,15.6,4,6],[-16,.1,-6,16,8.1,6]];
export function electricityFraming(phase,orbit,aspect,fov){
 const whole=orbit.whole===true,index=whole?4:phase,center=new THREE.Vector3(...(whole?[0,2,0]:ELECTRICITY_FOCUS[phase])),yaw=orbit.yaw??.08,pitch=orbit.pitch??.4;
 const direction=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),up=new THREE.Vector3(-Math.sin(yaw)*Math.sin(pitch),Math.cos(pitch),-Math.cos(yaw)*Math.sin(pitch));
 const bounds=BOUNDS[index],tan=Math.tan(fov*Math.PI/360);let distance=4;for(const x of [bounds[0],bounds[3]])for(const y of [bounds[1],bounds[4]])for(const z of [bounds[2],bounds[5]]){const p=new THREE.Vector3(x,y,z).sub(center),depth=p.dot(direction);distance=Math.max(distance,depth+Math.abs(p.dot(right))/(tan*Math.max(.1,aspect)),depth+Math.abs(p.dot(up))/tan);}distance*=1.12*(orbit.distance??electricityOverview.distance)/electricityOverview.distance;return {center,distance,direction};
}
const visible=object=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};
export function createElectricityWorld(host,lesson,es,onInspect){
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;host.append(renderer.domElement);renderer.domElement.tabIndex=0;
 const built=createElectricityScene(lesson,es),camera=new THREE.PerspectiveCamera(46,1,.1,150),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let model,phase=0;
 function resize(){renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.fov=camera.aspect<1?65:46;camera.updateProjectionMatrix();}const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function nearest(player){let best=null,distance=5.8;built.stands.forEach((stand,i)=>{const p=stand.getWorldPosition(new THREE.Vector3()),d=Math.hypot(player.x-p.x,player.z-p.z);if(d<distance){best=i;distance=d;}});return best;}
 function hit(x,y){const r=renderer.domElement.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2);ray.setFromCamera(pointer,camera);return ray.intersectObjects(built.targets.filter(visible))[0];}
 return {canvas:renderer.domElement,update(s,i){model=s;phase=i;},render(player,dt,animation,orbit,mode,time){
  if(model)built.update(model,time,phase,mode==='web'&&orbit.whole===true,mode==='immersive');built.standsGroup.visible=mode==='immersive';
  if(mode==='immersive'){camera.position.set(player.x,1.65,player.z);camera.rotation.set(player.pitch,player.yaw,0,'YXZ');}else{const framing=electricityFraming(phase,orbit,camera.aspect,camera.fov);camera.position.copy(framing.center).addScaledVector(framing.direction,framing.distance);camera.lookAt(framing.center);}renderer.render(built.scene,camera);
 },inspect(x,y){const h=hit(x,y);if(h)onInspect(h.object.userData.action===undefined?h.object.userData.info:{chapter:h.object.userData.action});},nearest,activate(){const r=renderer.domElement.getBoundingClientRect(),h=hit(r.left+r.width/2,r.top+r.height/2),chapter=h?.object.userData.action!==undefined&&h.distance<8?h.object.userData.action:nearest({x:camera.position.x,z:camera.position.z});if(chapter!==null)onInspect({chapter});},dispose(){observer.disconnect();built.resources.forEach(resource=>resource.dispose());renderer.dispose();},poseAt:lesson.poseAt};
}
