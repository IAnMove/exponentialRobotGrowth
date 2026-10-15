import assert from 'node:assert/strict';
import {buildCellTrace,sampleCell,translate} from './site-src/journeys/cell-model.js';

// Independently arranged rows from NCBI standard table 1. Columns are U,C,A,G.
const rows={UU:['Phe','Phe','Leu','Leu'],UC:['Ser','Ser','Ser','Ser'],UA:['Tyr','Tyr',null,null],UG:['Cys','Cys',null,'Trp'],CU:['Leu','Leu','Leu','Leu'],CC:['Pro','Pro','Pro','Pro'],CA:['His','His','Gln','Gln'],CG:['Arg','Arg','Arg','Arg'],AU:['Ile','Ile','Ile','Met'],AC:['Thr','Thr','Thr','Thr'],AA:['Asn','Asn','Lys','Lys'],AG:['Ser','Ser','Arg','Arg'],GU:['Val','Val','Val','Val'],GC:['Ala','Ala','Ala','Ala'],GA:['Asp','Asp','Glu','Glu'],GG:['Gly','Gly','Gly','Gly']};
let codonCases=0;
for(const [prefix,row] of Object.entries(rows))for(const [i,third] of [...'UCAG'].entries()){
 const codon=prefix+third,expected=row[i];assert.deepEqual(translate([codon]),expected===null?[]:[expected],`Standard code ${codon}`);codonCases++;
}
assert.equal(codonCases,64);
for(const stop of ['UAA','UAG','UGA'])assert.deepEqual(translate(['AUG','GCU',stop,'GAA']),['Met','Ala'],'First stop ends this reading frame');
assert.deepEqual(translate([]),[]);
for(const sequence of [null,'AUG',3,{},undefined])assert.throws(()=>translate(sequence),TypeError);
for(const codon of ['ATG','aug','AU','AUGU','NNN',' AX',0,null,undefined])assert.throws(()=>translate([codon]),RangeError);
assert.throws(()=>translate(['AUG','UAA','bad']),RangeError,'The whole supplied fragment is validated');

