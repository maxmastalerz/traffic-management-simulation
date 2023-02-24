function epsEqu(x, y) {
    return Math.abs(x - y) < Number.EPSILON;
}

function epsLessThan(x, y) {
	if(epsEqu(x, y)) {
		return false;
	}
	return x < y;
}

let obj = { epsEqu, epsLessThan };
export default obj;