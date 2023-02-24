import {
	PlaneGeometry, MeshBasicMaterial, DoubleSide, Mesh, Shape, ShapeGeometry, Vector3, CurvePath, CubicBezierCurve3, LineCurve3,
	BufferGeometry, Line, LineBasicMaterial
} from 'three';
import traffic from "./traffic";

const materials = [
	new MeshBasicMaterial( {color: 0xA8FF93, side: DoubleSide} ), //light box
	new MeshBasicMaterial( {color: 0x8AFC6E, side: DoubleSide} ), //darker box
	new MeshBasicMaterial( {color: 0x807E78, side: DoubleSide} ), //asphalt grey road
	new LineBasicMaterial( { color: 0xff0000 } ), // Red line
	new LineBasicMaterial( { color: 0x00ff00 } ), // Green line
	new LineBasicMaterial( { color: 0x0000ff } ), // Blue line
];

function drawStorageBayTaperAndMissingBg(scene, rotationOnZAxis) {
	//the storage bay starts (Math.sqrt(2)-1 earlier to make diagonal lane remain at 1 unit of width
	const x = -5.5-(Math.sqrt(2)-1), y = -0.5; //Default start position for drawing the tile

	//Fill in missing background:
	const missingBg = new Shape();
	missingBg.moveTo( x, y );
	missingBg.bezierCurveTo(x+0.5,y,x+0.5,y+1,x+1,y+1);
	missingBg.lineTo( x, y+1 );

	const missingBgTriangleGeometry = new ShapeGeometry( missingBg );
	const missingBgMesh = new Mesh( missingBgTriangleGeometry, materials[0] ) ;

	missingBgMesh.rotateOnWorldAxis(new Vector3(0, 0, 1), rotationOnZAxis);
	scene.add( missingBgMesh );

	//Storage Bay Taper:
	const storageBayTaper = new Shape();
	storageBayTaper.moveTo( x, y );
	storageBayTaper.bezierCurveTo(x+0.5,y,x+0.5,y+1,x+1,y+1);
	storageBayTaper.lineTo( x+1, y );

	const storageBayTaperTriangleGeometry = new ShapeGeometry( storageBayTaper );
	const storageBayTaperMesh = new Mesh( storageBayTaperTriangleGeometry, materials[2] ) ;

	storageBayTaperMesh.rotateOnWorldAxis(new Vector3(0, 0, 1), rotationOnZAxis);
	scene.add( storageBayTaperMesh );

	//Storage Bay Taper missing road piece
	const storageBayTaperMissingRoad = new Shape();
	storageBayTaperMissingRoad.moveTo( x+1, y );
	storageBayTaperMissingRoad.lineTo( x+1, y+1 );
	storageBayTaperMissingRoad.lineTo( x+1+(Math.sqrt(2)-1), y+1 );
	storageBayTaperMissingRoad.lineTo( x+1+(Math.sqrt(2)-1), y );

	const storageBayTaperMissingRoadGeometry = new ShapeGeometry( storageBayTaperMissingRoad );
	const storageBayTaperMissingRoadMesh = new Mesh( storageBayTaperMissingRoadGeometry, materials[2] ) ;

	storageBayTaperMissingRoadMesh.rotateOnWorldAxis(new Vector3(0, 0, 1), rotationOnZAxis);
	scene.add( storageBayTaperMissingRoadMesh );
}

function drawBg(scene, WorldSpaceWidth, WorldSpaceHeight) {
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

	const geometry = new PlaneGeometry( 1, 1 );

	for(var i=0;i<map.length;i++) {
		for(var j=0; j<map[i].length;j++) {
			if(map[i][j] <= 2) { //Square shaped boxes
				let material = materials[ map[i][j] ];
				const plane = new Mesh( geometry, material );
				plane.position.set(j-(WorldSpaceWidth/2)+0.5,-i+(WorldSpaceHeight/2)-0.5);
				scene.add( plane );
			} else if(map[i][j] >= 3) { //Storage bay tapers
				let rotationOnZAxis = -(map[i][j]-3)*Math.PI/2;
				drawStorageBayTaperAndMissingBg(scene, rotationOnZAxis);
			}
		}
	}
}

function drawPaths(scene, WorldSpaceWidth, WorldSpaceHeight) {
	let paths = [];

	//3
	const path3Points = new CurvePath();
	const path3LineCurve = new LineCurve3(
		new Vector3( 6 -(WorldSpaceWidth/2), -7.5 +(WorldSpaceHeight/2), 1 ),
		new Vector3( 9 -(WorldSpaceWidth/2), -7.5 +(WorldSpaceHeight/2), 1 )
	)
	path3Points.add(path3LineCurve);
	let points3 = path3Points.curves.reduce((p, d)=> [...p, ...d.getPoints(20)], []);
	const geometry3 = new BufferGeometry().setFromPoints( points3 );
	const path3 = new Line( geometry3, materials[5] );
	paths.push(new traffic.Path({
		id: 3,
		path: path3,
		curvePath: path3Points,
		possiblePaths: {}
	}));

	//2
	const path2Points = new CurvePath();
	const path2LineCurve = new CubicBezierCurve3(
		new Vector3( 5 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 ),
		new Vector3( 5.5 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 ),
		new Vector3( 5.5 -(WorldSpaceWidth/2), -7.5 +(WorldSpaceHeight/2), 1 ),
		new Vector3( 6 -(WorldSpaceWidth/2), -7.5 +(WorldSpaceHeight/2), 1 )
	);
	path2Points.add(path2LineCurve);
	let points2 = path2Points.curves.reduce((p, d)=> [...p, ...d.getSpacedPoints(20)], []);
	const geometry2 = new BufferGeometry().setFromPoints( points2 );
	const path2 = new Line( geometry2, materials[4] );
	paths.push(new traffic.Path({
		id: 2,
		path: path2,
		curvePath: path2Points,
		possiblePaths: {
			n: paths.filter((obj) => obj.id===3)[0]
		}
	}));

	//6
	const path6Points = new CurvePath();
	const path6LineCurve = new LineCurve3(
		new Vector3( 5 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 ),
		new Vector3( 9 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 )
	)
	path6Points.add(path6LineCurve);
	let points6 = path6Points.curves.reduce((p, d)=> [...p, ...d.getPoints(20)], []);
	const geometry6 = new BufferGeometry().setFromPoints( points6 );
	const path6 = new Line( geometry6, materials[5] );
	paths.push(new traffic.Path({
		id: 6,
		path: path6,
		curvePath: path6Points,
		possiblePaths: {}
	}));

	//1
	const path1Points = new CurvePath();
	const path1LineCurve = new LineCurve3(
		new Vector3( 0 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 ),
		new Vector3( 5 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 )
	)
	path1Points.add(path1LineCurve);
	let points1 = path1Points.curves.reduce((p, d)=> [...p, ...d.getPoints(20)], []);
	const geometry1 = new BufferGeometry().setFromPoints( points1 );
	const path1 = new Line( geometry1, materials[3] );
	paths.push(new traffic.Path({
		id: 1,
		path: path1,
		curvePath: path1Points,
		possiblePaths: {
			n: paths.filter((obj) => obj.id===2)[0],
			e: paths.filter((obj) => obj.id===6)[0],
			s: paths.filter((obj) => obj.id===6)[0]
		}
	}));

	//Display paths in scene
	paths.forEach((pathObj) => {
		scene.add(pathObj.path);
	});

	return paths;
}

let obj = { drawBg, drawPaths };
export default obj;