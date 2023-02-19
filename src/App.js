import { useEffect, useRef } from 'react';
import { Scene, OrthographicCamera, WebGLRenderer /*, BoxGeometry, MeshBasicMaterial, Mesh*/ } from 'three';

import './App.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import update100VhToExcludeScrollbar from "./js/vhFix";
import drawings from "./js/drawings";

function App() {
	const mount = useRef(null);
	const requestIdRef = useRef(null);
	//const ballRef = useRef({ x: 20, y: 20, vx: 0.2354, radius: 20 }); //ball goes from 20-2374 instead of 0-2394
	const startTime = useRef(undefined);
	const prevTime = useRef(undefined);

	/*function drawBall(ball) {
		const drawCircle = (x, y, radius, color, alpha) => {
			this.save();
			this.beginPath();
			this.arc(x, y, radius, 0, Math.PI * 2);
			this.fillStyle = color;
			this.globalAlpha = alpha;
			this.fill();
			this.closePath();
			this.restore();
		};

		drawCircle(ball.x, ball.y, ball.radius, "#444");
	}*/

	/*const updateBallSinceLastFrame = (now, delta) => {
		const ball = ballRef.current;
		//console.log("ball.x+=" + ball.vx*delta);
		ball.x += ball.vx * delta;
		if(Math.sign(ball.vx) === 1) {
			ball.x = Math.min(ball.x, 2394-20);
		} else {
			ball.x = Math.max(ball.x, 20);
		}
		//console.log("ball.x now is: "+ball.x);
		if (ball.x + ball.radius >= size.width) {
			//console.log("Hit wall at:"+(now-startTime.current));
			ball.vx = -ball.vx;
			ball.x = size.width - ball.radius;
		}
		if (ball.x - ball.radius <= 0) {
			//console.log("Hit wall at:"+(now-startTime.current));
			ball.vx = -ball.vx;
			ball.x = ball.radius;
		}
	};*/

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
		drawings.drawPaths(scene, WorldSpaceWidth, WorldSpaceHeight);

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
			const deltaSinceLastFrame = (now - prevTime.current);
			//console.log("diff in time from last time frame: "+deltaSinceLastFrame);
			//console.log("time from 1st frame:"+(now-startTime.current))
			
			prevTime.current = now;
			if(isNaN(deltaSinceLastFrame)) { // skip very first delta to prevent jumping
				return;
			}
			
			//updateBallSinceLastFrame(now, deltaSinceLastFrame);
			//drawings.drawBg.call(ctx, size);
			//drawings.drawCurves.call(ctx, scene, size);
			//drawBall.call(ctx, ballRef.current);

			//do updates to objects that are already in the scene

			//cube.rotation.x += 0.01
			//cube.rotation.y += 0.01
			
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
