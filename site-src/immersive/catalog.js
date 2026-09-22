// Only implemented worlds are advertised as available. Web notebooks remain canonical.
export const IMMERSIVE={llms:{route:'llms',stops:8}};
export function immersiveHref(id,base='../'){return Object.hasOwn(IMMERSIVE,id)?`${base}immersive/index.html?experience=${encodeURIComponent(id)}`:null;}