const expectedChains=[['Met','Ala','Phe','Glu'],['Met','Ala','Phe','Glu'],['Met','Ala']];
const near=(a,b)=>assert(Math.abs(a-b)<1e-10,`${a} != ${b}`);
let sampleCases=0;
for(let variant=0;variant<3;variant++){
 const controls={variant},trace=buildCellTrace(controls),expected=expectedChains[variant],stopIndex=variant===2?2:4,release=9+3*stopIndex,recycle=release+1;
 assert.deepEqual(controls,{variant},'Model does not mutate controls');
 assert.equal(trace.horizon,24);assert.equal(trace.states.length,25);assert.equal(trace.windows.length,stopIndex+1);assert.equal(trace.releaseTime,release);assert.equal(trace.recycleTime,recycle);
 assert.deepEqual(translate(trace.sequence),expected);
 assert.deepEqual(trace.expected,{aminoAcids:expected,length:expected.length,stopIndex,readCodons:stopIndex+1});
 assert.deepEqual(trace.dna.coding,['ATG','GCT',['TTT','TTC','TAA'][variant],'GAA','TAA']);
 assert.deepEqual(trace.dna.template,['TAC','CGA',['AAA','AAG','ATT'][variant],'CTT','ATT']);
 assert.equal(trace.dna.codingDirection,'5′→3′');assert.equal(trace.dna.templateDirection,'3′→5′');
 assert.equal(new Set(trace.events.map(e=>e.id)).size,trace.events.length,'Event identifiers are unique');
 assert(trace.events.every((e,i)=>i===0||e.at>=trace.events[i-1].at),'Events are chronological');
 assert.equal(trace.events.filter(e=>e.type==='residue-incorporated').length,expected.length);
 assert.equal(trace.events.filter(e=>e.type==='stop-recognized').length,1);assert.equal(trace.events.filter(e=>e.type==='chain-released').length,1);
 assert(trace.events.filter(e=>'codonIndex'in e).every(e=>e.codonIndex<=stopIndex),'No event reads beyond the first stop');
 const times=new Set([...Array.from({length:97},(_,i)=>i/4),...trace.events.flatMap(e=>[Math.max(0,e.at-1e-7),e.at,Math.min(24,e.at+1e-7)])]);
 const saved=JSON.stringify(trace),samples=new Map();
 for(const time of times){
  const s=sampleCell(trace,time);samples.set(time,s);sampleCases++;
  assert.equal(s.time,time);assert.equal(s.completed,Math.floor(time));assert.equal(s.progress,time-Math.floor(time));assert.equal(s.continuous,true);assert.equal(s.active,time<24);
  assert.deepEqual(s.expected.aminoAcids,expected,'Expected chain is distinct from constructed chain');
  const count=expected.filter((_,i)=>time>=9+3*i).length;
  assert.deepEqual(s.chain.aminoAcids,expected.slice(0,count));assert.equal(s.chain.length,count);assert(s.chain.aminoAcids.every(aa=>typeof aa==='string'&&aa.length===3));
  assert.equal(s.chain.released,time>=release);assert.equal(s.chain.attached,count>0&&time<release);assert.equal(s.translation.recycled,time>=recycle);assert.equal(s.chain.releaseTime,release);assert.equal(s.chain.recycleTime,recycle);
  near(s.chain.releaseProgress,Math.max(0,Math.min(1,time-release)));
  const copied=Array.from({length:15},(_,i)=>(i+1)*4/15).filter(t=>t<=time).length;
  assert.equal(s.transcription.fragmentBasesCompleted,copied);assert.equal(s.transcription.nucleotidesCopied,copied);assert.equal(s.transcription.complete,time>=4);
  assert.equal(s.mrna.fragment,trace.sequence.join('').slice(0,copied));assert.equal(s.mrna.processed,time>=5);assert.equal(s.mrna.exported,time>=7);
  assert.equal(s.mrna.location,time<5?'nucleus':time<7?'pore':'cytosol');near(s.mrna.exportProgress,Math.max(0,Math.min(1,(time-5)/2)));
  assert.deepEqual(s.dna,trace.dna,'DNA remains nuclear information, not a consumed substrate');
  if(time<7){assert.equal(s.chain.length,0);assert.equal(s.translation.codonIndex,null);assert.equal(s.translation.trna,null);assert.equal(s.translation.releaseFactor,null);assert.equal(s.translation.readCodons,0);}
  else assert.equal(s.translation.codonIndex,Math.min(stopIndex,Math.floor((time-7)/3)));
  assert.equal(s.translation.readCodons,Array.from({length:stopIndex+1},(_,i)=>8+3*i).filter(t=>time>=t).length);
  assert(s.translation.readCodons<=stopIndex+1);assert.equal(s.translation.active,time>=7&&time<recycle);
  if(s.translation.window){
   const w=s.translation.window,i=w.index;
   assert(time>=w.start&&time<w.end);assert(i<=stopIndex);assert.equal(w.start,7+3*i);assert.equal(w.bind,w.start+1);assert.equal(w.commit,w.start+2);assert.equal(w.end,w.start+3);
   near(w.progress,(time-w.start)/3);
   if(i===stopIndex){assert.equal(s.translation.trna,null,'No tRNA for a stop codon');assert(s.translation.releaseFactor);assert.equal(s.translation.releaseFactor.site,'A');assert.equal(s.translation.releaseFactor.bound,time>=w.bind);}
   else{
    const trna=s.translation.trna;assert(trna);assert.equal(s.translation.releaseFactor,null);assert.equal(trna.codonIndex,i);assert.equal(trna.aminoAcid,expected[i]);assert.equal(trna.kind,i===0?'initiator':'elongation');assert.equal(trna.site,i===0?'P':'A');assert.equal(trna.bound,time>=w.bind);assert.equal(trna.carryingAminoAcid,time<w.commit);assert.equal(trna.peptidyl,time>=w.commit);
   }
  }else{assert.equal(s.translation.trna,null);assert.equal(s.translation.releaseFactor,null);}
  if(!s.chain.attached)assert.equal(s.translation.peptidylSite,null);
  else assert.equal(s.translation.peptidylSite,s.translation.window?.kind==='elongation'&&time>=s.translation.window.commit?'A':'P');
  assert.equal(s.codons.length,5);
  for(const c of s.codons){
   if(c.index>stopIndex){assert.equal(c.incorporated,false);assert.equal(c.read,false);assert.equal(c.active,false);assert.equal(c.status,time>=8+3*stopIndex?'skipped':'future');}
   if(c.kind==='stop')assert.equal(c.incorporated,false,'STOP never becomes a residue');
   assert.equal(c.active,s.translation.window?.index===c.index);
  }
  assert(s.events.every(e=>e.at<=time),'Future events never appear as completed');
  assert.equal(s.events.filter(e=>e.type==='residue-incorporated').length,s.chain.length);
  assert.equal(s.events.some(e=>e.type==='chain-released'),s.chain.released);
 }
 for(const [time,state] of [...samples].reverse())assert.deepEqual(sampleCell(trace,time),state,'Rewind reconstructs identical causal state');
 assert.equal(JSON.stringify(trace),saved,'Sampling does not mutate its trace');assert.deepEqual(buildCellTrace({variant}),trace,'Replay is deterministic');
 for(let i=0;i<=24;i++)assert.deepEqual(trace.states[i],sampleCell(trace,i));
 for(const [time,target] of [[-1,0],[-Infinity,0],[NaN,0],[Infinity,24],[25,24]])assert.deepEqual(sampleCell(trace,time),sampleCell(trace,target));
 assert.deepEqual(sampleCell(trace,'6.5'),sampleCell(trace,6.5));
 const end=sampleCell(trace,24);assert(end.chain.released&&!end.chain.attached);assert.equal(end.chain.releaseProgress,1);assert.equal(end.translation.active,false);assert.equal(end.translation.window,null);assert.equal(end.mrna.fragment,trace.sequence.join(''),'RNA is not consumed by translation');
 const prefix=buildCellTrace({variant},6);assert.equal(prefix.states.length,7);assert.equal(sampleCell(prefix,24).time,6);assert.equal(sampleCell(prefix,24).chain.length,0);assert.equal(sampleCell(prefix,24).active,false);
}

