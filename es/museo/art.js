// Original code-drawn artwork: each painting is a visual invitation to its topic.
export function paintingCanvas(e,es){
  const c=document.createElement('canvas');c.width=960;c.height=640;const g=c.getContext('2d');
  const bg=g.createLinearGradient(0,0,960,640);bg.addColorStop(0,'#172a43');bg.addColorStop(.55,'#101727');bg.addColorStop(1,'#070e18');g.fillStyle=bg;g.fillRect(0,0,960,640);
  const line=(x1,y1,x2,y2,color=e.color,width=2)=>{g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();};
  const disc=(x,y,r,color)=>{g.fillStyle=color;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();};
  const glow=(x,y,r,color)=>{const a=g.createRadialGradient(x,y,0,x,y,r);a.addColorStop(0,color);a.addColorStop(1,'transparent');g.fillStyle=a;g.fillRect(x-r,y-r,r*2,r*2);};
  const cube=(x,y,s,color=e.color)=>{g.fillStyle=color;g.beginPath();g.moveTo(x,y-s*.55);g.lineTo(x+s,y);g.lineTo(x,y+s*.55);g.lineTo(x-s,y);g.closePath();g.fill();g.fillStyle='#426182';g.beginPath();g.moveTo(x-s,y);g.lineTo(x,y+s*.55);g.lineTo(x,y+s*1.6);g.lineTo(x-s,y+s);g.fill();g.fillStyle='#263952';g.beginPath();g.moveTo(x+s,y);g.lineTo(x,y+s*.55);g.lineTo(x,y+s*1.6);g.lineTo(x+s,y+s);g.fill();};
  glow(510,245,350,e.color+'24');
  if(['dyson','starlink','spacex','kardashev'].includes(e.id)){
    for(let i=0;i<100;i++)disc((i*173.13)%950,(i*97.27)%480,i%7===0?2:1,'#bfd3e6');
    if(e.id==='kardashev'){
      for(let i=0;i<550;i++){const a=i*.19,r=8+i*.34;disc(480+Math.cos(a)*r*1.65,235+Math.sin(a)*r*.58,1+i%3,e.color);}
      glow(480,235,130,'#fff2c99a');disc(480,235,14,'#ffedc2');
      [1,2,3].forEach((v,i)=>{g.font='26px system-ui';g.fillStyle=e.color;g.fillText(['I · '+(es?'Planeta':'Planet'),'II · '+(es?'Estrella':'Star'),'III · '+(es?'Galaxia':'Galaxy')][i],100+i*270,450);});
    }else if(e.id==='dyson'){
      glow(480,250,180,'#ffb657aa');disc(480,250,70,'#ffd289');
      for(let k=0;k<3;k++){g.strokeStyle='#d4a56a80';g.lineWidth=2;g.beginPath();g.ellipse(480,250,190+k*32,55+k*29,k*.8,0,Math.PI*2);g.stroke();for(let i=0;i<19;i++){const a=i/19*Math.PI*2;g.save();g.translate(480+Math.cos(a)*(190+k*32),250+Math.sin(a)*(55+k*29));g.rotate(a);g.fillStyle=i%2?'#79abc3':'#d2b37d';g.fillRect(-12,-5,24,10);g.restore();}}
    }else{
      const earth=g.createRadialGradient(320,335,0,460,430,270);earth.addColorStop(0,'#93d6e4');earth.addColorStop(.5,'#306c98');earth.addColorStop(1,'#0d213b');disc(450,445,260,earth);
      g.save();g.beginPath();g.arc(450,445,260,0,7);g.clip();for(let i=0;i<15;i++){g.fillStyle='#83b09c88';g.beginPath();g.ellipse(310+i*29,340+Math.sin(i*2)*75,30,18,i,0,7);g.fill();}g.restore();
      if(e.id==='starlink'){for(let i=0;i<6;i++){const x=180+i*122,y=180-Math.sin(i)*70;g.fillStyle='#abc9da';g.fillRect(x,y,24,15);g.fillStyle='#4a82a8';g.fillRect(x-36,y-6,30,26);g.fillRect(x+30,y-6,30,26);line(x+12,y+15,440,450,'#83dad23c');}}
      else{g.save();g.translate(580,220);g.rotate(.3);g.fillStyle='#f1ede3';g.beginPath();g.moveTo(0,-140);g.quadraticCurveTo(-29,-112,-31,-70);g.lineTo(-31,100);g.lineTo(31,100);g.lineTo(31,-70);g.quadraticCurveTo(29,-112,0,-140);g.fill();g.fillStyle='#102337';g.fillRect(-30,-30,60,55);g.fillStyle='#d9e5e3';g.beginPath();g.moveTo(-30,35);g.lineTo(-67,112);g.lineTo(-30,90);g.fill();g.beginPath();g.moveTo(30,35);g.lineTo(67,112);g.lineTo(30,90);g.fill();glow(0,145,88,'#ffc885cc');g.restore();}
    }
  }else if(e.id==='llms'||e.id==='modelos'){
    const layers=e.id==='llms'?5:4;
    for(let k=0;k<layers;k++){const x=180+k*145;for(let j=0;j<4;j++){for(let n=0;n<4;n++)if(k<layers-1)line(x,125+j*74,x+145,125+n*74,j===2&&n===2?'#f8d291':'#a5b3ef28');cube(x,125+j*74,15,k===2?'#f8d291':e.color);}}
    g.font='600 25px system-ui';g.fillStyle='#f5deae';g.textAlign='center';g.fillText(es?'PREGUNTA → TOKENS → RESPUESTA':'QUESTION → TOKENS → ANSWER',480,450);g.textAlign='left';
  }else if(e.id==='mente'){
    for(let i=0;i<125;i++){const a=i*2.4,r=50+((i*29)%135),x=480+Math.cos(a)*r*1.45,y=250+Math.sin(a)*r;line(x,y,480+Math.cos(a+.7)*r,250+Math.sin(a+.7)*r,e.color+'55');disc(x,y,3+i%4,e.color);}glow(480,245,140,'#ec9fbd33');line(480,95,480,412,'#f4d5e955',3);
  }else if(e.id==='home'){
    const rooms=[[205,170],[475,170],[205,335],[475,335]];g.strokeStyle=e.color;g.lineWidth=8;g.strokeRect(190,150,550,340);line(180,150,465,30,e.color,9);line(465,30,750,150,e.color,9);
    rooms.forEach(([x,y],i)=>{g.fillStyle='#395666';g.fillRect(x,y,250,140);g.fillStyle=e.color;g.fillRect(x+30,y+70,140,40);disc(x+205,y+40,16,'#a5d9c5');line(x+205,y+60,x+205,y+100);});
  }else if(e.id==='growth'){
    for(let i=0;i<7;i++){const h=12*1.53**i;g.fillStyle=e.color;g.fillRect(200+i*83,435-h,48,h);}line(170,435,820,435,'#aac4d1');g.beginPath();g.moveTo(180,430);g.bezierCurveTo(560,415,650,250,795,70);g.strokeStyle='#f4d399';g.lineWidth=5;g.stroke();
  }else if(e.id==='terafab'){
    for(let i=0;i<6;i++)for(let j=0;j<4;j++)cube(250+i*70+j*33,115+j*70,39,j%2?e.color:'#8fabcd');g.strokeStyle='#e8d0a0';g.lineWidth=7;g.strokeRect(605,285,140,110);for(let j=0;j<8;j++){line(590,298+j*12,606,298+j*12,'#e8d0a0',3);line(745,298+j*12,760,298+j*12,'#e8d0a0',3);}
  }else{
    for(let i=0;i<3;i++){const x=275+i*210,y=145+i*32;g.fillStyle=e.color;g.fillRect(x-46,y,92,65);g.fillStyle='#0d2635';g.fillRect(x-33,y+16,66,23);disc(x-18,y+28,5,'#b4f0df');disc(x+18,y+28,5,'#b4f0df');g.fillStyle='#557584';g.fillRect(x-53,y+80,106,120);line(x-55,y+98,x-100,y+170,e.color,18);line(x+55,y+98,x+100,y+170,e.color,18);line(x-30,y+205,x-40,y+278,e.color,22);line(x+30,y+205,x+40,y+278,e.color,22);}
  }
  const shade=g.createLinearGradient(0,430,0,640);shade.addColorStop(0,'transparent');shade.addColorStop(1,'#050c18');g.fillStyle=shade;g.fillRect(0,420,960,220);
  g.fillStyle=e.color;g.font='500 18px system-ui';g.fillText('ATLAS  /  '+e.num,42,542);g.fillStyle='#f6f1e7';g.font='600 40px system-ui';g.fillText(es?e.es:e.en,40,600,865);
  return c;
}
