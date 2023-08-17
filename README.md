# Traffic-Management-Simulation

This repository contains simulation software which compares pre-timed, fully-actuated, and geolocation-enabled intersections.

The geolocation-enabled algorithm is custom made and shows an improvement of 57.76% over pre-timed intersections.

## Running the Project

### `cd traffic-management-simulation`

### `npm install`

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

## Customising the test cases

By default, the project will run with randomised demand & pre-timed mode with medium density gaps when placing vehicles.

To customise this functionality, go into the src/App.js file(line 250) and:

- uncomment the carPlacements block
- comment out the generateCarPlacements
- comment out the insertDelays line.

You can now edit the carPlacements to your liking with differing gaps, and vehicles.

You may also insert delays programatically by adding back the insertDelays line and not including delays in the carPlacements block.

Please view the results of your test case in the developer console(Wait for all cars to disappear).

## Test Cases

To view the test cases upon which the study was conducted, please see the following files:

- test-cases-full-demand.txt
- test-cases-random-demand.txt
