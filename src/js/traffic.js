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

function Delay(obj) {
	this.delay = obj.delay;
}

function Car(obj) {
	this.id = obj.id;
	this.desiredDir = obj.desiredDir;
	this.pos = obj.pos;
	this.timeSpentStopped = 0;
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
	this.prevPath = obj.prevPath;
	this.mostRecentDelayRequested = 0;
	this.delayLeft = 0;

	/*Does very similar logic as getNumImmediateFollowersDetermistic,
	except it continues the search further past the deterministic paths where a cars desired direction is unknown,
	for those cars that are immediate followers we can add them to the total followers but we weight them.
	33.33% for the left turning phase, 66.67% for the straight and right phases.
	*/
	this.getNumImmediateFollowersEsimatedPastDeterministic = (pos, idOfStartPath) => {
		let numFollowers = 0;
		let oneUnitLength = 1/(this.curvePath.length);

		for(let i=this.cars.length-1;i>=0;i--) {
			let car = this.cars[i];

			let lookbackPos = pos-oneUnitLength;
			if(car.id===1) {
				//debugger;
			}
			if(car.pos >= lookbackPos && car.pos < pos) { /*first run would be : >= 0.65 && < 0.9, or >= 0.5333333336666667 && < 0.8666666666666667 */
				let weightOfCar = 1;
				if(this.id === 1 && Number((idOfStartPath+"")[(idOfStartPath+"").length-1]) === 3) {
					weightOfCar = 1/3;
				} else if(this.id === 1 && Number((idOfStartPath+"")[(idOfStartPath+"").length-1]) === 6) {
					weightOfCar = 2/3;
				}

				numFollowers = this.getNumImmediateFollowersEsimatedPastDeterministic(lookbackPos, idOfStartPath) + weightOfCar;
				break;//found the car we were looking for, no need to search further
			} else if(lookbackPos > 0 && i===0 && [2,3,6].includes(Number((this.id+"")[(this.id+"").length-1]))/* && car.pos <= pos*/){ // else is hit if there is a gap on my path(aka, path isn't filled up fully with cars)
				//debugger;
				let pathx1 = null;
				if(Number((this.id+"")[(this.id+"").length-1]) === 3) {
					pathx1 = this.prevPath.prevPath;
				} else if([2,6].includes(Number((this.id+"")[(this.id+"").length-1]))) {
					pathx1 = this.prevPath;
				}

				//if checks if there's a car on path x2 or x6 that could be blocking others on path 1.
				//Add the cars blocked on path 1 in a weighted manner.
				let nearestNextCarToPath1 = pathx1.nearestInterferingCarInNextPaths();

				if(nearestNextCarToPath1 && nearestNextCarToPath1.path.id !== this.id) {//If blocked by a another path, some of my own cars might be blocked, let's weigh them as followers.
					let weightOfCar = 0;
					if(Number((idOfStartPath+"")[(idOfStartPath+"").length-1]) === 3) {
						weightOfCar = 1/3;//0 or 1/3
					} else if(Number((idOfStartPath+"")[(idOfStartPath+"").length-1]) === 6) {
						weightOfCar = 2/3;//1 or 2/3
					}

					//todo possible improvement: technically not length, but immediate cars(works well as long as there are no gaps between cars when first placing).
					//numFollowers = weightOfCar*pathx1.cars.length;
					console.log("num immediate followers on path 1 is : "+pathx1.getNumImmediateFollowersDetermistic(1));
					numFollowers = weightOfCar*pathx1.getNumImmediateFollowersDetermistic(1);
					break;
				}
			}

			//If we haven't found it yet, it might be in a previous path:
			if(lookbackPos < 0 && this.prevPath !== undefined) {//keep in mind "x"3's previous path: 2.
				//if prevPath is 2,12,22,32
				let prevPathLookbackPos = 1-((Math.abs(lookbackPos)*this.curvePath.length)*(1/this.prevPath.curvePath.length));

				if(Number((this.prevPath.id+"")[(this.prevPath.id+"").length-1]) === 2) {//The only previous path which is deterministic is the one with id=2
					
					//console.log("looking at prevpath: "+this.prevPath.id+" . LookbackPos is: "+prevPathLookbackPos);
					let lastCarInPrevPath = this.prevPath.cars[this.prevPath.cars.length-1];
					if(lastCarInPrevPath && mathHelpers.epsGreaterThanEqual(lastCarInPrevPath.pos, prevPathLookbackPos) && lastCarInPrevPath.pos <= 1) {//only if we are sure there is a car there, can we add it, and search further.
						numFollowers = this.prevPath.getNumImmediateFollowersEsimatedPastDeterministic(prevPathLookbackPos-Number.EPSILON, idOfStartPath) + 1;
					}
					break;
				} else { //path "x"1
					let lastCarInPrevPath = this.prevPath.cars[this.prevPath.cars.length-1];
					let weightOfCar = 1;
					if(this.prevPath.id === 1 && Number((idOfStartPath+"")[(idOfStartPath+"").length-1]) === 3) {
						weightOfCar = 1/3;// 0 or 1/3
					} else if(this.prevPath.id === 1 && Number((idOfStartPath+"")[(idOfStartPath+"").length-1]) === 6) {
						weightOfCar = 2/3;// 1 or 2/3
					}

					if(lastCarInPrevPath && mathHelpers.epsGreaterThanEqual(lastCarInPrevPath.pos, prevPathLookbackPos) && lastCarInPrevPath.pos <= 1) {//only if we are sure there is a car there, can we add it, and search further.
						numFollowers = this.prevPath.getNumImmediateFollowersEsimatedPastDeterministic(prevPathLookbackPos-Number.EPSILON, idOfStartPath) + weightOfCar;
					}
					break;

				}
				
			}
		}

		return numFollowers;
	}

	/*Gets number of followers on the path behind a car at a certain position
	Only looks back at paths that are determistic to the phasing algorithm: AKA, if you look at path 1(as a human),
	you don't know if those cars want to go straight/right or left. Though obviously in our simulation, we do know
	where they are going because they are colour coded.
	*/
	this.getNumImmediateFollowersDetermistic = (pos) => {
		let numFollowers = 0;
		let oneUnitLength = 1/(this.curvePath.length);

		for(let i=this.cars.length-1;i>=0;i--) {
			let car = this.cars[i];

			let lookbackPos = pos-oneUnitLength;
			if(car.pos >= lookbackPos && car.pos < pos) { /*first run would be : >= 0.65 && < 0.9, or >= 0.5333333336666667 && < 0.8666666666666667 */
				numFollowers = this.getNumImmediateFollowersDetermistic(lookbackPos) + 1;
				break;//found the car we were looking for, no need to search further
			}

			//If we haven't found it yet, it might be in a previous path:
			if(lookbackPos < 0) {//keep in mind "x"3's previous path: 2.
				if(Number((this.prevPath.id+"")[(this.prevPath.id+"").length-1]) === 2) {//The only previous path which is deterministic is the one with id=2
					let prevPathLookbackPos = 1-((Math.abs(lookbackPos)*this.curvePath.length)*(1/this.prevPath.curvePath.length));
					let lastCarInPrevPath = this.prevPath.cars[this.prevPath.cars.length-1];
					if(lastCarInPrevPath && mathHelpers.epsGreaterThanEqual(lastCarInPrevPath.pos, prevPathLookbackPos) && lastCarInPrevPath.pos <= 1) {//only if we are sure there is a car there, can we add it, and search further.
						numFollowers = this.prevPath.getNumImmediateFollowersDetermistic(prevPathLookbackPos-Number.EPSILON) + 1;
					}
				}
				
			}
		}

		return numFollowers;
	};

	/*
	Looks at the next paths car could go to and sees if there is a car in the way.
	Returns the position of the nearest car on a next path such that we can stop the following car
	before the end of it's own path to maintain a padding between cars across paths.
	*/
	this.nearestInterferingCarInNextPaths = () => {
		let oneUnitLength = 1/(this.curvePath.length);

		let carsInFrontPosAdjusted = []; //adjusted to units based on the this.curvePath length
		for(let possiblePath in this.possiblePaths) {
			if(this.possiblePaths[possiblePath].cars[0]) {
				carsInFrontPosAdjusted.push({
					distance: (this.possiblePaths[possiblePath].cars[0].pos*this.possiblePaths[possiblePath].curvePath.length)/this.curvePath.length,
					path: this.possiblePaths[possiblePath]
				});
			}
		};

		if(carsInFrontPosAdjusted.length) {
			let closestCarPosAdjusted = carsInFrontPosAdjusted.reduce((accum, curr) => {
				if(accum.distance < curr.distance) {
					return accum;
				}
				return curr;
			});

			if(closestCarPosAdjusted.distance < oneUnitLength) {
				return closestCarPosAdjusted;
			}
		}
	};

	//This should only be run for exit paths(paths a car is on when they're exiting the simulation)
	//Once the car is at the end of an "exit" path, we can remove the car
	this.removeCar = function(scene, carId) {
		let car = this.cars.filter(car => car.id === carId)[0];
		if(car) {
			scene.remove(car.circle); // remove car circle from scene
		}

		this.cars = this.cars.filter(car => car.id !== carId); // remove car from path.
	}
	/*
	Progress the cars found on said path segment.

	Note about effects:
	This function updates(by reference) the state of the simulation car stop times.
	*/
	this.progressCars = function(simState, scene, delta, allowedPaths, timeTilNextPhase) {
		let { prevFramePaths } = simState;

		let carStopTimesForPath = {};
		for(let i=this.cars.length-1; i>=0;i--) {
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

						if(timeNeededToFullyCross > (timeTilNextPhase+delta)) {
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
			
			if(this.cars[i+1]) { //If there is a car in front of me on same path, the last possible spot is right behind that car
				lastPossibleSpot = this.cars[i+1].pos - oneUnitLength; //using same frame
				//let prevFramePath = prevFramePaths.filter((prevFramePath) => prevFramePath.id === this.id)[0]; //old code
				//lastPossibleSpot = prevFramePath.cars[i+1].pos - oneUnitLength; //old code when prevFramePath wasn't actually previous due to not having deep cloning

			} else if(!stoppedAtIntersection) { //If I'm the first car on the path, there might be an interfering car in front of me on a next path.
				let nearestCarInNextPathsPos = this.nearestInterferingCarInNextPaths();
				if(nearestCarInNextPathsPos) {
					lastPossibleSpot = 1-(oneUnitLength-nearestCarInNextPathsPos.distance); //Go oneUnitLength behind the car on the next path.
				}
			}
			
			let savedCarPos = car.pos;
			if(car.pos + distanceToMoveThisFrame <= lastPossibleSpot) {
				car.pos += distanceToMoveThisFrame;
			} else {//just move it up the furthest position it can get
				car.pos = lastPossibleSpot; //Note: If lastPossibleSpot is 1, it will just be overwritten below as the car will go onto the next path
			}

			/*if(this.id==6 && car.id==14 && car.pos>=0.895 && car.pos <=0.905) {
				console.log("[3] 14 car pos:"+car.pos);
			}
			if(this.id==6 && car.id==15 && car.pos>=0.645 && car.pos <=0.655) {
				console.log("[3] 15 car pos:"+car.pos);
			}
			if(this.id==6 && car.id==16 && car.pos>=0.395 && car.pos <=0.405) {
				console.log("[3] 16 car pos:"+car.pos);
			}*/
			if(i===this.cars.length-1 && car.pos === lastPosInCurve) { // If is first car and has reached end of curve, move to next path
				if(car.desiredDir in this.possiblePaths) { //if the next path exists
					let nextPath = this.possiblePaths[car.desiredDir];
					if(nextPath.canPlaceCar()) {
						let overshotEndOfPathBy = (savedCarPos + distanceToMoveThisFrame) - lastPossibleSpot;
						//console.log("[2] delta:"+delta+" overshotEndOfPathBy = ("+car.pos+" + "+distanceToMoveThisFrame+") - "+lastPossibleSpot);
						let passOnOvershotToNextPath = (overshotEndOfPathBy*this.curvePath.length)/nextPath.curvePath.length;
						
						let placement = { prevPathCars: this.cars, offset: passOnOvershotToNextPath };
						nextPath.placeCarAtStart(scene, car, placement); // add car to destination path
						continue; // doing this as I don't want car being drawn on the current path object.
					}
				} else {
					console.log("Removing car "+car.id+" from the simulation. This car spent "+car.timeSpentStopped+"ms stopped.");
					this.removeCar(scene, car.id);
				}
			}

			const newPosition = this.curvePath.obj.getPoint(car.pos);
			car.circle.position.set(newPosition.x, newPosition.y, 2);
			//const tangent = this.curvePath.obj.getTangent(fraction); //Not implemented.

			if(prevFramePaths) {//check in case prev frame paths is null like it would be on the very first frame.
				let prevFramePath = prevFramePaths.filter((prevFramePath) => prevFramePath.id === this.id)[0];
				//prevframe path is accurate for the specific car being iterated right now.
				//the last car in the path segment has the best picture of where cars were last frame.
				let prevFramePathCar = prevFramePath.cars.filter((prevFramePathCar) => prevFramePathCar.id === car.id)[0];
				if(prevFramePathCar && car.pos === prevFramePathCar.pos) { //If the car was on this path last frame and if car hasn't moved since then,
					car.timeSpentStopped += delta;
					//if(car.id===4 || car.id===5) {
					//console.log("Car "+car.id+" hasn't moved since last frame. stoppedTime += "+delta+" = "+car.timeSpentStopped);
					//}git
				}
			}

			carStopTimesForPath[car.id] = car.timeSpentStopped;
		}

		simState.carStopTimes = Object.assign(simState.carStopTimes, carStopTimesForPath);
	}
	this.placeCarAtStart = function(scene, car, placement) {
		if(placement.initialPlacement) {
			scene.add(car.circle);
		}

		car.pos = placement.offset;
		placement.prevPathCars.pop(); // remove car from previous source path or initial array of cars.

		if(car.pos > 1) {
			car.pos = 1; //temporary hacky "workaround". Timing won't be correct now :(
			console.log("Due to excessive simulation delay/lag (caused by tab being inactive), the simulation is no longer accurate. Please reset");
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

function progressCars(simState, scene, delta, allowedPaths, timeTilNextPhase) {
	let { paths } = simState;

	paths.forEach((path) => {
		path.progressCars(simState, scene, delta, allowedPaths, timeTilNextPhase);
	})
}

let obj = { Car, Delay, Path, progressCars, carGeometry, carMaterials };
export default obj;