// These are independent checkpoints with a causal meaning, not only mirrors
// of the event table: processed RNA has not yet arrived; Met appears before
// Ala; the early stop releases exactly Met-Ala and leaves later codons unread.
const original=buildCellTrace({variant:0}),synonym=buildCellTrace({variant:1}),early=buildCellTrace({variant:2});
assert.deepEqual(original.expected.aminoAcids,synonym.expected.aminoAcids);
assert(sampleCell(original,6).mrna.processed&&!sampleCell(original,6).mrna.exported);assert.equal(sampleCell(original,6).chain.length,0);
assert.equal(sampleCell(original,8.999).chain.length,0);assert.deepEqual(sampleCell(original,9).chain.aminoAcids,['Met']);
assert.equal(sampleCell(original,9).translation.trna.site,'P');assert.equal(sampleCell(original,11).translation.trna.site,'A');
assert.equal(sampleCell(original,12).translation.peptidylSite,'A');assert.equal(sampleCell(original,13).translation.peptidylSite,'P');
assert(sampleCell(early,14).translation.releaseFactor.bound);assert.equal(sampleCell(early,14).chain.released,false);
assert.deepEqual(sampleCell(early,15).chain.aminoAcids,['Met','Ala']);assert(sampleCell(early,15).chain.released);assert(sampleCell(early,16).translation.recycled);
assert.equal(sampleCell(early,24).translation.readCodons,3);assert(sampleCell(early,24).codons.slice(3).every(c=>c.status==='skipped'&&!c.read&&!c.incorporated));
assert(sampleCell(original,21).chain.released);assert(sampleCell(original,22).translation.recycled);
assert.equal(original.events.find(e=>e.type==='residue-incorporated').peptideBond,false,'Initiator Met does not form a bond to a preceding residue');
assert(original.events.filter(e=>e.type==='residue-incorporated').slice(1).every(e=>e.peptideBond));
assert.equal(buildCellTrace().params.variant,0);assert.equal(buildCellTrace({},0).states.length,1);
for(const horizon of [-1,.5,25,NaN,Infinity])assert.throws(()=>buildCellTrace({},horizon),RangeError);
for(const variant of [-1,.5,3,NaN,Infinity,'bad'])assert.throws(()=>buildCellTrace({variant}),RangeError);

console.log(`Cell: all ${codonCases} standard codons, 3 variants, ${sampleCases} causal/fractional samples, first-stop termination, RNA persistence, replay and bounds passed.`);
