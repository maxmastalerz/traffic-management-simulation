import { useEffect, useRef } from 'react';
import './App.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

function App() {
	const c = useRef();

	const update100VhToExcludeScrollbarThickness = () => {
		const getScrollbarWidth = () => {
			// Creating invisible container
			const outer = document.createElement('div');
			outer.style.visibility = 'hidden';
			outer.style.overflow = 'scroll'; // forcing scrollbar to appear
			outer.style.msOverflowStyle = 'scrollbar'; // needed for WinJS apps
			document.body.appendChild(outer);

			// Creating inner element and placing it in the container
			const inner = document.createElement('div');
			outer.appendChild(inner);

			// Calculating difference between container's full width and the child width
			const scrollbarWidth = (outer.offsetWidth - inner.offsetWidth);

			// Removing temporary elements from the DOM
			outer.parentNode.removeChild(outer);

			return scrollbarWidth;
		};

		if(window.innerWidth < 768) { //If horizontal scroll bar is present...
			//adjust the 100vh height to not include the scrollbar thickness.
			document.getElementById('vh-100-without-scrollbar').style.height = "calc( 100vh - "+getScrollbarWidth()+"px )";
		} else {
			document.getElementById('vh-100-without-scrollbar').style.height = "100vh";
		}
	}



	useEffect(() => {
		const handleResize = () => {
			update100VhToExcludeScrollbarThickness();
		};
		handleResize();
		window.addEventListener("resize", handleResize);

		let ctx = c.current.getContext("2d");

		ctx.beginPath();
		ctx.rect(0, 0, 2394, 1346);
		ctx.fillStyle = "white";
		ctx.fill();

		ctx.beginPath();
		ctx.rect(0, 0, 2394/2, 1346/2);
		ctx.fillStyle = "yellow";
		ctx.fill();

		return () => {
			window.removeEventListener('resize', handleResize);
		}
	}, []);

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
								<canvas ref={c} id="simulation" width="2394" height="1346" ></canvas>
							</Col>
						</Row>
					</Container>
				</Col>
			</Row>
		</Container>
	);
}

export default App;
