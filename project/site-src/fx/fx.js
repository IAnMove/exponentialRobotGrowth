import * as THREE from '../vendor/three.module.js';
import {EffectComposer} from '../vendor/EffectComposer.js';
import {RenderPass} from '../vendor/RenderPass.js';
import {UnrealBloomPass} from '../vendor/UnrealBloomPass.js';
import {OutputPass} from '../vendor/OutputPass.js';
import {RoomEnvironment} from '../vendor/RoomEnvironment.js';

// Shared rendering pipeline for the Atlas 3D scenes.
// Bloom on HDR highlights only (> 1), then ACES tone mapping and sRGB output.
export function createPost(renderer,scene,camera,{strength=.78,radius=.62,threshold=.9}={}){
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(new RoomEnvironment(),.04);pmrem.dispose();
  scene.environment=environment.texture;scene.environmentIntensity=.3;
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});
  const composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));
  const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),strength,radius,threshold);composer.addPass(bloom);composer.addPass(new OutputPass());
  return {composer,bloom,setSize(w,h,dpr){composer.setPixelRatio(dpr);composer.setSize(w,h);},render(dt){composer.render(dt);},dispose(){environment.dispose();target.dispose();composer.dispose?.();}};
}
// Lowers the render scale when frames stay slow, so weak GPUs keep a fluid image.
export function adaptiveScale(initial,{min=.6,apply}){
  let scale=initial,avg=1/60,slow=0,cool=0;
  return {get scale(){return scale;},frame(dt){if(!(dt>0)||dt>.5)return;avg+=(dt-avg)*.05;cool=Math.max(0,cool-dt);
    slow=avg>1/35?slow+dt:0;if(slow>1.5&&cool<=0&&scale>min){scale=Math.max(min,+(scale*.8).toFixed(2));slow=0;cool=2;apply(scale);}}};
}
export const pointScaleFor=(height,dpr,fov)=>height*dpr/(2*Math.tan(THREE.MathUtils.degToRad(fov/2)));
// Soft additive points sized in world units (pointScale follows the viewport height).
export const POINT_VERTEX=`attribute float aSize;attribute float aAlpha;varying float vAlpha;uniform float uScale;
void main(){vAlpha=aAlpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uScale/max(.1,-mv.z);gl_Position=projectionMatrix*mv;}`;
export const POINT_FRAGMENT=`uniform vec3 uColor;uniform float uOpacity;varying float vAlpha;
void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);a*=a;float core=smoothstep(.16,0.,d);gl_FragColor=vec4(uColor*(a+core*.8)*vAlpha*uOpacity,a*vAlpha*uOpacity);}`;
export const pointMaterial=(pointScale,color,intensity=3)=>new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color(color).multiplyScalar(intensity)},uScale:pointScale,uOpacity:{value:1}},vertexShader:POINT_VERTEX,fragmentShader:POINT_FRAGMENT,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
