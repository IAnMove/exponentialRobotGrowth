// An enlarged nuclear-encoded, cytosolic teaching route. The five codons are
// only a displayed fragment, not a complete gene, transcript or functional
// protein. Times separate dependencies; they are not biological seconds.
const END=24;
const alphabet='UCAG';
// NCBI translation table 1, in first/second/third-base UCAG order.
const assignments='FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';
const names={F:'Phe',L:'Leu',S:'Ser',Y:'Tyr',C:'Cys',W:'Trp',P:'Pro',H:'His',Q:'Gln',R:'Arg',I:'Ile',M:'Met',T:'Thr',N:'Asn',K:'Lys',V:'Val',A:'Ala',D:'Asp',E:'Glu',G:'Gly'};
const code={};let index=0;
for(const a of alphabet)for(const b of alphabet)for(const c of alphabet){const amino=assignments[index++];code[a+b+c]=amino==='*'?null:names[amino];}
const complement={A:'T',U:'A',C:'G',G:'C'};
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
const fraction=(time,start,end)=>clamp((time-start)/(end-start),0,1);
function boundedTime(value,horizon){const numeric=Number(value);return Number.isNaN(numeric)?0:clamp(numeric,0,horizon);}
function validateSequence(sequence){
 if(!Array.isArray(sequence))throw new TypeError('Sequence must be an array of RNA codons.');
 for(const codon of sequence)if(typeof codon!=='string'||!/^[ACGU]{3}$/.test(codon))throw new RangeError('RNA codons must contain three uppercase A, C, G or U bases.');
}

// Compatibility API: translate an already established reading frame. It does
// not search for initiation sites, and validates the whole supplied fragment.
export function translate(sequence){
 validateSequence(sequence);const amino=[];
 for(const codon of sequence){if(code[codon]===null)break;amino.push(code[codon]);}
 return amino;
}

export function buildCellTrace(p={},horizon=END){
 if(!Number.isFinite(horizon)||!Number.isInteger(horizon)||horizon<0||horizon>END)throw new RangeError('Cell horizon must be an integer from 0 to 24.');
 const variant=Number(p.variant??0);
 if(!Number.isInteger(variant)||variant<0||variant>2)throw new RangeError('Cell variant must be 0, 1 or 2.');
 const params={variant},sequence=['AUG','GCU',['UUU','UUC','UAA'][variant],'GAA','UAA'];
 const dna={coding:sequence.map(c=>c.replaceAll('U','T')),template:sequence.map(c=>[...c].map(base=>complement[base]).join('')),codingDirection:'5′→3′',templateDirection:'3′→5′'};
 const stopIndex=sequence.findIndex(c=>code[c]===null),aminoAcids=translate(sequence);
 const expected={aminoAcids,length:aminoAcids.length,stopIndex,readCodons:stopIndex+1};
 const windows=sequence.slice(0,stopIndex+1).map((codon,i)=>({index:i,codon,aminoAcid:code[codon],kind:i===0?'initiation':code[codon]===null?'termination':'elongation',start:7+3*i,bind:8+3*i,commit:9+3*i,end:10+3*i}));
 const events=[],event=(id,type,at,extra={})=>events.push({id,type,at,...extra});
 const fragment=sequence.join('');
 [...fragment].forEach((base,i)=>event(`nt-${i}`,'nucleotide-copied',(i+1)*4/15,{index:i,base,template:complement[base]}));
 event('transcribed','fragment-transcribed',4);event('processing','processing-checkpoint-completed',5);event('export-start','export-started',5);event('export-complete','export-completed',7);
 for(const w of windows){
  event(`start-${w.index}`,w.kind==='initiation'?'initiation-started':'codon-reading-started',w.start,{codonIndex:w.index,codon:w.codon});
  if(w.kind==='termination'){
   event(`recognize-${w.index}`,'stop-recognized',w.bind,{codonIndex:w.index,codon:w.codon});
   event('chain-release','chain-released',w.commit,{codonIndex:w.index,length:aminoAcids.length});event('ribosome-recycle','ribosome-recycled',w.end,{codonIndex:w.index});
  }else{
   event(`recognize-${w.index}`,'codon-recognized',w.bind,{codonIndex:w.index,codon:w.codon,aminoAcid:w.aminoAcid});
   event(`incorporate-${w.index}`,'residue-incorporated',w.commit,{codonIndex:w.index,aminoAcid:w.aminoAcid,peptideBond:w.index>0});
   event(`end-${w.index}`,w.kind==='initiation'?'initiation-completed':'ribosome-translocated',w.end,{codonIndex:w.index});
  }
 }
 events.sort((a,b)=>a.at-b.at);
 const trace={params,horizon,sequence,dna,expected,windows,releaseTime:windows.at(-1).commit,recycleTime:windows.at(-1).end,events,states:[]};
 trace.states=Array.from({length:horizon+1},(_,time)=>sampleCell(trace,time));return trace;
}

