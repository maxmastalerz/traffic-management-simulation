import { useEffect, useRef } from 'react';
import { Scene, OrthographicCamera, WebGLRenderer /*, BoxGeometry, MeshBasicMaterial, Mesh*/ } from 'three';

import './App.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import update100VhToExcludeScrollbar from "./js/vhFix";
import drawings from "./js/drawings";
import traffic from "./js/traffic";

function App() {
	const mount = useRef(null);
	const requestIdRef = useRef(null);
	const startTime = useRef(undefined);
	const prevTime = useRef(undefined);

	useEffect(() => {
		let mnt = mount.current;
		let canvasCSSPixelWidth = mnt.clientWidth;
    	let canvasCSSPixelHeight = mnt.clientHeight;
    	const aspectRatio = canvasCSSPixelWidth/canvasCSSPixelHeight; // Will come out to 7/5 aspect ratio.

    	// == Begin three.js set up ==
    	const scene = new Scene();

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

		let carCircles = [];
		let bgItems = drawings.drawBg(scene, WorldSpaceWidth, WorldSpaceHeight);
		let paths = drawings.drawPaths(scene, WorldSpaceWidth, WorldSpaceHeight);

		let sourcePathObjects = [
			paths.filter((obj) => obj.id===1)[0],
			paths.filter((obj) => obj.id===11)[0],
			paths.filter((obj) => obj.id===21)[0],
			paths.filter((obj) => obj.id===31)[0]
		]

		let carPlacements = [
			[//will be placed on path 1
				new traffic.Car({id: 3, desiredDir: 's'}), // last car to appear
				new traffic.Car({id: 2, desiredDir: 'e'}),
				new traffic.Car({id: 1, desiredDir: 'n'})  // first car to appear
			],
			[//will be placed on path 11
				new traffic.Car({id: 6, desiredDir: 'w'}), // last car to appear
				new traffic.Car({id: 5, desiredDir: 's'}),
				new traffic.Car({id: 4, desiredDir: 'e'})  // first car to appear
			],
			[//will be placed on path 21
				new traffic.Car({id: 9, desiredDir: 'n'}), // last car to appear
				new traffic.Car({id: 8, desiredDir: 'w'}),
				new traffic.Car({id: 7, desiredDir: 's'})  // first car to appear
			],
			[//will be placed on path 31
				new traffic.Car({id: 12, desiredDir: 'e'}), // last car to appear
				new traffic.Car({id: 11, desiredDir: 'n'}),
				new traffic.Car({id: 10, desiredDir: 'w'})  // first car to appear
			]
		]

		var keepTryingToPlaceCars = setInterval(() => {
			for(let i=0;i<4;i++) {//for each of the cardinal directions
				let carsToPlace = carPlacements[i];

				if(carsToPlace.length > 0) {
					if(sourcePathObjects[i].canPlaceCar()) {
						sourcePathObjects[i].placeCarAtStart(scene, carsToPlace[carsToPlace.length-1], carCircles);
						carsToPlace.pop(); // remove car from queue
					}
				}
			}
			if(carPlacements[0].length + carPlacements[1].length + carPlacements[2].length + carPlacements[3].length === 0) { // all cars placed
				clearInterval(keepTryingToPlaceCars);
			}
		}, 1);

		const renderScene = () => {
			renderer.render(scene, camera);
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

			if(startTime.current === undefined) {
				startTime.current = now;
			}
			const delta = (now - prevTime.current);
			//console.log("diff in time from last time frame: "+delta);
			//console.log("time from 1st frame:"+(now-startTime.current))
			
			prevTime.current = now;
			if(isNaN(delta)) { // skip very first delta to prevent jumping
				return;
			}

			traffic.progressCars(paths, scene, delta, carCircles);
			
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
				scene.remove(bgMesh);
			});
			bgItems.geometries.forEach((bgGeometry) => {
				bgGeometry.dispose();
			});
			paths.forEach((pathObj) => {
				scene.remove(pathObj.path);
				pathObj.geometry.dispose();
			});
			carCircles.forEach((carCircle) => {
				scene.remove(carCircle);
			});
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

	return (
		<Container fluid>
			<Row id="vh-100-without-scrollbar">
				<Col className="bg-primary" xs={2}>General Settings</Col>
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
