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
  "factory-0": {
    "title": "Component preparation",
    "text": "This is the first station in the phone factory. A kit is prepared with the circuit board, RAM, sensors and other required components. The screen and battery will be installed later. In this scenario components arrive from outside: we begin with one hundred and sixty kits and receive up to one hundred and sixty more each day. A robot can cover the task of one of the station's two people, but it cannot manufacture components that have not arrived. Watch the available kits and the parts waiting before assembly. Preparing more kits only improves final output if the following stations can process them.",
    "src": "./audio/factory-0-3b286266ddd0.mp3",
    "duration": 37.476
  },
  "factory-1": {
    "title": "Phone assembly",
    "text": "Here the circuit board goes into the housing and the phone's components are connected. The two people share the station's work. You can add one robot to cover one task, then another to cover the second. In this example each robot works faster and has more available hours, but machinery also has a limit. Watch the queue at the next station and count the phones leaving packaging. If testing is the bottleneck, faster assembly can create many unfinished units and very few additional phones. An improvement at this station does not automatically become the same improvement for the whole factory.",
    "src": "./audio/factory-1-b36352ac15e0.mp3",
    "duration": 34.416
  },
  "factory-2": {
    "title": "Screen and battery",
    "text": "The phone receives its screen and battery here, and its housing is closed. Each arriving unit has already passed preparation and assembly. Waiting parts show how much work is available to this station. If its queue is empty, adding a robot does not guarantee more output: phones must first arrive from assembly. If its exit fills up, the problem is further down the line. Space between stations is limited, so a backlog eventually forces earlier stations to stop. Watch how a local decision spreads through the line, then compare finished phones over a full day.",
    "src": "./audio/factory-2-cd6c57fb9c2f.mp3",
    "duration": 34.308
  },
  "factory-3": {
    "title": "Phone testing",
    "text": "This station checks the screen, charging, cameras and connections. In the initial configuration it has the lowest daily capacity on the line. That is why parts often pile up in front of it even when assembly is working quickly. Adding robots here can increase finished phones until another station or the component supply becomes the new limit. Watch the queue before and after the change, and compare it with output from packaging. The simulation does not introduce defective phones: it represents the time needed to test them. We want to discover where reinforcing the chain improves its final result.",
    "src": "./audio/factory-3-ec3116cba221.mp3",
    "duration": 36.072
  },
  "factory-4": {
    "title": "Packaging and dispatch",
    "text": "This is the final station. Phones that have passed testing are protected and packaged for dispatch. Only when they finish here does the production counter increase. This avoids confusing a warehouse of unfinished parts with useful output. Compare your factory with the same line staffed only by humans, at the same moment. The twenty-four-hour trial answers a different question: how much would each configuration produce if maintained for a whole day from the start? It includes breaks and waiting. If packaging is waiting for phones, reinforcing it will not solve a bottleneck earlier in the line.",
    "src": "./audio/factory-4-f27394b1c126.mp3",
    "duration": 38.052
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
    "text": "The component kits have run out. The next delivery arrives at eight in the morning. More robots cannot manufacture phones without those parts. This limit comes from outside the factory.",
    "src": "./audio/state-kits-a036ec7c887d.mp3",
    "duration": 10.98
  },
  "region-overview": {
    "title": "A region that expands its capacity",
    "text": "Until now we watched robots take on tasks inside a factory. Here we move up a scale. We begin with twenty-four robots and six facilities already built. New robots can reinforce production or help build new facilities. The investment control reserves a maximum share of the fleet for construction and the same share of refined material for future facilities. Initially, investing can reduce the robots you finish: workers and materials are diverted from production. But when construction finishes, capacity exists that was not there before. More capacity can produce more robots, and those robots can help build more facilities. The chart compares your region with one that keeps its original six facilities. Improvement is not guaranteed. Extraction, components, energy and transport must expand too. Plots are finite, and cycles compress the process without representing days or years. This explains a mechanism of compounding growth, not an economic forecast.",
    "src": "./audio/region-overview-69732f99f77f.mp3",
    "duration": 64.656
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
    "title": "Transport between industries",
    "text": "This network connects mines, refineries, component producers and robot factories. Vehicles represent cargo flow, not exact individual deliveries. The bar compares the potential flow facilities could require with available transport capacity. When demand exceeds one hundred percent, logistics reduces the industrial rate. Expanding transport can unlock capacity at several factories at once. A logistics facility also needs workers, materials and construction time. The region grows as a network of connected processes. Adding buildings without being able to exchange their products does not complete the loop.",
    "src": "./audio/region-5-0c10ed1afe14.mp3",
    "duration": 39.276
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
  }
};
for (const item of Object.values(NARRATIONS)) item.src = new URL(item.src, import.meta.url).href;
