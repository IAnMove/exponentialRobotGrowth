export const NARRATIONS = {
  "district-0": {
    "title": "Mine",
    "text": "This is where the chain begins: the mine. Ore must be extracted, transported and refined before it becomes useful components. Watch the workers and the loads heading toward the refinery. A robot can cover a task and extend operating hours, but it cannot create ore or increase an excavator's capacity on its own. Once the machinery is fully occupied, additional equipment is needed. This mine represents several materials in a simplified way. The key idea is that building more robots also requires more extraction to supply them. If this input does not grow, factories further along the chain will eventually have to wait.",
    "src": "./audio/district-0-69bbad849a40.mp3",
    "duration": 40.248
  },
  "district-1": {
    "title": "Refinery and metals",
    "text": "Ore arriving from the mine is not yet ready to become a robot. Here we represent refining it into usable materials. This facility supplies all four component families in the model. Look at the available stock and the output rate. Adding robots helps when there are tasks and machines they can use. Without ore, workers wait. When equipment is at capacity, the facility needs an expansion. This is a shared dependency: a bottleneck here can slow several factories at once. That is why strengthening a common supplier can be more useful than adding workers to final assembly.",
    "src": "./audio/district-1-c456a1ede88f.mp3",
    "duration": 35.892
  },
  "district-2": {
    "title": "Robot structures",
    "text": "This factory makes the robot's structure: frames, housings and parts that support its other components. In the model it consumes refined materials and sends structures to the logistics hub. Follow the connection between the two facilities. A large stock of frames is not the same as a large number of finished robots. Motors, a battery and electronics are still needed. If this factory falls behind, kits cannot be completed. If it gets too far ahead, it builds inventory that cannot yet be used. The useful improvement is higher output across the whole chain, with its component supplies kept in balance.",
    "src": "./audio/district-2-62147bb61770.mp3",
    "duration": 38.556
  },
  "district-3": {
    "title": "Motors and actuators",
    "text": "This is where we make the mechanisms that let a robot move: motors, transmissions and joints. It is an interesting part of the loop, because existing robots can help make the mechanisms for the next generation. But materials, machines and specialized operations are still required. Watch the incoming stock and the actuator sets leaving for logistics. A new robot can only be assembled when its structure, battery and electronics are also ready. If actuators are missing, reinforcing this factory can unlock assembly. If it already has spare capacity, additional robots here will help less than strengthening the supplier that is holding back the entire chain.",
    "src": "./audio/district-3-f7603ab1cf9a.mp3",
    "duration": 40.824
  },
  "district-4": {
    "title": "Batteries",
    "text": "Robots need stored energy to work without remaining connected to a cable. This facility represents battery preparation and assembly. The simulation assumes specialized chemical inputs arrive from outside. It does not reproduce the entire real battery industry. Every robot kit needs a battery as well as the other component families. A warehouse full of motors cannot make up for missing batteries. When robots are assigned here, watch whether the number of complete kits increases, and ultimately whether more finished robots leave the network. That connection helps distinguish a local improvement from one that actually benefits the whole system.",
    "src": "./audio/district-4-86be590760bd.mp3",
    "duration": 38.484
  },
  "district-5": {
    "title": "Electronics and sensors",
    "text": "These electronics control the robot and receive information about its surroundings: controllers, sensors, connections and wiring. Specialized chip production and its equipment are compressed into this building. The simulation does not assume a robot can improvise a semiconductor factory. Look at the materials arriving and the electronic sets leaving. Every finished robot needs this component family, even when all its mechanical parts are ready. If electronics are the bottleneck, faster assembly simply means more waiting at assembly. Sustained expansion also requires these specialized suppliers, their machinery and their inputs to grow.",
    "src": "./audio/district-5-6f52545cfcb4.mp3",
    "duration": 39.384
  },
  "district-6": {
    "title": "Logistics hub",
    "text": "This hub brings together the parts needed for assembly. A complete kit requires one structure, one actuator set, one battery and one electronic set. The rule is simple: if any of the four families is missing, the kit cannot leave. Look at the stocks individually. Three components can be plentiful while very few robots are produced because the fourth is scarce. Robots assigned to logistics help prepare and move kits, but they cannot replace missing components. This explains why a production chain depends on its parts advancing together, rather than simply adding up the capacity of every factory.",
    "src": "./audio/district-6-7f1aff6668f1.mp3",
    "duration": 37.98
  },
  "district-7": {
    "title": "Robot assembly",
    "text": "Here, complete kits become assembled robots. People do the work initially. Later, robots produced by the network itself can join them. This is the start of reinvestment: part of today's output helps produce what comes next. Testing is still required before those robots can work. Watch whether assembly receives enough kits and whether its machines have spare capacity. Adding robots here does little when components arrive too slowly. Growth can accelerate when supplies, testing and machinery expand as well. Compare the strategy that reinforces the entire chain with the one that concentrates robots only in assembly.",
    "src": "./audio/district-7-5228303904d1.mp3",
    "duration": 38.736
  },
  "district-8": {
    "title": "Testing and calibration",
    "text": "An assembled robot still needs verification, calibration and commissioning. This is the final step before we count it as finished and allow it to join the workforce. Watch the bodies arriving and the rate at which they leave. If testing falls behind, faster assembly builds a backlog without expanding the available fleet as quickly. Reinforcing this stage can release that waiting production. The scene simplifies the process and does not simulate rejected units or random breakdowns. It still preserves an essential distinction: making components, assembling a robot and having an operational robot are different results.",
    "src": "./audio/district-8-491227b6d7c3.mp3",
    "duration": 37.08
  },
  "district-9": {
    "title": "Residential neighborhood",
    "text": "This neighborhood lets you follow people after they leave the industrial line. In the scenario, they rest at night and return when their shift begins. When a robot takes over a task, the person remains in the world and moves to the neighborhood or park. This represents tasks being covered, not a prediction about employment. We use one human shift to make breaks visible, although a real factory can organize several shifts. The contrast helps explain how equipment operating time changes, alongside the number of available workers.",
    "src": "./audio/district-9-3d60276cfbf4.mp3",
    "duration": 32.184
  },
  "district-10": {
    "title": "Dining hall",
    "text": "Between noon and two, people take a break to eat and travel. Watch them leave their stations and gather here. During this period, tasks covered by robots can remain active if components, machines and robots are available. That does not mean every robot works without stopping: charging and maintenance are still necessary. The scene uses simple schedules to make a difference in work organization visible. When comparing production, look at a full day. Choosing only a human break would exaggerate the difference and hide what happens during the rest of the day.",
    "src": "./audio/district-10-9410dc21d70f.mp3",
    "duration": 33.66
  },
  "district-11": {
    "title": "Charging and service",
    "text": "Robots stop too. In this example, each robot reserves two hours for charging and one for maintenance, leaving twenty-one hours available for tasks. Schedules are staggered so some robots can continue working while others are here. Watch those leaving their stations and returning to industry. A factory operating around the clock does not mean every individual robot works twenty-four hours without a break. Energy also comes from outside. As the fleet grows, electricity, chargers, spare parts and maintenance capacity must be available. Expansion requires all of this supporting infrastructure.",
    "src": "./audio/district-11-8f3b8850d0ae.mp3",
    "duration": 38.988
  },
  "district-12": {
    "title": "New robots",
    "text": "This is the departure and distribution point for finished robots. Some can return to industry to strengthen its processes; others go to different uses. This model reinvests up to seventy percent when useful capacity is available to accommodate them. New workers also need travel time before they start. Follow the robots leaving here and see which facility receives the reinforcement. The compounding effect appears when that addition allows more robots to be built, and some of those expand capacity again. If supplies or machinery are missing, reinvestment alone does not guarantee ever faster expansion.",
    "src": "./audio/district-12-d972bf6c3e91.mp3",
    "duration": 37.152
  },
  "district-13": {
    "title": "External energy",
    "text": "Every industry needs energy: extraction, processing, machinery, electronics and charging. The panels here represent an external supply. They do not establish that the district is self-sufficient or calculate its total electricity needs. This is an important simplification. As the number of robots and factories grows, a real network would also need to expand generation, distribution and connections. Think of this area as a dependency extending beyond the map. No factory reproduces in isolation. Its ability to grow also depends on infrastructure with its own materials, equipment and construction times.",
    "src": "./audio/district-13-088b01b7a555.mp3",
    "duration": 40.068
  },
  "state-working": {
    "title": "Now: in production",
    "text": "At the moment you selected, this process has work and available workers. It is producing. Look at its output and stocks. This rate can only continue while materials keep arriving and the rest of the chain has capacity to receive its work.",
    "src": "./audio/state-working-3afc62e9fd9f.mp3",
    "duration": 15.12
  },
  "state-rest": {
    "title": "Now: no available shift",
    "text": "At the moment you selected, no workers are available at this process. People are off shift or the assigned robots are taking a break. The facility needs workers to become available again before it can continue.",
    "src": "./audio/state-rest-0cc4780b5eb1.mp3",
    "duration": 11.736
  },
  "state-waiting": {
    "title": "Now: waiting for parts",
    "text": "This process is waiting for materials or parts from earlier stages. It has spare capacity, but not everything needed to use it. The useful reinforcement may belong at its suppliers, because an additional worker cannot replace a missing part.",
    "src": "./audio/state-waiting-fef2300df9f2.mp3",
    "duration": 14.868
  },
  "state-supply": {
    "title": "Now: insufficient supply",
    "text": "Materials are arriving, but not enough to use the process's full capacity. Part of the team could produce more if it received enough inputs. Check which supplier is limiting the flow before sending more robots here.",
    "src": "./audio/state-supply-c6a2412e7293.mp3",
    "duration": 12.132
  },
  "state-building": {
    "title": "Now: expansion under way",
    "text": "An expansion is under way. Some robots are working to increase the facility's capacity. The improvement is not immediate: construction must first be completed. That delay separates the decision to invest from the moment additional production becomes available.",
    "src": "./audio/state-building-c47105d3a9c7.mp3",
    "duration": 15.444
  },
  "state-full": {
    "title": "Now: machinery limit",
    "text": "Machinery is setting the maximum output this facility can achieve. Adding workers to the same equipment does not raise that limit. Further growth requires more equipment or an expansion, as well as sufficient materials.",
    "src": "./audio/state-full-c11d4593f12d.mp3",
    "duration": 14.184
  },
  "state-blocked": {
    "title": "Now: output queue full",
    "text": "This station's output queue is full. It has finished work that the next process cannot yet accept, so it must wait. Look at the next station. Adding another robot here will not remove that queue.",
    "src": "./audio/state-blocked-6b17598dc2cc.mp3",
    "duration": 12.096
  },
  "state-arriving": {
    "title": "Now: a robot is arriving",
    "text": "A robot is arriving to cover one of the tasks. During deployment it does not yet contribute output. Once it reaches its station, it can work according to its availability schedule, provided parts and machine capacity are available.",
    "src": "./audio/state-arriving-7f07e6ba1201.mp3",
    "duration": 13.392
  },
  "state-kits": {
    "title": "Now: no component kits",
    "text": "The component kits have run out. The next delivery arrives at eight in the morning. More robots cannot manufacture robots without those parts. This limit comes from outside the factory.",
    "src": "./audio/state-kits-e892e98eafde.mp3",
    "duration": 10.584
  },
  "region-overview": {
    "title": "Fourth scale: one network and several cities",
    "text": "This region brings together three cities and six types of industry. River city, Central city and Valley city receive robots from the same network. Below them are extraction, refining, components, robot factories, electricity and transport. New robots have two destinations: stay to produce or build, or travel to the cities. They cannot be in both places at once. One control reserves resources for construction; another sets the share of new robots sent out. Cities reserve tasks before dispatch, and distance introduces a delay of one, three or five cycles. Vehicles represent delivery batches. Compare the accumulated fleet with production per cycle: simply adding robots does not demonstrate acceleration. Production grows when new facilities open and suppliers can feed them. Material, energy, land and task limits remain. Everything uses illustrative assumptions, without dates or an economic forecast.",
    "src": "./audio/region-overview-fd713e68a7aa.mp3",
    "duration": 62.28
  },
  "region-0": {
    "title": "Regional extraction",
    "text": "These mines supply ore to the refineries. Every new mine expands extraction capacity, but needs construction material, workers and energy. Watch new facilities appear on the available plots. The lower chart adds together production from every mine in this region and compares it with the reference without construction. If the ore store is full, extraction stops growing even with spare equipment. More ore is only useful when refineries and later factories can use it. This model groups many different materials together. It does not represent the search for new deposits or real development timelines.",
    "src": "./audio/region-0-1a6a8c7a0573.mp3",
    "duration": 36.324
  },
  "region-1": {
    "title": "Refining and construction material",
    "text": "Here ore becomes refined material. That material has two competing destinations: components and construction. Each new facility consumes forty-eight batches, deducted when construction begins. The investment percentage also reserves part of newly refined material for future construction. A higher investment can therefore reduce immediate robot output. Once refinery expansions open, they can supply a larger network. Watch the shared inventory and the production curve. A region that wants to keep expanding must produce for its current activity and for building its future capacity.",
    "src": "./audio/region-1-fe37ff47b91d.mp3",
    "duration": 38.124
  },
  "region-2": {
    "title": "The component industry",
    "text": "This area groups the structures, actuators, batteries and electronics a robot needs. In the model, two batches of refined material become one complete kit. This is a simplification: it does not mean all real components are made in one building. If you build robot factories without expanding these suppliers, the new lines will wait for parts. Watch the kit production chart and inventory. A useful expansion is not about filling the map with buildings. It increases the flow that reaches finished robots. Specialized equipment manufacturing and some inputs are assumed available from outside the region.",
    "src": "./audio/region-2-ac4e2a03d4ca.mp3",
    "duration": 39.06
  },
  "region-3": {
    "title": "Factories producing robots",
    "text": "This is the center of the loop. Kits become robots, and every finished robot joins the regional fleet. A new facility creates more workstations and machinery for robots to use. But building capacity does not automatically mean producing at that capacity. Kits, electricity, transport and available workers are required. Compare your region's curve with the reference. The reference also reinvests all its new robots, but keeps its six facilities. Eventually it accumulates robots its machinery cannot use. Your region can invest some resources in building more capacity. The difference appears after construction is completed, and depends on the entire chain being able to supply the new facilities.",
    "src": "./audio/region-3-506b838dab6f.mp3",
    "duration": 43.128
  },
  "region-4": {
    "title": "Energy must grow too",
    "text": "The panels represent new generation facilities connected to the grid. Each adds electrical capacity per cycle. This is not a battery or a count of stored energy. Demand comes from operating workstations, buildings and construction. If demand exceeds available capacity, the model reduces both industrial output and construction speed. A new power facility does not directly produce robots, but it can allow many other facilities to use their capacity. This dependency shows why expanding the robot fleet also requires expanding its infrastructure. Weather, real power grids and specialized electrical equipment inputs are not simulated here.",
    "src": "./audio/region-4-552fafcbdf87.mp3",
    "duration": 41.076
  },
  "region-5": {
    "title": "Industrial transport and links between cities",
    "text": "Logistics plays two roles in this scene. Within industry, its capacity limits how much material can move between suppliers and factories. New transport facilities allow a larger industrial flow. Outside industry, vehicles show robots already dispatched to cities. These robots leave the industrial fleet and arrive after a fixed delay determined by their destination. Roads do not create robots or apply a growth multiplier by themselves. We do not simulate urban traffic jams: routes represent travel time. The transit counter and each city's reservations let you check that a dispatched robot is not simultaneously working in a factory and in a city.",
    "src": "./audio/region-5-2859a5af224e.mp3",
    "duration": 42.084
  },
  "region-operation": {
    "title": "Reading this facility",
    "text": "This facility is open. Its capacity adds to that of other facilities of the same type. The chart shows their combined industry output across the cycles. The light line is your region, and the dashed line is the reference without new facilities. Also check inventory, energy and transport limits. A completed factory may have spare capacity and still produce little if a necessary input is missing.",
    "src": "./audio/region-operation-c68d593cee5a.mp3",
    "duration": 27.36
  },
  "region-project": {
    "title": "An investment that is not producing yet",
    "text": "This plot has a construction project in progress. Its construction material has already been deducted from inventory. The percentage shows how much work is complete, but the facility adds no capacity until it reaches one hundred percent. Up to four robots can work on this project. The investment control limits the robots assigned to construction. If you lower it to zero, projects wait. This lets you observe the tradeoff between producing now and having more capacity later.",
    "src": "./audio/region-project-f6d06e28e926.mp3",
    "duration": 28.008
  },
  "region-city-0": {
    "title": "River city: the first arrivals",
    "text": "This city is closest to the distribution point: delivery takes one cycle. It has one hundred and eighty equivalent tasks across the same six sectors you saw in the detailed city. Proximity allows a shipment to arrive sooner, but does not give this city all the robots. Allocation balances covered tasks and reservations against each city's feasible scope. The bar grows when robots arrive, not when they are built or dispatched. Select the other cities to compare travel delays and coverage.",
    "src": "./audio/region-city-0-f33052b6cc29.mp3",
    "duration": 31.284
  },
  "region-city-1": {
    "title": "Central city: more tasks, more deliveries",
    "text": "Central city has two hundred and forty equivalent tasks. It is larger than the other two in this scenario and needs more robots to reach the same relative coverage. Deliveries take three cycles. Automatic allocation also counts robots already on the way, so the same task is not reserved more than once. The chart compares this city's coverage when the industrial network expands and when it keeps its six original facilities. We are not comparing populations or wealth: we are observing robot availability under the same allocation rules.",
    "src": "./audio/region-city-1-2ec203d3589e.mp3",
    "duration": 32.58
  },
  "region-city-2": {
    "title": "Valley city: distance matters too",
    "text": "This city has one hundred and eighty equivalent tasks and receives each delivery after five cycles. It can have robots reserved while its coverage bar is still low, because those robots are in transit. This separates manufacturing, dispatching and using robots. As the scenario advances, coverage can approach that of the other cities, but each sector retains its automation limits. If all feasible coverage is already reserved or filled, additional robots wait at the depot. A larger industrial network can offer more capacity; that does not mean every city can use it without limits.",
    "src": "./audio/region-city-2-b718dc6c5aeb.mp3",
    "duration": 36.18
  },
  "guide-factory": {
    "title": "First scale: robots making robots",
    "text": "We begin at the smallest scale: one line with five stations and ten people. Components are prepared, the structure is assembled, actuators and a battery are installed, the system is calibrated, and the finished robot is verified. Initially there are no operational robots. The first ones must pass every station before returning to work in this same factory. Press Play and watch the automatic handover. Each new robot covers a task and can help finish the next robots. This is the first reinvestment loop. But workstations, machinery and supply are limited. When those limits appear, more robots are not enough. We need to move up a scale and expand the chain supplying them. Quantities and schedules are teaching assumptions, not Tesla data or a prediction of dates.",
    "src": "./audio/guide-factory-a4bcc2990c64.mp3",
    "duration": 48.816
  },
  "guide-district": {
    "title": "Second scale: the chain that makes a robot possible",
    "text": "A robot does not make another out of nothing. This district shows its dependencies. The mine extracts ore and the refinery turns it into materials. Structures, motors, batteries and electronics are then produced. Logistics combines all four families into kits. Assembly builds robots, and testing allows them to join the workforce. New robots automatically reinforce the chain, although you can compare other strategies. Homes and the dining hall show human breaks. Charging and service remind us that robots stop too. Energy and some inputs come from outside. The compounding effect appears when more robots increase the capacity to build the next ones. If we speed up assembly alone, parts or testing can become the new limit. Sustaining expansion also requires new facilities.",
    "src": "./audio/guide-district-20f5a3a08663.mp3",
    "duration": 50.94
  },
  "robot-factory-0": {
    "title": "Prepare the next robot's kit",
    "text": "This station gathers the structure, actuators, battery, controllers and sensors. Kits arrive from external suppliers. This scene does not manufacture all those parts: the industrial district explains that step. Every finished robot consumes one kit and must pass all five stations. Two people work here initially. A robot that has already left the final station can return and cover one of their tasks. Without kits, that robot waits too. Supply is one of the limits preventing this line from growing forever.",
    "src": "./audio/robot-factory-0-87a51f5dc317.mp3",
    "duration": 32.4
  },
  "robot-factory-1": {
    "title": "Assemble the structure",
    "text": "People or robots assemble the torso, limbs and supporting structure. Watch the bodies moving along the conveyor. They are not operational robots yet: movement systems, calibration and testing are still needed. Automating this station while another is slower can fill a queue without producing many additional robots. Automatic mode reinforces stations with lower daily capacity. You can turn it off to decide where to send a robot the line itself has already finished.",
    "src": "./audio/robot-factory-1-9712d4a2394a.mp3",
    "duration": 30.852
  },
  "robot-factory-2": {
    "title": "Actuators, battery and motion",
    "text": "This station installs movement mechanisms, the battery and connections. The body begins to resemble the robot that will later work in the factory. Fast assembly is not enough: structures must arrive from the previous station and space must remain at the next. Queues show those dependencies. Robots have more available hours in this example, but charging and maintenance are still necessary. Rate differences are illustrative assumptions. The important improvement is how many operational robots the entire line can finish.",
    "src": "./audio/robot-factory-2-3b87372f5dee.mp3",
    "duration": 34.02
  },
  "robot-factory-3": {
    "title": "Calibrate and check",
    "text": "Sensors, motion and control are calibrated here. This station initially has the lowest daily capacity, so parts can pile up before it. A finished robot returning here can help release that work. Another station or supply can then become the new limit. The scene represents verification time, but does not simulate failures or rejected units. An assembled structure is not counted as an available robot until every step is complete. That distinction avoids confusing unfinished parts with real capacity to manufacture more.",
    "src": "./audio/robot-factory-3-02e841df55a1.mp3",
    "duration": 32.04
  },
  "robot-factory-4": {
    "title": "A robot ready to return to work",
    "text": "This is the final station. Completing it increases the number of robots built and makes a robot available to deploy. In automatic mode, the factory sends it to a station that still has a human task and low daily capacity. Deployment takes a short simulated time. Follow that robot as it returns to the line. Some of what the factory produced is now helping produce the next units. Once all ten tasks are covered, additional robots remain available outside the line. Machinery and supply do not multiply themselves. That is why we explore the district and the region next.",
    "src": "./audio/robot-factory-4-5f43fb38c61e.mp3",
    "duration": 35.928
  },
  "guide-city": {
    "title": "Third scale: robots arrive in a city",
    "text": "We now enter the city. Six hundred tasks begin with human workers. Industry manufactures robots and sends them to six neighborhoods. Each delivery takes time and removes a robot from the factory workforce. Press Play and follow the counters above: remaining human tasks, assigned robots and cost per task. The full hypothesis allows every represented task to be handed over, reaching zero remaining human tasks. This is a future assumption, not a proven capability or an employment forecast. The other three scopes retain human tasks. One task does not equal an entire profession. The displayed cost depends on your chosen robot cost fraction; it is not an observed price. Watch the curve accelerate as industry grows and flatten when demand is covered. Further growth needs new destinations, materials, energy and capacity.",
    "src": "./audio/guide-city-b289744638df.mp3",
    "duration": 54.324
  },
  "city-0": {
    "title": "Urban logistics",
    "text": "This sector groups delivery, sorting and warehouse tasks. Robots arrive from industry and cover part of the work represented here. Orange figures indicate human tasks and light figures indicate robot-covered tasks. We do not show autonomous vehicles solving every street. Access, driving, exceptions and supervision remain necessary conditions. The bar and chart explain how much this sector has changed under the selected hypothesis. A different outcome requires different assumptions, not an imaginary date.",
    "src": "./audio/city-0-9234199edabf.mp3",
    "duration": 34.452
  },
  "city-1": {
    "title": "Retail and food services",
    "text": "This neighborhood groups retail and food tasks: restocking, preparation and cleaning. Robots arrive from industry; they are not all assigned at the start. Partial scopes retain human tasks. The full hypothesis assumes all represented tasks can be delegated, including exceptions simplified here. This does not mean a robot currently exists that can run any shop independently. Follow the bar and counters: each delivery increases coverage up to the chosen limit.",
    "src": "./audio/city-1-2336b3fda192.mp3",
    "duration": 29.484
  },
  "city-2": {
    "title": "Construction and repair",
    "text": "This sector groups construction and repair tasks. Moving materials, performing repeatable operations and resolving surprises require different capabilities. The full hypothesis assumes represented tasks can be automated; other scenarios retain human work. New robots must be manufactured and delivered before assignment. Expansion of the supplying industry allows deliveries to accelerate. Drawing more robots does not apply a magic multiplier to all construction work.",
    "src": "./audio/city-2-2625c1eb929e.mp3",
    "duration": 29.124
  },
  "city-3": {
    "title": "Cleaning and maintenance",
    "text": "Repeatable cleaning tasks can be a destination for robots when spaces and equipment allow it. Partial scopes assign different sector limits; the full hypothesis allows every represented task to be covered. This does not prove that every breakdown, difficult access or unexpected situation is technically solved. Follow deliveries and compare human tasks with robot tasks. Industrial growth determines how many robots arrive; the selected scope determines what we allow them to do in the model.",
    "src": "./audio/city-3-101c43562a90.mp3",
    "duration": 29.448
  },
  "city-4": {
    "title": "Support in care and health",
    "text": "Here we group care and health tasks. Partial scopes automate a fraction and retain human work. The full hypothesis permits all represented tasks to be covered to explore that extreme. It does not claim current robots can replace health professionals or caregivers, nor establish that human connection, clinical judgment or responsibility can be delegated. These numbers are model units, not eliminated professions. Follow the task handover and remember that technical feasibility is an assumption independent of how many robots are available.",
    "src": "./audio/city-4-2dd50048adf3.mp3",
    "duration": 33.012
  },
  "city-5": {
    "title": "Education, services and the next scale",
    "text": "This neighborhood groups education and services. Partial scopes retain human tasks; the full hypothesis allows every unit in this example to pass to robots. This is a choice for exploring the mechanism, not a demonstration that teaching, accompanying or deciding can be completely automated. The falling curve counts remaining human tasks, not disappearing people. When it reaches zero, residents remain in the city. In the region you can observe the same allocation across three connected cities with different delivery distances.",
    "src": "./audio/city-5-fc106fe31167.mp3",
    "duration": 33.732
  },
  "factory-first-loop": {
    "title": "The first robot returns to the line",
    "text": "Watch the end of the conveyor. At first, people build the first robot. Only after it completes every station can it return and take over a task. The golden ring lets you follow its first journey. In transit, it does not produce anything yet; later it also needs charging and maintenance. When it works, part of what the factory produced helps build the next robots. That reinvestment can increase capacity. But it does not automatically multiply output across the whole line: other stations, equipment or supplies can hold it back. Available hours and hourly pace are separate advantages. Human factories can also run multiple shifts.",
    "src": "./audio/factory-first-loop-69257cebf071.mp3",
    "duration": 41.22
  },
  "district-chain-lesson": {
    "title": "Why speeding up one station may not be enough",
    "text": "Select a stage to see what it needs. The mine supplies ore, the refinery produces materials, and four industries make structures, motors, batteries and electronics. Logistics combines those families into kits; assembly and testing finish the robot. If a stage produces less than its available capacity allows, we highlight the suppliers of its scarcest inputs. The four component industries share materials: reinforcing one can increase pressure on the others. This tour explains dependencies rather than tracking an individual batch. Check working hours and equipment too. Growth can be sustained when new robots reinforce the entire supply chain, not just final assembly.",
    "src": "./audio/district-chain-lesson-fd137bdefd3b.mp3",
    "duration": 43.02
  },
  "region-growth-lesson": {
    "title": "Growing faster does not mean a constant doubling time",
    "text": "These two maps start with the same resources and advance on the same clock. One region invests robots and materials in new facilities; the other keeps its original six. Construction costs output at first, but can increase capacity later. Watch how long each region takes to go from twenty-four to forty-eight robots, then to ninety-six. The table measures each doubling interval, not the total time since the start. In sustained exponential growth, these intervals would be similar. Here resources and plots are finite, so growing more does not guarantee that pace will continue. The purple curve is an optional mathematical reference, not the result or a prediction of this simulation.",
    "src": "./audio/region-growth-lesson-d07d7113e1ec.mp3",
    "duration": 42.66
  },
  "district-productivity-lesson": {
    "title": "How much the supply chain produces compared with human work",
    "text": "This comparison starts with the same seventy-four people, stocks and equipment. In the human reference, finished robots leave the district: they do not return to work and no new facilities are built. Your strategy can deploy robots and expand facilities. The counters and chart sum output over the previous twenty-four hours, or elapsed hours at the start. Select an industry to compare its output too. In this district, a person and a robot have the same pace per active working hour. The initial difference is availability: eight human hours versus twenty-one robot hours, allowing for charging and maintenance. Parts, equipment and expansion then matter as well. The percentage therefore describes the change in output across the supply chain, not how productive an individual robot is. If the reference has not produced anything yet, we do not show a percentage.",
    "src": "./audio/district-productivity-lesson-e9edaac3c2d0.mp3",
    "duration": 55.08
  }
};
for (const item of Object.values(NARRATIONS)) item.src = new URL(item.src, import.meta.url).href;
