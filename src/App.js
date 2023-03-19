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
	const [simulationMode, setSimulationMode] = useState("Pre-timed"); //pre-timed, fully-actuated, rtk-enabled

	let scene = useRef(null);
	let paths = useRef(null);
	let allowedPaths = useRef(null);
	var keepTryingToPlaceCars = useRef(null);
	let phaseStartTime = useRef(null);
	var preTimedInterval = useRef(null);
	var preTimedNumPhasesPassed = useRef(0);
	const preTimedPhaseTime = 3400; //Example: (0.8/0.002)+((2+4)/0.002) = 3400 for 4 cars at 0.002 speed.
	let targetPhaseTime = useRef(preTimedPhaseTime);
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
		if(keepTryingToPlaceCars.current) clearInterval(keepTryingToPlaceCars.current);

		let sourcePathObjects = [
			paths.current.filter((obj) => obj.id===1)[0],
			paths.current.filter((obj) => obj.id===11)[0],
			paths.current.filter((obj) => obj.id===21)[0],
			paths.current.filter((obj) => obj.id===31)[0]
		]

		let carPlacements = [
			[//will be placed on path 1
				new traffic.Car({id: 13, desiredDir: 's'}), // last car to appear
				new traffic.Car({id: 12, desiredDir: 'n'}),
				new traffic.Car({id: 11, desiredDir: 'n'}),
				new traffic.Car({id: 10, desiredDir: 'e'}),
				new traffic.Car({id: 9, desiredDir: 'e'}),
				new traffic.Car({id: 8, desiredDir: 's'}),
				new traffic.Car({id: 7, desiredDir: 'n'}),
				new traffic.Car({id: 6, desiredDir: 'n'}),
				new traffic.Car({id: 5, desiredDir: 'e'}),
				new traffic.Car({id: 4, desiredDir: 'e'}),
				new traffic.Car({id: 3, desiredDir: 'e'}),
				new traffic.Car({id: 2, desiredDir: 'e'}),
				new traffic.Car({id: 1, desiredDir: 'e'}), // first car to appear
			],
			[//will be placed on path 11
				new traffic.Car({id: 20, desiredDir: 's'}), // last car to appear
				new traffic.Car({id: 19, desiredDir: 's'}),
				new traffic.Car({id: 18, desiredDir: 'e'}),
				new traffic.Car({id: 17, desiredDir: 'w'}),
				new traffic.Car({id: 16, desiredDir: 'w'}),
				new traffic.Car({id: 15, desiredDir: 'e'}),
				new traffic.Car({id: 14, desiredDir: 'w'}), // first car to appear
			],
			[//will be placed on path 21
				new traffic.Car({id: 27, desiredDir: 'w'}), // last car to appear
				new traffic.Car({id: 26, desiredDir: 'n'}),
				new traffic.Car({id: 25, desiredDir: 's'}),
				new traffic.Car({id: 24, desiredDir: 'n'}),
				new traffic.Car({id: 23, desiredDir: 'w'}),
				new traffic.Car({id: 22, desiredDir: 's'}),
				new traffic.Car({id: 21, desiredDir: 's'}), // first car to appear
			],
			[//will be placed on path 31
				new traffic.Car({id: 30, desiredDir: 'n'}), // last car to appear
				new traffic.Car({id: 29, desiredDir: 'w'}),
				new traffic.Car({id: 28, desiredDir: 'e'}), // first car to appear
			]
		]

		keepTryingToPlaceCars.current = setInterval(() => {
			for(let i=0;i<4;i++) {//for each of the cardinal directions
				let carsToPlace = carPlacements[i];

				if(carsToPlace.length > 0) {
					if(sourcePathObjects[i].canPlaceCar()) {
						sourcePathObjects[i].placeCarAtStart(scene.current, carsToPlace[carsToPlace.length-1]);
						carsToPlace.pop(); // remove car from queue
					}
				}
			}
			if(carPlacements[0].length + carPlacements[1].length + carPlacements[2].length + carPlacements[3].length === 0) { // all cars placed
				clearInterval(keepTryingToPlaceCars.current);
			}
		}, 1);
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

		resetCars();

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

		const tick = (now) => {
			requestIdRef.current = requestAnimationFrame(tick);

			const delta = (now - prevTime.current);

			prevTime.current = now;
			if(isNaN(delta)) { // skip very first delta to prevent jumping
				return;
			}

			if(startTime.current === undefined) {
				startTime.current = now;
			}

			//Pre-timed			
			const phases = [
				[14,34],
				[17,19,37,39],
				[24,4],
				[27,29,7,9]
			];

			if(phaseStartTime.current === null) {
				phaseStartTime.current = now;
			}

			if(now >= targetPhaseTime.current) {
				overshot.current = (now - targetPhaseTime.current);
				preTimedNumPhasesPassed.current++;
				console.log("phase: "+preTimedNumPhasesPassed.current%4+" (started "+overshot.current+"ms late)");
				phaseStartTime.current = now;
				targetPhaseTime.current = (preTimedPhaseTime * (preTimedNumPhasesPassed.current + 1));
			}

			allowedPaths.current = phases[(preTimedNumPhasesPassed.current)%4];
			let timeTilNextPhase = targetPhaseTime.current-now+(overshot.current);

			traffic.progressCars(paths.current, scene.current, prevFramePaths.current, delta, allowedPaths.current, timeTilNextPhase);

			prevFramePaths.current = paths.current;
			
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
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		resetCars();
		if(preTimedInterval.current) clearInterval(preTimedInterval.current);

		if(simulationMode === "Pre-timed") {
			//phaseNum = 4;
			/*const phases = [
				[4,24],
				[7,27],
				[9,29],
				[14,34],
				[17,37],
				[19,39],
			];
			allowedPaths.current = phases[(preTimedPhaseNum.current)%6];
			console.log("Phase: 5");

			function changePhase() {
				phaseStartTime.current = Date.now();
				
				console.log("Phase: "+((preTimedPhaseNum.current%6)+1));
				allowedPaths.current = phases[(preTimedPhaseNum.current)%6];
				//phaseNum++;

			}
			changePhase();

			preTimedInterval.current = setInterval(changePhase, phaseTime);*/
		} else if(simulationMode === "Fully-actuated") {
			//console.log("Swapping to Fully-actuated");

		} else if(simulationMode === "RTK-enabled") {
			//console.log("Swapping to RTK-enabled");

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
						<Dropdown.Item eventKey="RTK-enabled">RTK-enabled</Dropdown.Item>
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
