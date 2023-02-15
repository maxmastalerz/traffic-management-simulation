const update100VhToExcludeScrollbar = () => {
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

export default update100VhToExcludeScrollbar;