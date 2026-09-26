// Availability names actual built routes; a 3D scene alone is not a walkable world.
export const JOURNEY_IDS=['internet','electricity','microchip','cell','ideas','nuclear','carbon','evolution'];
export const IMMERSIVE={llms:{route:'llms',stops:8},...Object.fromEntries(JOURNEY_IDS.map(id=>[id,{route:'journeys',stops:4}]))};
IMMERSIVE.internet.stops=9;
export function immersiveHref(id,base='../'){
 if(!Object.hasOwn(IMMERSIVE,id))return null;
 return JOURNEY_IDS.includes(id)?`${base}journeys/index.html?topic=${encodeURIComponent(id)}&mode=immersive`:`${base}immersive/index.html?experience=${encodeURIComponent(id)}`;
}
