import {
	PlaneGeometry, MeshBasicMaterial, DoubleSide, Mesh, Shape, ShapeGeometry, Vector3,
	CubicBezierCurve, Vector2, BufferGeometry, Line, LineBasicMaterial
} from 'three';

const materials = [
	new MeshBasicMaterial( {color: 0xA8FF93, side: DoubleSide} ), //light box
	new MeshBasicMaterial( {color: 0x8AFC6E, side: DoubleSide} ), //darker box
	new MeshBasicMaterial( {color: 0x807E78, side: DoubleSide} ) //asphalt grey road
];

function drawStorageBayTaperAndMissingBg(scene, rotationOnZAxis) {
	//the storage bay starts (Math.sqrt(2)-1 earlier to make diagonal lane remain at 1 unit of width
	const x = -0.5, y = 5.5+(Math.sqrt(2)-1); //Default start position for drawing the tile

	//Fill in missing background:
	const missingBg = new Shape();
	missingBg.moveTo( x, y );
	missingBg.bezierCurveTo(x,y-0.5,x+1,y-0.5,x+1,y-1);
	missingBg.lineTo( x+1, y );

	const missingBgTriangleGeometry = new ShapeGeometry( missingBg );
	const missingBgMesh = new Mesh( missingBgTriangleGeometry, materials[0] ) ;

	missingBgMesh.rotateOnWorldAxis(new Vector3(0, 0, 1), rotationOnZAxis);
	scene.add( missingBgMesh );

	//Storage Bay Taper:
	const storageBayTaper = new Shape();
	storageBayTaper.moveTo( x, y );
	storageBayTaper.bezierCurveTo(x,y-0.5,x+1,y-0.5,x+1,y-1);
	storageBayTaper.lineTo( x, y-1 );

	const storageBayTaperTriangleGeometry = new ShapeGeometry( storageBayTaper );
	const storageBayTaperMesh = new Mesh( storageBayTaperTriangleGeometry, materials[2] ) ;

	storageBayTaperMesh.rotateOnWorldAxis(new Vector3(0, 0, 1), rotationOnZAxis);
	scene.add( storageBayTaperMesh );

	//Storage Bay Taper missing road piece
	const storageBayTaperMissingRoad = new Shape();
	storageBayTaperMissingRoad.moveTo( x, y-1 );
	storageBayTaperMissingRoad.lineTo( x+1, y-1 );
	storageBayTaperMissingRoad.lineTo( x+1, y-1-(Math.sqrt(2)-1) );
	storageBayTaperMissingRoad.lineTo( x, y-1-(Math.sqrt(2)-1) );

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

function drawCurves(scene, WorldSpaceWidth, WorldSpaceHeight) {

	const curve = new CubicBezierCurve(
		new Vector2( 5 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2) ),
		new Vector2( 5.5 -(WorldSpaceWidth/2), -8.5 +(WorldSpaceHeight/2) ),
		new Vector2( 5.5 -(WorldSpaceWidth/2), -7.5 +(WorldSpaceHeight/2) ),
		new Vector2( 6 -(WorldSpaceWidth/2), -7.5 +(WorldSpaceHeight/2) )
	);

	var points = curve.getSpacedPoints(50);
	const geometry = new BufferGeometry().setFromPoints( points );
	const material = new LineBasicMaterial( { color: 0xff0000 } );

	// Create the final object to add to the scene
	const curveObject = new Line( geometry, material );
	scene.add(curveObject);
}

let obj = { drawBg, drawCurves };
export default obj;