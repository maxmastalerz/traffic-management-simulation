function closeEqu(x, y) {
	return Math.abs(x - y) < Number.EPSILON*1000000;
}

function epsEqu(x, y) {
    return Math.abs(x - y) < Number.EPSILON;
}

function epsGreaterThanEqual(x, y) {
	if(epsEqu(x, y)) {
		return true;
	}
	return x > y;
}

function epsLessThan(x, y) {
	if(epsEqu(x, y)) {
		return false;
	}
	return x < y;
}

let obj = { closeEqu, epsEqu, epsLessThan, epsGreaterThanEqual };
export default obj;