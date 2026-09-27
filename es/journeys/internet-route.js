// Geography is real; terrestrial paths and scene layouts are illustrative.
export const PLACES = {
 madrid: {lat:40.4168,lon:-3.7038,name:'Madrid'},
 sopelana: {lat:43.38,lon:-2.98,name:'Sopelana'},
 virginia: {lat:36.85,lon:-75.98,name:'Virginia Beach'},
 ashburn: {lat:39.04,lon:-77.49,name:'Ashburn'}
};
export const CABLE_KM=6600, FIBER_KM_PER_SECOND=200000;
export const propagationMs=(km,speed=FIBER_KM_PER_SECOND)=>km/speed*1000;
export function geoPoint({lat,lon},radius=10){const a=lat*Math.PI/180,b=lon*Math.PI/180;return [radius*Math.cos(a)*Math.sin(b),radius*Math.sin(a),radius*Math.cos(a)*Math.cos(b)];}
export function greatCircle(from,to,count=100,radius=10.05){
 const a=geoPoint(from,1),b=geoPoint(to,1),angle=Math.acos(Math.max(-1,Math.min(1,a.reduce((s,v,i)=>s+v*b[i],0))));
 return Array.from({length:count+1},(_,i)=>{const t=i/count,sa=angle<1e-7?1-t:Math.sin((1-t)*angle)/Math.sin(angle),sb=angle<1e-7?t:Math.sin(t*angle)/Math.sin(angle);return a.map((v,j)=>(v*sa+b[j]*sb)*radius);});
}
export const STAGES=[
 {id:'home',scene:'city',place:['MADRID · TU CASA','MADRID · YOUR HOME'],title:['Un clic. Un viaje transatlántico.','One click. Across an ocean.'],caption:['Sigue una petición HTTPS desde este portátil hasta un servidor en Virginia.','Follow an HTTPS request from this laptop to a server in Virginia.'],badge:['Petición cifrada','Encrypted request'],fact:['HTTPS','La conexión ya está preparada','The connection is already established'],camera:[7,5.5,10],target:[0,1.2,0],distance:0},
 {id:'access',scene:'city',place:['DE CASA A LA RED','FROM HOME TO THE NETWORK'],title:['La ciudad está conectada.','The city is connected.'],caption:['Wifi → router / terminal óptico → fibra de acceso → operador.','Wifi → router / optical terminal → access fiber → operator.'],badge:['Red de acceso','Access network'],fact:['Luz','Información por fibra óptica','Light','Information over optical fiber'],camera:[16,15,23],target:[2,0,-5],distance:1},
 {id:'spain',scene:'earth',place:['MADRID → SOPELANA','MADRID → SOPELANA'],title:['Atravesamos el país.','Across the country.'],caption:['De una red a otra. Las rutas dependen de conectividad y políticas.','From network to network. Routes depend on connectivity and policies.'],badge:['Ruta terrestre ilustrativa','Illustrative terrestrial route'],fact:['BGP','Rutas entre redes','Routes between networks'],camera:[-.8,10.7,14.5],target:[-.6,6.7,7.4],distance:2},
 {id:'landing',scene:'landing',place:['SOPELANA · BIZKAIA','SOPELANA · BISCAY'],title:['La puerta del Atlántico.','The Atlantic gateway.'],caption:['Un extremo real de MAREA. Equipos ópticos conectan tierra y océano.','A real MAREA endpoint. Optical equipment connects land and ocean.'],badge:['Estación de amarre','Cable landing station'],fact:['6.600 km','Longitud aproximada de MAREA','6,600 km','Approximate MAREA cable length'],camera:[13,10,15],target:[0,0,0],distance:2},
 {id:'ocean',scene:'ocean',place:['BAJO EL ATLÁNTICO','BENEATH THE ATLANTIC'],title:['Internet también vive aquí.','The Internet lives here, too.'],caption:['Luz dentro de fibras. Repetidores que amplifican la señal bajo el mar.','Light inside fibers. Repeaters amplify the signal under the sea.'],badge:['Cable y pulsos ampliados','Enlarged cable and pulses'],fact:['≈ 33 ms','Solo propagación · un sentido','Propagation only · one way'],camera:[10,5,15],target:[0,-.4,0],distance:3},
 {id:'america',scene:'earth',place:['VIRGINIA BEACH → ASHBURN','VIRGINIA BEACH → ASHBURN'],title:['Otro continente. El mismo mensaje.','Another continent. The same message.'],caption:['El desembarco no es el destino: falta la conexión terrestre al centro de datos.','Landfall is not the destination: a terrestrial network still connects the data center.'],badge:['Llegada a Estados Unidos','United States landfall'],fact:['Virginia','Del cable al centro de datos','From cable to data center'],camera:[-16.8,12.8,3.7],target:[-7.8,6.0,1.8],distance:4},
 {id:'server',scene:'server',place:['ASHBURN · CENTRO DE DATOS','ASHBURN · DATA CENTER'],title:['Alguien tiene que responder.','Something has to answer.'],caption:['La red entrega los datos. El servicio procesa la petición y prepara la respuesta.','The network delivers the data. The service processes the request and prepares a response.'],badge:['Servidor de ejemplo','Example server'],fact:['200 OK','Respuesta preparada','Response prepared'],camera:[7,6,13],target:[0,2,-2],distance:5},
 {id:'return',scene:'earth',place:['ESTADOS UNIDOS → ESPAÑA','UNITED STATES → SPAIN'],title:['Ahora, el camino de vuelta.','Now, the journey home.'],caption:['La respuesta vuelve en verde. Podría seguir una ruta distinta de la ida.','The response returns in green. Its route could differ from the request’s route.'],badge:['Respuesta cifrada','Encrypted response'],fact:['≈ 66 ms','MAREA · propagación de ida y vuelta','MAREA · round-trip propagation'],camera:[-14.5,12,24],target:[-1,1,0],distance:6},
 {id:'render',scene:'city',place:['MADRID · DE NUEVO EN CASA','MADRID · HOME AGAIN'],title:['Y aparece una página.','And a page appears.'],caption:['Recibir, descifrar, interpretar y dibujar. Un sitio real hace más peticiones.','Receive, decrypt, interpret and render. A real site makes more requests.'],badge:['Respuesta recibida','Response received'],fact:['TCP','Flujo de bytes ordenado','Ordered byte stream'],camera:[5,4.3,8],target:[0,1.3,0],distance:7}
];
export const stageFact=(s,es)=>s.fact.length===4?[s.fact[es?0:2],s.fact[es?1:3]]:[s.fact[0],s.fact[es?1:2]];
export const SOURCES=[
 ['Telxius · MAREA (Sopelana ↔ Virginia Beach)', 'https://telxius.com/en/marea-2/'],
 ['Telxius · landing stations & backhaul', 'https://telxius.com/en/our-data-centers/'],
 ['RFC 4271 · BGP', 'https://www.rfc-editor.org/rfc/rfc4271.html'],
 ['RFC 9293 · TCP', 'https://www.rfc-editor.org/rfc/rfc9293.html'],
 ['RFC 8446 · TLS 1.3', 'https://www.rfc-editor.org/rfc/rfc8446.html'],
 ['NASA · Blue Marble', 'https://visibleearth.nasa.gov/collection/1484/blue-marble']
];
