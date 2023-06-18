import { useEffect, useRef, useState } from 'react';
import { Scene, OrthographicCamera, WebGLRenderer /*, BoxGeometry, MeshBasicMaterial, Mesh*/ } from 'three';

import './App.css';
import { Container, DropdownButton, Dropdown, Row, Col } from 'react-bootstrap';

import update100VhToExcludeScrollbar from "./js/vhFix";
import drawings from "./js/drawings";
import traffic from "./js/traffic";

function App() {
	const mount = useRef(null);
	const requestIdRef = useRef(null);
	//const startTime = useRef(undefined);
	const prevTime = useRef(undefined);
	const simulationModeLastSeen = useRef("Pre-timed");
	const [simulationMode, setSimulationMode] = useState("Pre-timed"); //Pre-timed, Fully-actuated, Geolocation-enabled

	let scene = useRef(null);
	let simState = useRef({carStopTimes: {}, paths: null, prevFramePaths: null, printedSimResults: false});
	let allowedPaths = useRef([]);
	var keepTryingToPlaceCars = useRef(true);
	let phaseStartTime = useRef(null);
	//var preTimedInterval = useRef(null);
	let timeTilNextPhase = useRef(null);
	var preTimedNumPhasesPassed = useRef(0);
	var fullyActuatedNumPhasesPassed = useRef(0);
	const preTimedPhaseTime = 5800; //Example: (0.8/0.002)+((2+4)/0.002) = 3400 for 4 cars at 0.002 speed.
									//or (0.8/0.001)+((2+3)/0.001) = 5800 for 3 cars at 0.001 speed.
	const firstPhaseLength = 8600;//8600 for cars coming from east/west. 6083 = (5+1.4952713686069787-0.4)*1000 for cars from north/south
	let targetPhaseTime = useRef(null); //Time for the first phase, perfect timing for west route car to arrive at intersection stop line.
	let couldCalcGeolocationPhasing = useRef(false);
	let canDoEarlyCalc = useRef(true);
	let canDoRegularCalc = useRef(false);
	var overshot = useRef(0);
	//let phaseNum = 0;

	//Go thru paths, get every car on these paths, remove their mesh memory(car circle) from the scene.
	//Also clear the cars from the path(unless circleMemoryOnly is set)
	const clearOldCarsFromPaths = (circleMemoryOnly = false) => {
		if(simState.current.paths) {
			simState.current.paths.forEach((path) => {
				path.cars.forEach((car) => {
					scene.current.remove(car.circle);
				});
				if(!circleMemoryOnly) {
					path.cars = [];
				}
			});
		}
	};

	/*This makes sure that on remount(for example, when you live reload code), that the simulation phases run from the beggining.*/
	const resetSimSettings = (now) => {
		phaseStartTime.current = null;
		prevTime.current = undefined;
	}

	const resetCars = () => {
		clearOldCarsFromPaths();
		if(keepTryingToPlaceCars.current === false) { //fix left over from previous simulation (if one occured)
			keepTryingToPlaceCars.current = true;
			simState.current.printedSimResults = false;
		}
	};

	const generateCarPlacements = () => {
		let carPlacements = [
			[],//will be placed on path 1
			[],//will be placed on path 11
			[],//will be placed on path 21
			[]//will be placed on path 31
		];
		let numWCars = Math.floor(Math.random()*9)+1;
		let numNCars = Math.floor(Math.random()*6)+1;
		let numECars = Math.floor(Math.random()*9)+1;
		let numSCars = Math.floor(Math.random()*6)+1;
		for(let i=0; i<numWCars; i++) {
			carPlacements[0].unshift(new traffic.Car({id: i+1, desiredDir: ['n','e','s'][Math.floor(Math.random()*3)]}));
		}
		for(let i=0; i<numNCars; i++) {
			carPlacements[1].unshift(new traffic.Car({id: numWCars+i+1, desiredDir: ['e','s','w'][Math.floor(Math.random()*3)]}));
		}
		for(let i=0; i<numECars; i++) {
			carPlacements[2].unshift(new traffic.Car({id: numWCars+numNCars+i+1, desiredDir: ['n','s','w'][Math.floor(Math.random()*3)]}));
		}
		for(let i=0; i<numSCars; i++) {
			carPlacements[3].unshift(new traffic.Car({id: numWCars+numNCars+numECars+i+1, desiredDir: ['n','e','w'][Math.floor(Math.random()*3)]}));
		}

		return carPlacements;
	}

	useEffect(() => {
		let mnt = mount.current;
		let canvasCSSPixelWidth = mnt.clientWidth;
    	let canvasCSSPixelHeight = mnt.clientHeight;
    	const aspectRatio = canvasCSSPixelWidth/canvasCSSPixelHeight; // Will come out to 7/5 aspect ratio.

		// == Begin three.js set up ==
		scene.current = new Scene();

    	//Define orthographic frustum
		const WorldSpaceHeight = 15; // aka the view size.
		const WorldSpaceWidth = aspectRatio*WorldSpaceHeight;
		const camera = new OrthographicCamera( WorldSpaceWidth/-2, WorldSpaceWidth/2, WorldSpaceHeight/2, WorldSpaceHeight/-2, 0, 1000);
		camera.position.z = 1000; // Camera looks down the z axis in the negative(decreasing) direction.
		
		//Set up renderer
		const renderer = new WebGLRenderer();
		renderer.setClearColor('#dbdbdb'); //light grey
		renderer.setSize(canvasCSSPixelWidth, canvasCSSPixelHeight);
		renderer.setPixelRatio(window.devicePixelRatio);

		let bgItems = drawings.drawBg(scene.current, WorldSpaceWidth, WorldSpaceHeight);
		simState.current.paths = drawings.drawPaths(scene.current, WorldSpaceWidth, WorldSpaceHeight);
		let pathsLeadingUpToInt = simState.current.paths.filter((obj) => [3,6,13,16,23,26,33,36].includes(obj.id));
		let pathGroupsLeadingUpToInt = [[],[],[],[]];//[3,23],[6,26],[13,33],[16,36]
		for(let i=0; i<simState.current.paths.length; i++) {
			let path = simState.current.paths[i];
			if(path.id === 3 || path.id === 23) {
				pathGroupsLeadingUpToInt[0].push(path);
			} else if(path.id === 6 || path.id === 26) {
				pathGroupsLeadingUpToInt[1].push(path);
			} else if(path.id === 13 || path.id === 33) {
				pathGroupsLeadingUpToInt[2].push(path);
			} else if(path.id === 16 || path.id === 36) {
				pathGroupsLeadingUpToInt[3].push(path);
			}
		}

		const sourcePathObjects = [
			simState.current.paths.filter((obj) => obj.id===1)[0],
			simState.current.paths.filter((obj) => obj.id===11)[0],
			simState.current.paths.filter((obj) => obj.id===21)[0],
			simState.current.paths.filter((obj) => obj.id===31)[0]
		]

let carPlacements = [
	[
		new traffic.Car({id: 6, desiredDir: 'e'}),
		new traffic.Car({id: 5, desiredDir: 'e'}),
		new traffic.Car({id: 4, desiredDir: 'e'}),
		new traffic.Car({id: 3, desiredDir: 'e'}),
		new traffic.Car({id: 2, desiredDir: 'e'}),
		new traffic.Delay({delay: 2000}),
		new traffic.Car({id: 1, desiredDir: 'e'})
	],
	[
		new traffic.Car({id: 10, desiredDir: 's'}),
		new traffic.Car({id: 9, desiredDir: 's'}),
		new traffic.Car({id: 8, desiredDir: 's'}),
		new traffic.Car({id: 7, desiredDir: 's'}),
		new traffic.Delay({delay: 5000})
	],
	[],
	[]
]
		//let carPlacements = generateCarPlacements();

		let repr = "let carPlacements = [\n";
		for(let i=0;i<carPlacements.length;i++) {
			repr += "\t[\n";

			for(let j=0;j<carPlacements[i].length;j++) {
				repr += "\t\tnew traffic.Car({id: "+carPlacements[i][j].id+", desiredDir: '"+carPlacements[i][j].desiredDir+"'})";
				if(j!==carPlacements[i].length-1) {
					repr += ",\n";
				}
			}
			

			repr += "\n\t]";
			if(i!==carPlacements.length-1) {
				repr += ",\n";
			}
		};
		repr += "\n]";
		console.log(repr);
		
		let phasesOrdered = [//always allowed in pre timed phasing but can be restricted from running by actuated phasing.
			{pathsToAllow: [4,24], allowedByActuation: false },
			{pathsToAllow: [7,9,27,29], allowedByActuation: false },
			{pathsToAllow: [14,34], allowedByActuation: false },
			{pathsToAllow: [17,19,37,39], allowedByActuation: false }
		];

		resetSimSettings();
		resetCars(); // since the simulation mode changed, reset the cars in the simulation

		const renderScene = () => {
			renderer.render(scene.current, camera);
		}

		const handleResize = () => {
			canvasCSSPixelWidth = mnt.clientWidth;
			canvasCSSPixelHeight = mnt.clientHeight;
			renderer.setSize(canvasCSSPixelWidth, canvasCSSPixelHeight);
			renderScene();
			update100VhToExcludeScrollbar();
		};

		/*
		Tries placing one of the cars from the simulation initilization onto one of the first cardinal paths.
		*/
		const tryPlacingNextInitialCar = (delta) => {
			for(let i=0;i<4;i++) {//for each of the cardinal directions
				let carsToPlaceOrDelay = carPlacements[i];

				if(carsToPlaceOrDelay.length > 0) {
					if(carsToPlaceOrDelay[carsToPlaceOrDelay.length-1] instanceof traffic.Delay) {
						sourcePathObjects[i].mostRecentDelayRequested = sourcePathObjects[i].delayLeft = carsToPlaceOrDelay[carsToPlaceOrDelay.length-1].delay;

						carsToPlaceOrDelay.pop();//remove delay from queue.
					}

					if(sourcePathObjects[i].canPlaceCar()) {
						sourcePathObjects[i].delayLeft = (sourcePathObjects[i].delayLeft-delta > 0) ? sourcePathObjects[i].delayLeft-delta : 0;

						if(sourcePathObjects[i].delayLeft === 0) {
							let offset = 0;
							if(sourcePathObjects[i].cars[0] && sourcePathObjects[i].mostRecentDelayRequested === 0) {//If placing a follow up car(aka, NOT the first car being placed).
								//Place car exactly behind the one that is on the path already.
								offset = sourcePathObjects[i].cars[0].pos - ((1/(sourcePathObjects[i].curvePath.length*2))*2);
							}

							let placement = { prevPathCars: carsToPlaceOrDelay, offset: offset, initialPlacement: true };
							sourcePathObjects[i].placeCarAtStart(scene.current, carsToPlaceOrDelay[carsToPlaceOrDelay.length-1], placement);

							sourcePathObjects[i].mostRecentDelayRequested = 0;
						}
					}

					
				}
			}
			if(carPlacements[0].length + carPlacements[1].length + carPlacements[2].length + carPlacements[3].length === 0) { // all cars(or delays) placed
				keepTryingToPlaceCars.current = false;
			}
		}

		const carsLeftOnPaths = (paths, filter = null) => {
			if(filter) {
				paths = paths.filter((path) => filter.includes(path.id) );
			}

			let numCars = 0;
			paths.forEach((path) => {
				numCars += path.cars.length;
			});

			if(numCars > 0) {
				return true;
			}
			return false;
		}

		//Might not need this function later.
		//Cleaning up variables set in last simulation(stale values).
		const resetSharedSettings = () => {
			timeTilNextPhase.current = null;
			allowedPaths.current = [];
		};

		const resetPreTimedSettings = () => {
			preTimedNumPhasesPassed.current = 0;
		};

		const resetFullyActuatedSettings = () => {
			fullyActuatedNumPhasesPassed.current = 0;
		};

		/*Replacer function*/
		const removeCircularRefCausingPrevPath = (key, value) => {
			if (key === "prevPath") {
				return undefined;
			}
			return value;
		};

		/*
		cost is the cost to empty the phase of stopped cars denominated in the others stopping for that long.
		phaseId must be one of "4,24", "7,9,27,29", "14,34", or "17,19,37,39"
		//timeLeftToFinishCurrentPhase could adjust weighting in favour for the phase currently running, since there is a cost to completing a phase.
		*/
		const calcCtescvp = (phaseId, pairs, singles, timeLeftToFinishCurrentPhase, stoppedEstimated) => {
			let greenTimeNeeded = 0;
			let myDeterministicPath = null;

			let currentPhase = allowedPaths.current.join(",");

			if(phaseId === "4,24") {
				myDeterministicPath = "3,23";
			} else if(phaseId === "7,9,27,29") {
				myDeterministicPath = "6,26";
			} else if(phaseId === "14,34") {
				myDeterministicPath = "13,33";
			} else if(phaseId === "17,19,37,39") {
				myDeterministicPath = "16,36";
			}

			let numPairs = pairs[myDeterministicPath];
			let numSingles = singles[myDeterministicPath];

			let hasStoppedCarsInDeterministicZone = (numPairs || numSingles) ? 1 : 0;
			let hasPairsAndSinglesInDeterministicZone = (numPairs && numSingles) ? 1 : 0;
			greenTimeNeeded += (3800*hasStoppedCarsInDeterministicZone) /*+
								  (Math.max(0, numSingles-1)*1000) +
								  (Math.max(0, numPairs-1)*1000) +
								  (hasPairsAndSinglesInDeterministicZone*1000)*/; // old version counts singles/pairs and their presence

			if(phaseId === currentPhase) {
				console.log("subtracting green time of"+timeLeftToFinishCurrentPhase);
				greenTimeNeeded -= timeLeftToFinishCurrentPhase;
				greenTimeNeeded = greenTimeNeeded < 0 ? 0 : greenTimeNeeded;
			}

			//old version: uses number of stopped cars seen within the deterministic zone.
			/*let numPairsThatArentMine = 0;
			let numSinglesThatArentMine = 0;
			for(let dp in pairs) { // dp = deterministic path
				if(dp !== myDeterministicPath) {
					numPairsThatArentMine += pairs[dp];
					numSinglesThatArentMine += singles[dp];
				}
			}
			let numCarsStoppedThatArentMine = (numPairsThatArentMine*2)+numSinglesThatArentMine;*/ //deterministic only
			
			//new version: uses 33.33% and 66.66% weights for cars on a phase that are outside of the deterministic zone.
			let numCarsStoppedThatArentMine = 0;
			for(let dpe in stoppedEstimated) { // dpe = deterministic and estimated path
				if(dpe !== myDeterministicPath) {
					numCarsStoppedThatArentMine += stoppedEstimated[dpe]; //deterministic & estimated
				}
			}


			let costToRun = 0;
			if(pairs[myDeterministicPath] + singles[myDeterministicPath] > 0) {
				costToRun = greenTimeNeeded*numCarsStoppedThatArentMine;
			} else {
				costToRun = Infinity;
			}

			return { costToRun, greenTimeNeeded};
		};

		const arraysEqual = (a, b) => {
			if (a === b) return true;
			if (a == null || b == null) return false;
			if (a.length !== b.length) return false;

			//don't care about order of elements
			a.sort();
			b.sort();

			for (var i = 0; i < a.length; ++i) {
			if (a[i] !== b[i]) return false;
			}
			return true;
		};

		const tick = (now) => {
			requestIdRef.current = requestAnimationFrame(tick);

			const delta = (now - prevTime.current);
			prevTime.current = now;

			if(isNaN(delta)) {//First run(also runs on hot reload)
				if(simulationMode === "Pre-timed") {
					resetPreTimedSettings();
					targetPhaseTime.current = now + firstPhaseLength;
					console.log("[0] now:"+now+"   target phase time:"+targetPhaseTime.current);
				} else if(simulationMode === "Fully-actuated") {
					resetFullyActuatedSettings();
					targetPhaseTime.current = Infinity;
				} else if(simulationMode === "Geolocation-enabled") {
					targetPhaseTime.current = Infinity;
				}

				return; // skip very first delta to prevent jumping
			}

			if(simulationMode !== simulationModeLastSeen.current) { //Simulation mode changed
				console.log("sim mode changed");
				simulationModeLastSeen.current = simulationMode;
				
				resetSharedSettings();
				if(simulationMode === "Pre-timed") {
					targetPhaseTime.current = now + firstPhaseLength;
					resetPreTimedSettings();
				} else if(simulationMode === "Fully-actuated") {
					resetFullyActuatedSettings();
					targetPhaseTime.current = Infinity;
				} else if(simulationMode === "Geolocation-enabled") {
					targetPhaseTime.current = Infinity; //Not yet sure of the target phase time.
				}
				console.log("[0] now:"+now+"   target phase time:"+targetPhaseTime.current);

				return;
			}

			//if(startTime.current === undefined) {//Just nice to know, not currently used anywhere.
			//	startTime.current = now;
			//}

			if(simulationMode === "Pre-timed") {
				if(phaseStartTime.current === null) {
					phaseStartTime.current = now;
				}

				//console.log("[1] now:"+now+"   target phase time:"+targetPhaseTime.current);
				if(now >= targetPhaseTime.current) {
					overshot.current = (now - targetPhaseTime.current);
					preTimedNumPhasesPassed.current++;
					//console.log("[2] phase: "+preTimedNumPhasesPassed.current%4+" (started "+overshot.current+"ms late)");
					phaseStartTime.current = now;
					targetPhaseTime.current = targetPhaseTime.current + preTimedPhaseTime; //(preTimedPhaseTime * (preTimedNumPhasesPassed.current + 1));

					//console.log("Phase changed to: "+preTimedNumPhasesPassed.current);
				}

				allowedPaths.current = phasesOrdered[(preTimedNumPhasesPassed.current)%4].pathsToAllow;

				timeTilNextPhase.current = targetPhaseTime.current-now+(overshot.current);

			} else if(simulationMode === "Fully-actuated") {
				if(phaseStartTime.current === null) {
					phaseStartTime.current = now;
				}

				pathGroupsLeadingUpToInt.forEach((pathGroup) => {
					let path1Actuated = false;
					let path2Actuated = false;
					let oneUnitLength = 1/(pathGroup[0].curvePath.length);//[0] and [1] both have the same lengths since they're mirrors or each other

					//Path 1 actuation check.
					for(let i=0; i < pathGroup[0].cars.length; i++) {
						let car = pathGroup[0].cars[i];

						if(car.pos > (1-(oneUnitLength*2)-(oneUnitLength*(4/10)))) {
							path1Actuated = true;
							break;
						}
					};

					//Path 2 actuation check.
					for(let i=0; i < pathGroup[1].cars.length; i++) {
						let car = pathGroup[1].cars[i];

						if(car.pos > (1-(oneUnitLength*2)-(oneUnitLength*(4/10)))) {
							path2Actuated = true;
							break;
						}
					};

					phasesOrdered = phasesOrdered.map((phase) => {
						if(phase.pathsToAllow.includes(pathGroup[0].id+1)) {
							
							if(!(path1Actuated || path2Actuated)) {//If neither paths are actuated,
								//if current phase that is running right now unactuated
								if(allowedPaths.current.includes(pathGroup[0].id+1) && targetPhaseTime.current === Infinity) {
									targetPhaseTime.current = now + 3400; //todo fix: make 3800 dynamic depending on speed and maximum path length for phase.
									console.log(`Unactuated: Target phase time = ${targetPhaseTime.current}`);
								}
							} else {
								if(allowedPaths.current.includes(pathGroup[0].id+1)) {
									targetPhaseTime.current = Infinity;
									timeTilNextPhase.current = Infinity;
								}
							}

							if(now < targetPhaseTime.current) {
								//Override actuation as active given that the cars haven't cleared the intersection yet.
								return { pathsToAllow: phase.pathsToAllow, allowedByActuation: true };
							} else {
								return { pathsToAllow: phase.pathsToAllow, allowedByActuation: (path1Actuated || path2Actuated) };
							}
						}
						return phase;
					});
				});

				let numPotentialPhasesSearched = 0;
				while(phasesOrdered[fullyActuatedNumPhasesPassed.current%4].allowedByActuation === false && numPotentialPhasesSearched<4) {
					fullyActuatedNumPhasesPassed.current++;
					numPotentialPhasesSearched++;
				}
				if(numPotentialPhasesSearched === 4) {
					if(allowedPaths.current.length > 0) { //Makes sure we only print message once
						console.log("Not allowing any more phases until another actuation occurs.");
						allowedPaths.current = [];
					}
				} else if(now >= targetPhaseTime.current || targetPhaseTime.current === Infinity) {
					if(!arraysEqual(allowedPaths.current, phasesOrdered[fullyActuatedNumPhasesPassed.current%4].pathsToAllow)) {
						console.log("Allowing phase: "+JSON.stringify(phasesOrdered[fullyActuatedNumPhasesPassed.current%4].pathsToAllow));
					}
					allowedPaths.current = phasesOrdered[fullyActuatedNumPhasesPassed.current%4].pathsToAllow;
				}
				
			} else if(simulationMode === "Geolocation-enabled") {
				if(carsLeftOnPaths(simState.current.paths, [1,2,3,6,11,12,13,16,21,22,23,26,31,32,33,36])) {

					let numStoppedCarsInPathsDeterministic = {};
					//past the deterministic range we have to weigh the stopped cars 33.33% and 66.67%
					let numStoppedCarsInPathsEstimatedPastDeterministic = {}
					pathsLeadingUpToInt.forEach((path) => {
						path.cars.forEach((car) => {
							if((car.pos === 0.9 && [6,16,26,36].includes(path.id)) || (car.pos === (26/30) && [3,13,23,33].includes(path.id))) {

								//Sets calculation flag so we only run one phasing calculation for each time a car hits the decision location.
								if(simState.current.prevFramePaths) {
									let prevPath = simState.current.prevFramePaths.filter((prevPath) => prevPath.id === path.id)[0];
									let prevPathCar = prevPath.cars.filter((prevPathCar) => prevPathCar.id === car.id)[0];
									if(prevPathCar.pos !== car.pos) {
										couldCalcGeolocationPhasing.current = true;
									}
								}

								numStoppedCarsInPathsDeterministic[path.id] = 1;
								numStoppedCarsInPathsEstimatedPastDeterministic[path.id] = 1;
								let stopPosInPath = [6,16,26,36].includes(path.id) ? 0.9 : 26/30; //0.9 or (26/30)=0.866.
								numStoppedCarsInPathsDeterministic[path.id] += path.getNumImmediateFollowersDetermistic(stopPosInPath);
								numStoppedCarsInPathsEstimatedPastDeterministic[path.id] += path.getNumImmediateFollowersEsimatedPastDeterministic(stopPosInPath, path.id);
							}
						});
					});
					
					//Allows for another calculation to be 2.8 seconds out from the phase ending,
					//lets us calculate again to see whether the phase should be extended
					//console.log("now:"+now+" discounted target phase time: "+(targetPhaseTime.current-2800));

					let currentDiscount = Math.max(2800, 2800+Math.floor((timeTilNextPhase.current-2800)/1000)*1000);
					//Old version, if you use this instead of the above, also update the greentime needed formula in calcCtescvp
					//let currentDiscount = 2800;

					if(now >= targetPhaseTime.current-currentDiscount && canDoEarlyCalc.current) {
						console.log("Doing another calculation as there might be a possibility on continuing the current phase");
						couldCalcGeolocationPhasing.current = true;
						canDoEarlyCalc.current = false;
					}
					if(now >= targetPhaseTime.current && canDoRegularCalc.current) {
						console.log("Doing another calculation as phase finished.");
						couldCalcGeolocationPhasing.current = true;
						canDoRegularCalc.current = false;
					}

					if(couldCalcGeolocationPhasing.current &&
						(now >= targetPhaseTime.current-currentDiscount || targetPhaseTime.current === Infinity)
					) {
						console.log("numStoppedCarsInPathsEstimatedPastDeterministic:");
						console.log(numStoppedCarsInPathsEstimatedPastDeterministic);
						//console.log(numStoppedCarsInPathsDeterministic);
						let timeLeftToFinishCurrentPhase = targetPhaseTime.current-now;
						
						let pairs = {};
						let singles = {};

						let stoppedEstimated = {};

						let pathGroupings = [[3,23],[6,26],[13,33],[16,36]];
						pathGroupings.forEach((pathGroup) => {
							let firstPathStoppedCarsDeterministic = numStoppedCarsInPathsDeterministic[pathGroup[0]] ?? 0; 
							let secondPathStoppedCarsDeterministic = numStoppedCarsInPathsDeterministic[pathGroup[1]] ?? 0;

							let firstPathStoppedCarsEstimated = numStoppedCarsInPathsEstimatedPastDeterministic[pathGroup[0]] ?? 0;
							let secondPathStoppedCarsEstimated = numStoppedCarsInPathsEstimatedPastDeterministic[pathGroup[1]] ?? 0;


							pairs[pathGroup[0]+","+pathGroup[1]] = Math.min( //pairs["13,33"] = Math.min(4,5);
								firstPathStoppedCarsDeterministic,
								secondPathStoppedCarsDeterministic
							);
							singles[pathGroup[0]+","+pathGroup[1]] = Math.abs(//singles["13,33"] = Math.abs(4-5);
								firstPathStoppedCarsDeterministic - secondPathStoppedCarsDeterministic
							);
							stoppedEstimated[pathGroup[0]+","+pathGroup[1]] = firstPathStoppedCarsEstimated+secondPathStoppedCarsEstimated;
						});
						
						//cost to empty stopped cars via paths, also includes how long to run the phase for to exhaust it based on initial look.
						//todo: may need to recalculate once green time finishes, this is because other stopped cars came into the picture that weren't decidable
						//when we first looked at intersection.
						let ctescvp = {
							"4,24": calcCtescvp("4,24", pairs, singles, timeLeftToFinishCurrentPhase, stoppedEstimated),
							"7,9,27,29": calcCtescvp("7,9,27,29", pairs, singles, timeLeftToFinishCurrentPhase, stoppedEstimated),
							"14,34": calcCtescvp("14,34", pairs, singles, timeLeftToFinishCurrentPhase, stoppedEstimated),
							"17,19,37,39": calcCtescvp("17,19,37,39", pairs, singles, timeLeftToFinishCurrentPhase, stoppedEstimated)
						}

						//find cheapest
						//console.log(ctescvp);
						let cheapestEmptyingGroupId = Object.keys(ctescvp).reduce((accum, curr) => {
							if(ctescvp[accum].costToRun < ctescvp[curr].costToRun) {
								return accum;
							} else {
								return curr;
							}
						});

						console.log(`Should run ${cheapestEmptyingGroupId} for ${ctescvp[cheapestEmptyingGroupId].greenTimeNeeded}ms as it's cost is ${ctescvp[cheapestEmptyingGroupId].costToRun}(cheapest)` );

						let targetPhaseTimeBase = targetPhaseTime.current === Infinity ? now : targetPhaseTime.current;	//might be an ugly now value that affects sim time being reproducible?
						if(now >= targetPhaseTime.current || targetPhaseTime.current === Infinity) {
							allowedPaths.current = cheapestEmptyingGroupId.split(',').map((str) => parseInt(str));
							targetPhaseTime.current = targetPhaseTimeBase + ctescvp[cheapestEmptyingGroupId].greenTimeNeeded;
							canDoEarlyCalc.current = true;
							
						} else {
							if(cheapestEmptyingGroupId === allowedPaths.current.join(',')) {
								targetPhaseTime.current = targetPhaseTimeBase + ctescvp[cheapestEmptyingGroupId].greenTimeNeeded;
							}
						}
						canDoRegularCalc.current = true;

						couldCalcGeolocationPhasing.current = false;
					}
					timeTilNextPhase.current = targetPhaseTime.current-now;
					//console.log("timeTilNextPhase: "+timeTilNextPhase.current);
				}
			}

			if(keepTryingToPlaceCars.current === true) {
				tryPlacingNextInitialCar(delta);
			}

			if(carsLeftOnPaths(simState.current.paths)) {
				simState.current.prevFramePaths = JSON.parse(JSON.stringify(simState.current.paths, removeCircularRefCausingPrevPath)); //store paths from last frame (deep clone)
				traffic.progressCars(simState.current, scene.current, delta, allowedPaths.current, timeTilNextPhase.current);
			} else {
				if(simState.current.printedSimResults === false) {
					console.log("Finished simulating. Car stop times:");
					console.log(simState.current.carStopTimes);

					let totalStopTime = 0;
					for(let carId in simState.current.carStopTimes) {
						totalStopTime += simState.current.carStopTimes[carId];
					}
					let averageStopTime = totalStopTime/Object.keys(simState.current.carStopTimes).length;

					console.log(`Total time spent stopped by all cars: ${totalStopTime/1000}s.`);
					console.log(`Average time spent stopped by a car: ${averageStopTime/1000}s.`);

					simState.current.printedSimResults = true;
				}
			}
			
			renderScene();
		};

		const start = () => {
			if(!requestIdRef.current) {
				requestIdRef.current = requestAnimationFrame(tick);
			}
		}

		update100VhToExcludeScrollbar();
		
		mnt.appendChild(renderer.domElement);

		window.addEventListener("resize", handleResize);
		start();

		return () => {
			cancelAnimationFrame(requestIdRef.current);
			requestIdRef.current = null;

			window.removeEventListener('resize', handleResize);

			if (mnt) {
				mnt.removeChild(renderer.domElement);
			}
			
			//remove objects from scene
			bgItems.meshes.forEach((bgMesh) => {
				scene.current.remove(bgMesh);
			});
			bgItems.geometries.forEach((bgGeometry) => {
				bgGeometry.dispose();
			});
			simState.current.paths.forEach((pathObj) => { // eslint-disable-line react-hooks/exhaustive-deps
				scene.current.remove(pathObj.path);
				pathObj.geometry.dispose();
			});
			clearOldCarsFromPaths(true);
			traffic.carGeometry.dispose();
			for(let name in traffic.carMaterials) {
				let material = traffic.carMaterials[name];
				material.dispose();
			}
			for(let i=0;i<drawings.bgAndPathMaterials.length;i++) {
				let material = drawings.bgAndPathMaterials[i];
				material.dispose();
			}
			drawings.squareGeometry.dispose();
		}
	}, [simulationMode]); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<Container fluid>
			<Row id="vh-100-without-scrollbar">
				<Col className="bg-primary" xs={2}>
					General Settings<br/>
					<DropdownButton id="simulation-mode-dropdown" title={simulationMode} variant="warning" onSelect={setSimulationMode}>
						<Dropdown.Item eventKey="Pre-timed">Pre-timed</Dropdown.Item>
						<Dropdown.Item eventKey="Fully-actuated">Fully-actuated</Dropdown.Item>
						<Dropdown.Item eventKey="Geolocation-enabled">Geolocation-enabled</Dropdown.Item>
					</DropdownButton>

				</Col>
				<Col className="bg-info px-0" xs={10}>
					<Container fluid className="ps-2 pe-0 h-100">
						<Row id="simulation-row-1" className="px-0 m-auto">
							<Col xs={3} className="px-0 bg-secondary"></Col>
							<Col xs={9} className="px-0">North/South Settings</Col>
						</Row>
						<Row id="simulation-row-2" className="px-0 m-auto">
							<Col xs={3} className="px-0">East/West Settings</Col>
							<Col xs={9} className="px-0">
								<div ref={mount} id="canvas-container"></div>
							</Col>
						</Row>
					</Container>
				</Col>
			</Row>
		</Container>
	);
}

export default App;