export function sampleCell(trace,value){
 const time=boundedTime(value,trace.horizon),completed=Math.floor(time),stop=trace.windows.at(-1);
 const copied=trace.events.filter(e=>e.type==='nucleotide-copied'&&e.at<=time).length;
 const window=trace.windows.find(w=>time>=w.start&&time<w.end);
 const incorporated=trace.windows.filter(w=>w.kind!=='termination'&&time>=w.commit);
 const aminoAcids=incorporated.map(w=>w.aminoAcid),released=time>=stop.commit,recycled=time>=stop.end;
 const codonIndex=time<7?null:Math.min(trace.expected.stopIndex,Math.floor((time-7)/3));
 const readCodons=trace.windows.filter(w=>time>=w.bind).length;
 const stage=window?(time<window.bind?'approaching':time<window.commit?'bound':window.kind==='termination'?'recycling':window.kind==='initiation'?'assembled':'translocating'):null;
 const trna=window&&window.kind!=='termination'?{codonIndex:window.index,codon:window.codon,aminoAcid:window.aminoAcid,kind:window.index===0?'initiator':'elongation',site:window.index===0?'P':'A',active:true,bound:time>=window.bind,progress:fraction(time,window.start,window.bind),carryingAminoAcid:time<window.commit,peptidyl:time>=window.commit}:null;
 const releaseFactor=window?.kind==='termination'?{codonIndex:window.index,kind:'eRF',site:'A',active:true,bound:time>=window.bind,progress:fraction(time,window.start,window.bind)}:null;
 const attached=aminoAcids.length>0&&!released;
 const peptidylSite=attached?(window?.kind==='elongation'&&time>=window.commit?'A':'P'):null;
 const status=time<7?'waiting':recycled?'recycled':released?'released':window?.kind==='termination'?'terminating':window?.kind==='initiation'?'initiating':'translating';
 const phase=time<4?'transcription':time<5?'processing':time<7?'export':released?'released':window?.kind==='termination'?'termination':window?.kind==='initiation'?'initiation':'translation';
 const codons=trace.sequence.map((codon,i)=>{
  const w=trace.windows[i],skipped=i>trace.expected.stopIndex&&time>=stop.bind;
  const read=!!w&&time>=w.bind,incorporated=!!w&&w.kind!=='termination'&&time>=w.commit;
  return {index:i,codon,aminoAcid:code[codon],kind:i===0?'start':code[codon]===null?'stop':'sense',status:skipped?'skipped':!w||time<w.start?'future':!read?'reading':w.kind==='termination'?'stop':'read',read,incorporated,active:window?.index===i};
 });
 const fragment=trace.sequence.join('').slice(0,copied);
 return {time,continuous:true,completed,progress:time-completed,active:time<trace.horizon,phase,
  sequence:[...trace.sequence],dna:{...trace.dna,coding:[...trace.dna.coding],template:[...trace.dna.template]},
  transcription:{progress:fraction(time,0,4),fragmentBasesCompleted:copied,nucleotidesCopied:copied,complete:time>=4},
  mrna:{fragment,processed:time>=5,exportProgress:fraction(time,5,7),exported:time>=7,location:time<5?'nucleus':time<7?'pore':'cytosol'},
  translation:{status,codonIndex,readCodons,active:time>=7&&time<stop.end,window:window?{...window,progress:fraction(time,window.start,window.end),stage}:null,trna,releaseFactor,peptidylSite,recycled},
  codons,chain:{aminoAcids,length:aminoAcids.length,attached,released,releaseTime:trace.releaseTime,recycleTime:trace.recycleTime,releaseProgress:fraction(time,stop.commit,stop.end)},
  expected:{...trace.expected,aminoAcids:[...trace.expected.aminoAcids]},events:trace.events.filter(e=>e.at<=time).map(e=>({...e}))};
}
