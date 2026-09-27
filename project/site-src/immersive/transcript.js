export function transcriptParts(clip){return clip?.segments?.length?clip.segments:[clip?.text||''];}
export function transcriptIndex(clip,seconds){if(!clip?.cues?.length)return 0;return Math.max(0,clip.cues.findLastIndex(c=>seconds>=c.start));}
// Actual recorded segment boundaries drive emphasis. Unsegmented clips show the
// full transcript, without inventing word-level timestamps.
export function createTranscript(host){let key='',active=-1;
 return {show(clip){const next=clip?.file||clip?.text||'';if(key===next)return;key=next;active=-1;host.replaceChildren(...transcriptParts(clip).map((text,i)=>{const p=document.createElement('p');p.textContent=text;p.dataset.segment=i;return p;}));host.scrollTop=0;},sync(clip,seconds){const index=transcriptIndex(clip,seconds);if(index===active)return;active=index;[...host.children].forEach((p,i)=>{p.classList.toggle('current',i===index);p.setAttribute('aria-current',String(i===index));});const p=host.children[index];if(p&&clip?.cues?.length)host.scrollTop=Math.max(0,p.offsetTop-host.offsetTop-12);}};
}
