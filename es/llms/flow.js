// Cue boundaries are measured from separately recorded narration segments.
export const OPERATIONS=[
  {name:['Proyectar Q · K · V','Project Q · K · V'],formula:'Q = XWQ   ·   K = XWK   ·   V = XWV',text:['La misma entrada produce tres matrices distintas. Los pesos W permanecen fijos.','The same input produces three different matrices. The weights W stay fixed.']},
  {name:['Comparar Q con K','Compare Q with K'],formula:'S = QKᵀ / √3',text:['La fila dorada compara una consulta con las claves: un producto escalar por posición. Todavía no son probabilidades.','The gold row compares one query with the keys: a dot product per position. These are not probabilities yet.']},
  {name:['Máscara + softmax','Mask + softmax'],formula:'A = softmax(S + M)   ·   Mfuture = −∞',text:['El futuro recibe −∞ antes de softmax y exactamente 0 después. Cada fila de A suma 1.','Future positions receive −∞ before softmax and exactly 0 afterward. Every row of A sums to 1.']},
  {name:['Mezclar los valores','Mix the values'],formula:'Z = AV   ·   Zᵢ = Σⱼ Aᵢⱼ Vⱼ',text:['Los coeficientes de atención ponderan filas de V. El resultado es un vector, no una palabra recuperada.','Attention coefficients weight rows of V. The result is a vector, not a retrieved word.']},
  {name:['Residual + red neuronal','Residual + feed-forward'],formula:'H = LN(X + ZWO)   ·   Y = LN(H + ReLU(HW₁)W₂)',text:['La ruta residual suma la entrada. La red transforma cada posición por separado: 6 → 12 → 6. Bloque didáctico post-norm, una cabeza.','The residual path adds the input. The network transforms each position separately: 6 → 12 → 6. Toy post-norm block, one head.']}
];
export function cueAt(cues,time){
  if(!cues?.length)return {index:0,progress:0};
  const safe=Number.isFinite(time)?Math.max(0,time):0;
  const index=Math.max(0,cues.findLastIndex(c=>safe>=c.start)),cue=cues[index];
  return {index,progress:Math.max(0,Math.min(1,(safe-cue.start)/Math.max(.001,cue.end-cue.start)))};
}
export function guideProgress(guide,clip){
  const state=guide.state==='paused'?guide.resumeState:guide.state;
  if(['waiting','ready','finished'].includes(state))return 1;
  if(guide.enabled)return Math.max(0,Math.min(1,(guide.audio?.currentTime??0)/(guide.audio?.duration||clip.duration)));
  if(state==='reading'){const reading=Math.max(6,Math.min(14,clip.text.length/32));return Math.max(0,Math.min(1,1-(guide.remaining-guide.gap)/reading));}
  return 0;
}
