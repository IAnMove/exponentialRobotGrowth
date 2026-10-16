// Screen-space annotation wrapping and placement; independent of the renderer.
export function wrapSceneLabel(text,maxWidth,measure){
 const lines=[];let line='';
 for(const word of text.split(/\s+/)){const next=line?line+' '+word:word;if(line&&measure(next)>maxWidth){lines.push(line);line=word;}else line=next;}
 if(line)lines.push(line);return lines;
}
export function layoutSceneLabels(labels,{width,height,obstacles=[],margin=12,gap=5,compact=false}){
 const placed=[],blocked=obstacles.slice(),inside=(v,size,limit)=>Math.max(margin,Math.min(limit-margin-size,v)),clear=(a,b)=>a.x+a.width+gap<=b.x||b.x+b.width+gap<=a.x||a.y+a.height+gap<=b.y||b.y+b.height+gap<=a.y;
 for(const label of [...labels].sort((a,b)=>(b.priority??0)-(a.priority??0)||b.width*b.height-a.width*a.height||a.id-b.id)){
  if(label.width>width-2*margin||label.height>height-2*margin)continue;
  const x0=inside(label.x-label.width/2,label.width,width),y0=inside(label.y-label.height/2,label.height,height),xs=new Set([x0,margin,width-margin-label.width]),ys=new Set([y0,margin,height-margin-label.height]);
  for(const b of blocked){xs.add(inside(b.x-label.width-gap,label.width,width));xs.add(inside(b.x+b.width+gap,label.width,width));ys.add(inside(b.y-label.height-gap,label.height,height));ys.add(inside(b.y+b.height+gap,label.height,height));}
  let best=null,score=Infinity;
  for(const x of xs)for(const y of ys){const candidate={id:label.id,x,y,width:label.width,height:label.height};if(!blocked.every(b=>clear(candidate,b)))continue;const distance=compact?y*width*width+(x+label.width/2-label.x)**2:(x+label.width/2-label.x)**2+(y+label.height/2-label.y)**2;if(distance<score){score=distance;best=candidate;}}
  if(best){placed.push(best);blocked.push(best);}
 }
 // If nearest-anchor placement strands a label, repack from the top without shrinking text.
 if(!compact&&placed.length<labels.length)return layoutSceneLabels(labels,{width,height,obstacles,margin,gap,compact:true});
 return placed;
}
