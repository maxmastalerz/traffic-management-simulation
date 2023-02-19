import {
	PlaneGeometry, MeshBasicMaterial, DoubleSide, Mesh, Shape, ShapeGeometry, Vector3,
	CubicBezierCurve, Vector2, BufferGeometry, Line, LineBasicMaterial
} from 'three';

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

function Path(obj) {
	this.id = obj.id;
	this.path = obj.path;
	this.cars = obj.cars;
	this.possiblePaths = obj.possiblePaths;
	this.pathFull = function() {
		//some logic.
		//maybe take into account distance of line?
	}
}

function drawPaths(scene, WorldSpaceWidth, WorldSpaceHeight) {
	let paths = [];

	//1
	const points1 = [];
	points1.push( new Vector3( 0 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 ) );
	points1.push( new Vector3( 5 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 ) );
	const geometry1 = new BufferGeometry().setFromPoints( points1 );
	const path1 = new Line( geometry1, materials[3] );
	paths.push(new Path({
		id: 1,
		path: path1
	}));


	//2
	const curve2 = new CubicBezierCurve(
		new Vector2( 5 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2) ),
		new Vector2( 5.5 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2) ),
		new Vector2( 5.5 -(WorldSpaceWidth/2), -7.5 +(WorldSpaceHeight/2) ),
		new Vector2( 6 -(WorldSpaceWidth/2), -7.5 +(WorldSpaceHeight/2) )
	);
	var points2 = curve2.getSpacedPoints(50);
	const geometry2 = new BufferGeometry().setFromPoints( points2 );
	const path2 = new Line( geometry2, materials[4] );
	paths.push(new Path({
		id: 2,
		path: path2
	}));

	//6
	const points6 = [];
	points6.push( new Vector3( 5 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 ) );
	points6.push( new Vector3( 9 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2), 1 ) );
	const geometry6 = new BufferGeometry().setFromPoints( points6 );
	const path6 = new Line( geometry6, materials[5] );
	paths.push(new Path({
		id: 6,
		path: path6
	}));

	//Display paths in scene
	paths.forEach((pathObj) => {
		scene.add(pathObj.path);
	})
}

let obj = { drawBg, drawPaths };
export default obj;