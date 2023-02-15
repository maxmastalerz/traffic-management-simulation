import { useEffect, useRef } from 'react';
import './App.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import update100VhToExcludeScrollbar from "./js/vhFix";

function App() {
	const canvasRef = useRef(null);
	const requestIdRef = useRef(null);
	const ballRef = useRef({ x: 20, y: 20, vx: 0.2354, vy: 0.01197, radius: 20 }); //ball goes from 20-2374 instead of 0-2394
	const startTime = useRef(undefined);
	const prevTime = useRef(undefined);
	const size = { width: 2394, height: 1346 };

	function drawBg(size) {
		this.save();
		this.beginPath();
		this.rect(0, 0, size.width, size.height);
		this.fillStyle = "#009A17";
		this.fill();
		this.restore();
	}

	function drawBall(ball) {
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
	}

	const updateBallSinceLastFrame = (now, delta) => {
		const ball = ballRef.current;
		console.log("ball.x+=" + ball.vx*delta);
		ball.x += ball.vx * delta;
		if(Math.sign(ball.vx) === 1) {
			ball.x = Math.min(ball.x, 2394-20);
		} else {
			ball.x = Math.max(ball.x, 20);
		}
		console.log("ball.x now is: "+ball.x);
		//console.log("ball.x should really be "+(20+((now-startTime.current)*0.2374)));
		//ball.y += ball.vy;
		if (ball.x + ball.radius >= size.width) {
			console.log("Hit wall at:"+(now-startTime.current));
			ball.vx = -ball.vx;
			ball.x = size.width - ball.radius;
		}
		if (ball.x - ball.radius <= 0) {
			console.log("Hit wall at:"+(now-startTime.current));
			ball.vx = -ball.vx;
			ball.x = ball.radius;
		}
		/*if (ball.y + ball.radius >= size.height) {
			ball.vy = -ball.vy;
			ball.y = size.height - ball.radius;
		}
		if (ball.y - ball.radius <= 0) {
			ball.vy = -ball.vy;
			ball.y = ball.radius;
		}*/
	};

	const tick = (now) => {
		requestIdRef.current = requestAnimationFrame(tick);

		if(startTime.current === undefined) {
			startTime.current = now;
		}
		const deltaSinceLastFrame = (now - prevTime.current);
		console.log("diff in time from last time frame: "+deltaSinceLastFrame);
		console.log("time from 1st frame:"+(now-startTime.current))
		
		prevTime.current = now;
		if(isNaN(deltaSinceLastFrame)) { // skip very first delta to prevent jumping
			return;
		}

		if(!canvasRef.current) {
			return;
		}
		const ctx = canvasRef.current.getContext("2d");

		updateBallSinceLastFrame(now, deltaSinceLastFrame);
		drawBg.call(ctx, size);
		drawBall.call(ctx, ballRef.current);
	};

	useEffect(() => {
		const handleResize = () => {
			update100VhToExcludeScrollbar();
		};
		handleResize();
		window.addEventListener("resize", handleResize);

		requestIdRef.current = requestAnimationFrame(tick);

		return () => {
			window.removeEventListener('resize', handleResize);
			cancelAnimationFrame(requestIdRef.current);
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
								{/*
								I decided on the resolution for the canvas using a resolution of 3840 wide(4K monitors).
								Since the canvas doesn't take the whole space in the html, I made it smaller.

								For width: ((3840 * (10/12)) - 8(aka1Rem)) * (9/12) = 2394
								For height: 2394 * (9/16) = Math.floor(1346.625) = 1346
								*/}
								<canvas ref={canvasRef} id="simulation" width="2394" height="1346" ></canvas>
							</Col>
						</Row>
					</Container>
				</Col>
			</Row>
		</Container>
	);
}

export default App;
