import {
	PlaneGeometry, MeshBasicMaterial, DoubleSide, Mesh, Shape, ShapeGeometry, Vector3, CurvePath, CubicBezierCurve3, LineCurve3,
	BufferGeometry, Line, LineBasicMaterial
} from 'three';
import traffic from "./traffic";

const bgAndPathMaterials = [
	new MeshBasicMaterial( {color: 0xA8FF93, side: DoubleSide} ), //light green box
	new MeshBasicMaterial( {color: 0x8AFC6E, side: DoubleSide} ), //darker green box
	new MeshBasicMaterial( {color: 0x807E78, side: DoubleSide} ), //asphalt grey road
	new LineBasicMaterial( { color: 0xffffff } ), // White line
	new LineBasicMaterial( { color: 0x000000 } ), // Black line
	new LineBasicMaterial( { transparent: true, opacity: 0 } ), // Transparent Line (For cars to follow)
	new LineBasicMaterial( { color: 0xff0000 } ), //4 ,24       phase
	new LineBasicMaterial( { color: 0xff0000 } ), //7 ,9 ,27,29 phase
	new LineBasicMaterial( { color: 0xff0000 } ), //14,34       phase
	new LineBasicMaterial( { color: 0xff0000 } )  //17,19,37,39 phase
];

const squareGeometry = new PlaneGeometry( 1, 1 );

function drawStorageBayTaperAndMissingBg(scene, rotationOnZAxis, bgItems) {
	//the storage bay starts (Math.sqrt(2)-1 earlier to make diagonal lane remain at 1 unit of width
	const x = -5.5-(Math.sqrt(2)-1), y = -0.5; //Default start position for drawing the tile

	//Fill in missing background:
	const missingBg = new Shape();
	missingBg.moveTo( x, y );
	missingBg.bezierCurveTo(x+0.5,y,x+0.5,y+1,x+1,y+1);
	missingBg.lineTo( x, y+1 );

	const missingBgTriangleGeometry = new ShapeGeometry( missingBg );
	bgItems.geometries.push(missingBgTriangleGeometry);
	const missingBgMesh = new Mesh( missingBgTriangleGeometry, bgAndPathMaterials[0] ) ;

	missingBgMesh.rotateOnWorldAxis(new Vector3(0, 0, 1), rotationOnZAxis);
	scene.add( missingBgMesh );
	bgItems.meshes.push(missingBgMesh);

	//Storage Bay Taper:
	const storageBayTaper = new Shape();
	storageBayTaper.moveTo( x, y );
	storageBayTaper.bezierCurveTo(x+0.5,y,x+0.5,y+1,x+1,y+1);
	storageBayTaper.lineTo( x+1, y );

	const storageBayTaperTriangleGeometry = new ShapeGeometry( storageBayTaper );
	bgItems.geometries.push(storageBayTaperTriangleGeometry);
	const storageBayTaperMesh = new Mesh( storageBayTaperTriangleGeometry, bgAndPathMaterials[2] ) ;

	storageBayTaperMesh.rotateOnWorldAxis(new Vector3(0, 0, 1), rotationOnZAxis);
	scene.add( storageBayTaperMesh );
	bgItems.meshes.push(storageBayTaperMesh);

	//Storage Bay Taper missing road piece
	const storageBayTaperMissingRoad = new Shape();
	storageBayTaperMissingRoad.moveTo( x+1, y );
	storageBayTaperMissingRoad.lineTo( x+1, y+1 );
	storageBayTaperMissingRoad.lineTo( x+1+(Math.sqrt(2)-1), y+1 );
	storageBayTaperMissingRoad.lineTo( x+1+(Math.sqrt(2)-1), y );

	const storageBayTaperMissingRoadGeometry = new ShapeGeometry( storageBayTaperMissingRoad );
	bgItems.geometries.push(storageBayTaperMissingRoadGeometry);
	const storageBayTaperMissingRoadMesh = new Mesh( storageBayTaperMissingRoadGeometry, bgAndPathMaterials[2] ) ;

	storageBayTaperMissingRoadMesh.rotateOnWorldAxis(new Vector3(0, 0, 1), rotationOnZAxis);
	scene.add( storageBayTaperMissingRoadMesh );
	bgItems.meshes.push(storageBayTaperMissingRoadMesh);
}

