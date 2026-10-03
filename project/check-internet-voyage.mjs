import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {STAGES,PLACES,geoPoint,greatCircle,CABLE_KM,propagationMs,stageFact,SOURCES} from './site-src/journeys/internet-route.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
assert.equal(propagationMs(CABLE_KM),33);assert.equal(2*propagationMs(CABLE_KM),66);
assert.deepEqual(geoPoint({lat:0,lon:0},10),[0,0,10]);near(geoPoint({lat:90,lon:0})[1],10);
let points=0;
for(const [from,to]of [[PLACES.madrid,PLACES.sopelana],[PLACES.sopelana,PLACES.virginia],[PLACES.virginia,PLACES.ashburn],[{lat:0,lon:0},{lat:0,lon:180}],[PLACES.madrid,PLACES.madrid]]){
 const corridor=greatCircle(from,to);for(const p of corridor){points++;assert(p.every(Number.isFinite));near(Math.hypot(...p),10.05);}
 for(const [p,place]of [[corridor[0],from],[corridor.at(-1),to]])geoPoint(place,10.05).forEach((n,i)=>near(n,p[i]));
}
for(const value of [-1,NaN,Infinity])assert.throws(()=>propagationMs(value),RangeError);
for(const value of [0,-1,NaN,Infinity])assert.throws(()=>propagationMs(6600,value),RangeError);
for(const point of [{lat:91,lon:0},{lat:0,lon:181},{lat:NaN,lon:0}])assert.throws(()=>geoPoint(point),RangeError);
for(const count of [0,-1,.5,Infinity,4097])assert.throws(()=>greatCircle(PLACES.madrid,PLACES.ashburn,count),RangeError);
assert.equal(STAGES.length,9);assert.equal(new Set(STAGES.map(s=>s.id)).size,9);
const scripts=JSON.parse(readFileSync('narration/internet-voyage.json','utf8'));
const clips=JSON.parse(readFileSync('site-src/journeys/voices-internet-voyage.js','utf8').split('export const VOICES = ')[1].split(/;\r?\n/)[0]);
for(const lang of ['es','en']){
 assert.equal(clips[lang].length,9);
 clips[lang].forEach((c,i)=>{assert.equal(c.id,STAGES[i].id);assert.equal(c.text,scripts[lang][i].text);assert(c.duration>15&&c.duration<65);assert(statSync('dist/audio/'+c.file).size>100000);assert(stageFact(STAGES[i],lang==='es').every(Boolean));});
}
for(const prefix of ['dist','dist/es']){
 assert(readFileSync(prefix+'/journeys/app.js','utf8').includes("location.replace('./internet-voyage.html')"));
 assert(readFileSync(prefix+'/journeys/internet-voyage.html','utf8').includes(prefix.endsWith('/es')?'lang="es"':'lang="en"'));
}
assert(SOURCES.some(([,url])=>url.includes('ciena.com')));assert(SOURCES.some(([,url])=>url.includes('rfc9293')));
console.log(`Internet voyage: ${points} surface/endpoint samples including identical and antipodal places, real geography, honest cable propagation, 18 recorded transcripts and museum redirects: OK`);
