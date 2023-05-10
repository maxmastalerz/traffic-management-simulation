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
	const startTime = useRef(undefined);
	const prevTime = useRef(undefined);
	const simulationModeLastTick = useRef("Pre-timed");
	const simulationModeChangedLastTick = useRef(false);
	const [simulationMode, setSimulationMode] = useState("Pre-timed"); //Pre-timed, Fully-actuated, Geolocation-enabled

	let scene = useRef(null);
	let paths = useRef(null);
	let allowedPaths = useRef(null);
	var keepTryingToPlaceCars = useRef(true);
	let phaseStartTime = useRef(null);
	//var preTimedInterval = useRef(null);
	let timeTilNextPhase = useRef(null);
	var preTimedNumPhasesPassed = useRef(0);
	const preTimedPhaseTime = 5800; //Example: (0.8/0.002)+((2+4)/0.002) = 3400 for 4 cars at 0.002 speed.
									//or (0.8/0.001)+((2+3)/0.001) = 5800 for 3 cars at 0.001 speed.
	const firstPhaseLength = 8600;
	let targetPhaseTime = useRef(null); //Time for the first phase, perfect timing for west route car to arrive at intersection stop line.
	var prevFramePaths = useRef(null);
	var overshot = useRef(0);
	//let phaseNum = 0;

	//Go thru paths, get every car on these paths, remove their mesh memory(car circle) from the scene.
	//Also clear the cars from the path(unless circleMemoryOnly is set)
	const clearOldCarsFromPaths = (circleMemoryOnly = false) => {
		if(paths.current) {
			paths.current.forEach((path) => {
				path.cars.forEach((car) => {
					scene.current.remove(car.circle);
				});
				if(!circleMemoryOnly) {
					path.cars = [];
				}
			});
		}
	};

	const resetCars = () => {
		clearOldCarsFromPaths();
		if(keepTryingToPlaceCars.current === false) { //fix left over from previous simulation (if one occured)
			keepTryingToPlaceCars.current = true;
		}
	};

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
		paths.current = drawings.drawPaths(scene.current, WorldSpaceWidth, WorldSpaceHeight);

		const sourcePathObjects = [
			paths.current.filter((obj) => obj.id===1)[0],
			paths.current.filter((obj) => obj.id===11)[0],
			paths.current.filter((obj) => obj.id===21)[0],
			paths.current.filter((obj) => obj.id===31)[0]
		]

		let carPlacements = [
			[//will be placed on path 1
				new traffic.Car({id: 23, desiredDir: 'e'}), // last car to appear
				new traffic.Car({id: 22, desiredDir: 'e'}),
				new traffic.Car({id: 21, desiredDir: 'e'}),
				new traffic.Car({id: 20, desiredDir: 'e'}),
				new traffic.Car({id: 19, desiredDir: 'e'}),
				new traffic.Car({id: 18, desiredDir: 'e'}),
				new traffic.Car({id: 17, desiredDir: 'e'}),
				new traffic.Car({id: 16, desiredDir: 'e'}),
				new traffic.Car({id: 15, desiredDir: 'e'}),
				new traffic.Car({id: 14, desiredDir: 'e'}), // first car to appear
			],
			[//will be placed on path 11

			],
			[//will be placed on path 21
			],
			[//will be placed on path 31
			]
		]

		const preTimedPhases = [
			[24,4],
			[27,29,7,9],
			[14,34],
			[17,19,37,39]
		];

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
				let carsToPlace = carPlacements[i];

				if(carsToPlace.length > 0) {
					if(sourcePathObjects[i].canPlaceCar()) {
						let speed = 0.001;
						let distanceToMoveThisFrame = (speed*delta)/(sourcePathObjects[i].curvePath.length);
						let placement = { prevPathCars: carsToPlace, offset: distanceToMoveThisFrame, initialPlacement: true };

						sourcePathObjects[i].placeCarAtStart(scene.current, carsToPlace[carsToPlace.length-1], placement);
					}
				}
			}
			if(carPlacements[0].length + carPlacements[1].length + carPlacements[2].length + carPlacements[3].length === 0) { // all cars placed
				keepTryingToPlaceCars.current = false;
			}
		}

		const tick = (now) => {
			requestIdRef.current = requestAnimationFrame(tick);

			const delta = (now - prevTime.current);

			prevTime.current = now;
			if(isNaN(delta)) {
				//This makes sure all simulations are identical regardless of start time lag
				targetPhaseTime.current = now + firstPhaseLength;
				console.log("[0] now:"+now+"   target phase time:"+targetPhaseTime.current);
				
				return; // skip very first delta to prevent jumping
			}

			if(simulationMode !== simulationModeLastTick.current) { //Simulation mode changed
				simulationModeLastTick.current = simulationMode;
				timeTilNextPhase.current = null;
				preTimedNumPhasesPassed.current = 0;
				targetPhaseTime.current = now + firstPhaseLength;
				targetPhaseTime.current = targetPhaseTime.current - delta;
				simulationModeChangedLastTick.current = true;
				return;
			}
			if(simulationModeChangedLastTick.current === true) {
				targetPhaseTime.current = targetPhaseTime.current + delta;
				simulationModeChangedLastTick.current = false;
			}

			if(startTime.current === undefined) {
				startTime.current = now;
			}

			if(simulationMode === "Pre-timed") {

				if(phaseStartTime.current === null) {
					phaseStartTime.current = now;
				}

				console.log("[1] now:"+now+"   target phase time:"+targetPhaseTime.current);
				if(now >= targetPhaseTime.current) {
					overshot.current = (now - targetPhaseTime.current);
					preTimedNumPhasesPassed.current++;
					console.log("[2] phase: "+preTimedNumPhasesPassed.current%4+" (started "+overshot.current+"ms late)");
					phaseStartTime.current = now;
					//targetPhaseTime.current = (preTimedPhaseTime * (preTimedNumPhasesPassed.current + 1));
					targetPhaseTime.current = targetPhaseTime.current + preTimedPhaseTime; //(preTimedPhaseTime * (preTimedNumPhasesPassed.current + 1));
				}

				allowedPaths.current = preTimedPhases[(preTimedNumPhasesPassed.current)%4];

				timeTilNextPhase.current = targetPhaseTime.current-now+(overshot.current);

			} else if(simulationMode === "Fully-actuated") {
				return;
			} else if(simulationMode === "Geolocation-enabled") {
				return;
			}

			traffic.progressCars(paths.current, scene.current, prevFramePaths.current, delta, allowedPaths.current, timeTilNextPhase.current);

			prevFramePaths.current = paths.current;
			
			renderScene();

			if(keepTryingToPlaceCars.current === true) {
				tryPlacingNextInitialCar(delta);
			}
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
			paths.current.forEach((pathObj) => {
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

	useEffect(() => {

		
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