function drawBg(scene, WorldSpaceWidth, WorldSpaceHeight) {
	let bgItems = {
		meshes: [],
		geometries: []
	};
	const map = [
		[0,1,0,1,0,1,0,1,0,2,0,2,0,1,0,1,0,1,0,1,0],
		[1,0,1,0,1,0,1,0,1,2,1,2,1,0,1,0,1,0,1,0,1],
		[0,1,0,1,0,1,0,1,0,2,3,2,0,1,0,1,0,1,0,1,0],
		[1,0,1,0,1,0,1,0,1,2,2,2,1,0,1,0,1,0,1,0,1],
		[0,1,0,1,0,1,0,1,0,2,2,2,0,1,0,1,0,1,0,1,0],
		[1,0,1,0,1,0,1,0,1,2,2,2,1,0,1,0,1,0,1,0,1],
		[2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
		[1,0,1,0,1,6,2,2,2,2,2,2,2,2,2,4,1,0,1,0,1],
		[2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
		[1,0,1,0,1,0,1,0,1,2,2,2,1,0,1,0,1,0,1,0,1],
		[0,1,0,1,0,1,0,1,0,2,2,2,0,1,0,1,0,1,0,1,0],
		[1,0,1,0,1,0,1,0,1,2,2,2,1,0,1,0,1,0,1,0,1],
		[0,1,0,1,0,1,0,1,0,2,5,2,0,1,0,1,0,1,0,1,0],
		[1,0,1,0,1,0,1,0,1,2,1,2,1,0,1,0,1,0,1,0,1],
		[0,1,0,1,0,1,0,1,0,2,0,2,0,1,0,1,0,1,0,1,0]
	];

	for(var i=0;i<map.length;i++) {
		for(var j=0; j<map[i].length;j++) {
			if(map[i][j] <= 2) { //Square shaped boxes
				let material = bgAndPathMaterials[ map[i][j] ];
				const plane = new Mesh( squareGeometry, material );
				plane.position.set(j-(WorldSpaceWidth/2)+0.5,-i+(WorldSpaceHeight/2)-0.5);
				scene.add( plane );
				bgItems.meshes.push(plane);
			} else if(map[i][j] >= 3) { //Storage bay tapers
				let rotationOnZAxis = -(map[i][j]-3)*Math.PI/2;
				drawStorageBayTaperAndMissingBg(scene, rotationOnZAxis, bgItems);
			}
		}
	}

	return bgItems;
}

function drawPaths(scene, WorldSpaceWidth, WorldSpaceHeight) {
	let paths = [];
	//north, east, south, west mapping to path changes depending from which direction you are coming from
	const desiredDirRotation  = [['n','e','s'],['e','s','w'],['s','w','n'],['w','n','e']];

	for(let i=0;i<4;i++) { //For each cardinal direction, create rotated paths
		let rotationOnZAxis = -i*(Math.PI/2);
		let rotationAxis = new Vector3( 0, 0, 1 );
		let shortenPath1By = 0;
		let shortenPath8By = 0;
		let extendPath10By = 0;
		let extendPath5By = 0;
		if(i === 1 || i === 3) { //If north or south, have a shorten lead in to intersection.
			shortenPath1By = 3;
			shortenPath8By = 3;
			extendPath10By = 3;
			extendPath5By = 3;
		}

		//5
		let ptAfor5 = new Vector3( 11.5 -(WorldSpaceWidth/2), -6 +(WorldSpaceHeight/2), 1 );
		let ptBfor5 = new Vector3( 11.5 -(WorldSpaceWidth/2), 0 + extendPath5By +(WorldSpaceHeight/2), 1 );
		ptAfor5.applyAxisAngle( rotationAxis, rotationOnZAxis );
		ptBfor5.applyAxisAngle( rotationAxis, rotationOnZAxis );
		const path5LineCurve = new LineCurve3(ptAfor5, ptBfor5);

		const path5Points = new CurvePath();
		path5Points.add(path5LineCurve);
		let points5 = path5Points.curves.reduce((p, d)=> [...p, ...d.getPoints(20)], []);
		const geometry5 = new BufferGeometry().setFromPoints( points5 );
		const path5 = new Line( geometry5, bgAndPathMaterials[4] );
		paths.push(new traffic.Path({
			id: 5+(10*i),
			geometry: geometry5,
			path: path5,
			curvePath: path5Points,
			possiblePaths: {}
		}));

		//4 - in intersection
		let ptAfor4 = new Vector3( 9 -(WorldSpaceWidth/2), -7.5 +(WorldSpaceHeight/2), 1 );
		let ptBfor4 = new Vector3( 9.5 -(WorldSpaceWidth/2), -7.5 +(WorldSpaceHeight/2), 1 );
		let ptCfor4 = new Vector3( 11.5 -(WorldSpaceWidth/2), -6.5 +(WorldSpaceHeight/2), 1 );
		let ptDfor4 = new Vector3( 11.5 -(WorldSpaceWidth/2), -6 +(WorldSpaceHeight/2), 1 );
		ptAfor4.applyAxisAngle( rotationAxis, rotationOnZAxis );
		ptBfor4.applyAxisAngle( rotationAxis, rotationOnZAxis );
		ptCfor4.applyAxisAngle( rotationAxis, rotationOnZAxis );
		ptDfor4.applyAxisAngle( rotationAxis, rotationOnZAxis );
		const path4LineCurve = new CubicBezierCurve3(ptAfor4, ptBfor4, ptCfor4, ptDfor4);

		const path4Points = new CurvePath();
		path4Points.add(path4LineCurve);
		let points4 = path4Points.curves.reduce((p, d)=> [...p, ...d.getSpacedPoints(20)], []);
		const geometry4 = new BufferGeometry().setFromPoints( points4 );
		let materialPhaseId = (i%2==0) ? 6 : 8;
		const path4 = new Line( geometry4, bgAndPathMaterials[materialPhaseId] );
		paths.push(new traffic.Path({
			id: 4+(10*i),
			geometry: geometry4,
			path: path4,
			curvePath: path4Points,
			possiblePaths: {
				[desiredDirRotation[i][0]]: paths.filter((obj) => obj.id===5+(10*i))[0]
			}
		}));

		//3
		let ptAfor3 = new Vector3( 6 -(WorldSpaceWidth/2), -7.5 +(WorldSpaceHeight/2), 1 );
		let ptBfor3 = new Vector3( 9 -(WorldSpaceWidth/2), -7.5 +(WorldSpaceHeight/2), 1 );
		ptAfor3.applyAxisAngle( rotationAxis, rotationOnZAxis );
		ptBfor3.applyAxisAngle( rotationAxis, rotationOnZAxis );
		const path3LineCurve = new LineCurve3(ptAfor3, ptBfor3);

		const path3Points = new CurvePath();
		path3Points.add(path3LineCurve);
		let points3 = path3Points.curves.reduce((p, d)=> [...p, ...d.getPoints(20)], []);
		const geometry3 = new BufferGeometry().setFromPoints( points3 );
		const path3 = new Line( geometry3, bgAndPathMaterials[3] );
		paths.push(new traffic.Path({
			id: 3+(10*i),
			geometry: geometry3,
			path: path3,
			curvePath: path3Points,
			possiblePaths: {
				[desiredDirRotation[i][0]]: paths.filter((obj) => obj.id===4+(10*i))[0]
			}
		}));

		//2
		let ptAfor2 = new Vector3( 5 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 );
		let ptBfor2 = new Vector3( 5.5 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 );
		let ptCfor2 = new Vector3( 5.5 -(WorldSpaceWidth/2), -7.5 +(WorldSpaceHeight/2), 1 );
		let ptDfor2 = new Vector3( 6 -(WorldSpaceWidth/2), -7.5 +(WorldSpaceHeight/2), 1 );
		ptAfor2.applyAxisAngle( rotationAxis, rotationOnZAxis );
		ptBfor2.applyAxisAngle( rotationAxis, rotationOnZAxis );
		ptCfor2.applyAxisAngle( rotationAxis, rotationOnZAxis );
		ptDfor2.applyAxisAngle( rotationAxis, rotationOnZAxis );
		const path2LineCurve = new CubicBezierCurve3(ptAfor2, ptBfor2, ptCfor2, ptDfor2);

		const path2Points = new CurvePath();
		path2Points.add(path2LineCurve);
		let points2 = path2Points.curves.reduce((p, d)=> [...p, ...d.getSpacedPoints(20)], []);
		const geometry2 = new BufferGeometry().setFromPoints( points2 );
		const path2 = new Line( geometry2, bgAndPathMaterials[4] );
		paths.push(new traffic.Path({
			id: 2+(10*i),
			geometry: geometry2,
			path: path2,
			curvePath: path2Points,
			possiblePaths: {
				[desiredDirRotation[i][0]]: paths.filter((obj) => obj.id===3+(10*i))[0]
			}
		}));

		//8
		let ptAfor8 = new Vector3( 12 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 );
		let ptBfor8 = new Vector3( 21 - shortenPath8By -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 );
		ptAfor8.applyAxisAngle( rotationAxis, rotationOnZAxis );
		ptBfor8.applyAxisAngle( rotationAxis, rotationOnZAxis );
		const path8LineCurve = new LineCurve3(ptAfor8 ,ptBfor8);

		const path8Points = new CurvePath();
		path8Points.add(path8LineCurve);
		let points8 = path8Points.curves.reduce((p, d)=> [...p, ...d.getPoints(20)], []);
		const geometry8 = new BufferGeometry().setFromPoints( points8 );
		const path8 = new Line( geometry8, bgAndPathMaterials[5] );
		paths.push(new traffic.Path({
			id: 8+(10*i),
			geometry: geometry8,
			path: path8,
			curvePath: path8Points,
			possiblePaths: {}
		}));

		//7 - in intersection
		let ptAfor7 = new Vector3( 9 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 );
		let ptBfor7 = new Vector3( 12 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 );
		ptAfor7.applyAxisAngle( rotationAxis, rotationOnZAxis );
		ptBfor7.applyAxisAngle( rotationAxis, rotationOnZAxis );
		const path7LineCurve = new LineCurve3(ptAfor7, ptBfor7);

		const path7Points = new CurvePath();
		path7Points.add(path7LineCurve);
		let points7 = path7Points.curves.reduce((p, d)=> [...p, ...d.getPoints(20)], []);
		const geometry7 = new BufferGeometry().setFromPoints( points7 );
		materialPhaseId = (i%2==0) ? 7 : 9;
		const path7 = new Line( geometry7, bgAndPathMaterials[materialPhaseId] );
		paths.push(new traffic.Path({
			id: 7+(10*i),
			geometry: geometry7,
			path: path7,
			curvePath: path7Points,
			possiblePaths: {
				[desiredDirRotation[i][1]]: paths.filter((obj) => obj.id===8+(10*i))[0]
			}
		}));

		//10
		let ptAfor10 = new Vector3( 9.5 -(WorldSpaceWidth/2), -9 +(WorldSpaceHeight/2), 1 );
		let ptBfor10 = new Vector3( 9.5 -(WorldSpaceWidth/2), -15 - extendPath10By +(WorldSpaceHeight/2), 1 );
		ptAfor10.applyAxisAngle( rotationAxis, rotationOnZAxis );
		ptBfor10.applyAxisAngle( rotationAxis, rotationOnZAxis );
		const path10LineCurve = new LineCurve3(ptAfor10, ptBfor10);

		const path10Points = new CurvePath();
		path10Points.add(path10LineCurve);
		let points10 = path10Points.curves.reduce((p, d)=> [...p, ...d.getPoints(20)], []);
		const geometry10 = new BufferGeometry().setFromPoints( points10 );
		const path10 = new Line( geometry10, bgAndPathMaterials[5] );
		paths.push(new traffic.Path({
			id: 10+(10*i),
			geometry: geometry10,
			path: path10,
			curvePath: path10Points,
			possiblePaths: {
			}
		}));

		//9 - in intersection
		let ptAfor9 = new Vector3( 9 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 );
		let ptBfor9 = new Vector3( 9.5 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 );
		let ptCfor9 = new Vector3( 9.5 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 );
		let ptDfor9 = new Vector3( 9.5 -(WorldSpaceWidth/2), -9 +(WorldSpaceHeight/2), 1 );
		ptAfor9.applyAxisAngle( rotationAxis, rotationOnZAxis );
		ptBfor9.applyAxisAngle( rotationAxis, rotationOnZAxis );
		ptCfor9.applyAxisAngle( rotationAxis, rotationOnZAxis );
		ptDfor9.applyAxisAngle( rotationAxis, rotationOnZAxis );
		const path9LineCurve = new CubicBezierCurve3(ptAfor9, ptBfor9, ptCfor9, ptDfor9);

		const path9Points = new CurvePath();
		path9Points.add(path9LineCurve);
		let points9 = path9Points.curves.reduce((p, d)=> [...p, ...d.getSpacedPoints(20)], []);
		const geometry9 = new BufferGeometry().setFromPoints( points9 );
		materialPhaseId = (i%2==0) ? 7 : 9;
		const path9 = new Line( geometry9, bgAndPathMaterials[materialPhaseId] );
		paths.push(new traffic.Path({
			id: 9+(10*i),
			geometry: geometry9,
			path: path9,
			curvePath: path9Points,
			possiblePaths: {
				[desiredDirRotation[i][2]]: paths.filter((obj) => obj.id===10+(10*i))[0]
			}
		}));

		//6
		let ptAfor6 = new Vector3( 5 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 )
		let ptBfor6 = new Vector3( 9 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 )
		ptAfor6.applyAxisAngle( rotationAxis, rotationOnZAxis );
		ptBfor6.applyAxisAngle( rotationAxis, rotationOnZAxis );
		const path6LineCurve = new LineCurve3(ptAfor6,ptBfor6);

		const path6Points = new CurvePath();
		path6Points.add(path6LineCurve);
		let points6 = path6Points.curves.reduce((p, d)=> [...p, ...d.getPoints(20)], []);
		const geometry6 = new BufferGeometry().setFromPoints( points6 );
		const path6 = new Line( geometry6, bgAndPathMaterials[3] );
		paths.push(new traffic.Path({
			id: 6+(10*i),
			geometry: geometry6,
			path: path6,
			curvePath: path6Points,
			possiblePaths: {
				[desiredDirRotation[i][1]]: paths.filter((obj) => obj.id===7+(10*i))[0],
				[desiredDirRotation[i][2]]: paths.filter((obj) => obj.id===9+(10*i))[0]
			}
		}));

		//1
		let ptAfor1 = new Vector3( 0+shortenPath1By -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 );
		let ptBfor1 = new Vector3( 5 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 );
		ptAfor1.applyAxisAngle( rotationAxis, rotationOnZAxis );
		ptBfor1.applyAxisAngle( rotationAxis, rotationOnZAxis );
		const path1LineCurve = new LineCurve3(ptAfor1,ptBfor1);

		const path1Points = new CurvePath();
		path1Points.add(path1LineCurve);
		let points1 = path1Points.curves.reduce((p, d)=> [...p, ...d.getPoints(20)], []);
		const geometry1 = new BufferGeometry().setFromPoints( points1 );
		const path1 = new Line( geometry1, bgAndPathMaterials[3] );
		
		paths.push(new traffic.Path({
			id: 1+(10*i),
			geometry: geometry1,
			path: path1,
			curvePath: path1Points,
			possiblePaths: {
				[desiredDirRotation[i][0]]: paths.filter((obj) => obj.id===2+(10*i))[0],
				[desiredDirRotation[i][1]]: paths.filter((obj) => obj.id===6+(10*i))[0],
				[desiredDirRotation[i][2]]: paths.filter((obj) => obj.id===6+(10*i))[0]
			}
		}));

	}


	//Display paths in scene
	paths.forEach((pathObj) => {
		if([2,3,4,5,7,8,10].includes(Number((pathObj.id+"")[(pathObj.id+"").length-1]))) {
			pathObj.prevPath = paths.filter((obj) => obj.id===pathObj.id-1)[0];
		} else if(Number((pathObj.id+"")[(pathObj.id+"").length-1]) === 6) {
			pathObj.prevPath = paths.filter((obj) => obj.id===pathObj.id-5)[0];
		} else if(Number((pathObj.id+"")[(pathObj.id+"").length-1]) === 9) {
			pathObj.prevPath = paths.filter((obj) => obj.id===pathObj.id-3)[0];
		}

		scene.add(pathObj.path);
	});

	return paths;
}

let obj = { drawBg, drawPaths, bgAndPathMaterials, squareGeometry };
export default obj;