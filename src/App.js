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

		drawings.drawBg(scene, WorldSpaceWidth, WorldSpaceHeight);
		let paths = drawings.drawPaths(scene, WorldSpaceWidth, WorldSpaceHeight);
		let path1 = paths.filter((obj) => obj.id===1)[0];

		let carsToPlace = [
			new traffic.Car({id: 5, desiredDir: 'e'}), //last car to appear
			new traffic.Car({id: 4, desiredDir: 'n'}),
			new traffic.Car({id: 3, desiredDir: 'e'}),
			new traffic.Car({id: 2, desiredDir: 'n'}),
			new traffic.Car({id: 1, desiredDir: 'e'}) //first car to appear
		];

		var keepTryingToPlaceCars = setInterval(() => {
			if(carsToPlace.length > 0) {
				if(path1.canPlaceCar()) {
					path1.placeCarAtStart(scene, carsToPlace[carsToPlace.length-1]);
					carsToPlace.pop(); // remove car from queue
				}
			} else { // all cars placed
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

			traffic.progressCars(paths, scene, delta);
			
			renderScene();
		};

		const start = () => {
			if(!requestIdRef.current) {
				requestIdRef.current = requestAnimationFrame(tick);
			}
		}

		update100VhToExcludeScrollbar();
		
		mnt.appendChild(renderer.domElement);

		renderer.domElement.addEventListener('webglcontextlost', function (event) {
			console.log('webgl context lost');
			event.preventDefault();
			setTimeout(function () {
				console.log("RESTORING context");
				renderer.forceContextRestore();
			}, 1);
		}, false);
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
			//scene.remove(something);
			//geometry.dispose();
			//material.dispose();
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
