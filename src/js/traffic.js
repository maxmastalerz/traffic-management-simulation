import {
	MeshBasicMaterial, Mesh, CircleGeometry
} from 'three';

import mathHelpers from "./mathHelpers";

const carGeometry = new CircleGeometry( 0.4, 32 );
const carMaterials = {
	'n': new MeshBasicMaterial( { color: 0x000080 } ), // Navy blue
	'e': new MeshBasicMaterial( { color: 0x50C878 } ), // Emerald Green
	's': new MeshBasicMaterial( { color: 0xC0C0C0 } ), // Silver
	'w': new MeshBasicMaterial( { color: 0xffffff } )  // White
}

function Car(obj) {
	this.id = obj.id;
	this.desiredDir = obj.desiredDir;
	this.pos = obj.pos;
	this.circle = new Mesh( carGeometry, carMaterials[this.desiredDir] );
}

function Path(obj) {
	this.id = obj.id;
	this.geometry = obj.geometry;
	this.path = obj.path;
	this.curvePath = {
		obj: obj.curvePath,
		length: obj.curvePath.getCurveLengths().reduce((partialSum, a) => partialSum + a, 0)
	}

	this.cars = [];
	this.possiblePaths = obj.possiblePaths;

	/*
	Looks at the next paths car could go to and sees if there is a car in the way.
	Returns the position of the nearest car on a next path such that we can stop the following car
	before the end of it's own path to maintain a padding between cars across paths.
	*/
	this.nearestInterferingCarInNextPaths = function(pos) {
		let oneUnitLength = 1/(this.curvePath.length);

		let carsInFrontPosAdjusted = []; //adjusted to units based on the this.curvePath length
		for(let possiblePath in this.possiblePaths) {
			if(this.possiblePaths[possiblePath].cars[0]) {
				carsInFrontPosAdjusted.push((this.possiblePaths[possiblePath].cars[0].pos*this.possiblePaths[possiblePath].curvePath.length)/this.curvePath.length);
			}
		};
		let closestCarPosAdjusted = Math.min(...carsInFrontPosAdjusted);
		if(closestCarPosAdjusted < oneUnitLength) {
			return closestCarPosAdjusted;
		}
	}
	this.progressCars = function(scene, prevDelta, delta, allowedPaths, timeTilNextPhase) {
		for(let i=0; i<this.cars.length;i++) {
			let car = this.cars[i];

			const speed = 0.001;
			let oneUnitLength = 1/(this.curvePath.length);
			let distanceToMoveThisFrame = (speed*delta)/(this.curvePath.length);
			let lastPosInCurve = 1;
			let lastPossibleSpot = lastPosInCurve;
			let stoppedAtIntersection = false;

			if([3,6,13,16,23,26,33,36].includes(this.id)) {// for paths leading up to intersection
				if(!this.cars[i+1]) {//if first car in path
					let nextPath = this.possiblePaths[car.desiredDir];
					if(allowedPaths.includes(nextPath.id)) { //if next path is allowed at the moment, only allow if car can make it thru whole intersection within green time.
						let distanceToStopPos = ((1-(oneUnitLength/2)+(oneUnitLength/10))-(car.pos))*this.curvePath.length;
						let timeToStopPos = distanceToStopPos/speed;
						let timeNeededToFullyCross = timeToStopPos+(nextPath.curvePath.length/speed)+((0.4/speed)*2);

						
						if(car.pos>0.747 & car.pos<0.753) {
							//console.log("delta: "+delta);
							//console.log("prevDelta: "+prevDelta);
							console.log(timeNeededToFullyCross+" >= ("+timeTilNextPhase+"  OR  "+(timeTilNextPhase+delta)+")");
						}
						if(!(mathHelpers.closeEqu(timeNeededToFullyCross, timeTilNextPhase)  ||
							 mathHelpers.closeEqu(timeNeededToFullyCross, timeTilNextPhase+delta) ) &&
							timeNeededToFullyCross > timeTilNextPhase
							) {
							lastPossibleSpot = 1-(oneUnitLength/2)+(oneUnitLength/10);
							stoppedAtIntersection = true;
						}
						//push car up to the intersection if it wont't make it across curve within yellow time.
					} else { //if next path is not allowed, always stop just before intersection.
						lastPossibleSpot = 1-(oneUnitLength/2)+(oneUnitLength/10);
						stoppedAtIntersection = true;
					}
				}
			}
			
			if(this.cars[i+1]) { //If there is a car in front of me on same path, the last possible spot is right behind that car.
				lastPossibleSpot = this.cars[i+1].pos - oneUnitLength + ((speed*prevDelta)/(this.curvePath.length)); //The prevdelta calculation pushes the car forward to where it should be as cars should move together rather than being delayed a frame
			} else if(!stoppedAtIntersection) { //If I'm the first car on the path, there might be an interfering car in front of me on a next path.
				let nearestCarInNextPathsPos = this.nearestInterferingCarInNextPaths(car.pos);
				if(nearestCarInNextPathsPos) {
					lastPossibleSpot = 1-(oneUnitLength-nearestCarInNextPathsPos); //Go oneUnitLength behind the car on the next path.
				}
			}
			
			if(car.pos + distanceToMoveThisFrame <= lastPossibleSpot) {
				car.pos += distanceToMoveThisFrame;
			} else {//just move it up the furthest position it can get
				car.pos = lastPossibleSpot;
			}

			if(i===this.cars.length-1 && car.pos === lastPosInCurve) { // If is first car and has reached end of curve, move to next path
				if(car.desiredDir in this.possiblePaths) { //if the next path exists
					let nextPath = this.possiblePaths[car.desiredDir];
					if(nextPath.canPlaceCar()) {
						let overshotEndOfPathBy = (car.pos + distanceToMoveThisFrame) - lastPossibleSpot;
						let passOnOvershotToNextPath = (overshotEndOfPathBy*this.curvePath.length)/nextPath.curvePath.length;
						
						let sequentialPlacement = { prevPathCars: this.cars, offset: passOnOvershotToNextPath };
						nextPath.placeCarAtStart(scene, car, sequentialPlacement); // add car to destination path
						continue; // doing this as I don't want car being drawn on the current path object.
					}
				}
			}

			const newPosition = this.curvePath.obj.getPoint(car.pos);
			car.circle.position.set(newPosition.x, newPosition.y, 2);
			//const tangent = this.curvePath.obj.getTangent(fraction);

		}
	}
	this.placeCarAtStart = function(scene, car, sequentialPlacement = false) {
		if(!sequentialPlacement) { // first/initial placement of car
			car.pos = 0;
			scene.add(car.circle);
		} else { //car going onto future path
			car.pos = 0 + sequentialPlacement.offset;
			sequentialPlacement.prevPathCars.pop(); // remove car from source path
		}
		
		car.circle.position.set(this.curvePath.obj.getPoint(car.pos).x, this.curvePath.obj.getPoint(car.pos).y, 2);
		this.cars.unshift(car); // Add car
	}
	this.canPlaceCar = function() {
		if(this.cars[0] && mathHelpers.epsLessThan(this.cars[0].pos, (1/(this.curvePath.length*2))*2)) {
			return false;
		}
		return true;
	}
}

function progressCars(paths, scene, prevDelta, delta, allowedPaths, timeTilNextPhase) {
	paths.forEach((path) => {
		path.progressCars(scene, prevDelta, delta, allowedPaths, timeTilNextPhase);
	})
}

let obj = { Car, Path, progressCars, carGeometry, carMaterials };
export default obj;