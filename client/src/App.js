// Import React
import React, { Component } from 'react';
import PropTypes from 'prop-types';

// Material UI
import AppBar from '@material-ui/core/AppBar';
import CircularProgress from '@material-ui/core/CircularProgress';
import CssBaseline from '@material-ui/core/CssBaseline';
import Drawer from '@material-ui/core/Drawer';
import Fab from '@material-ui/core/Fab';
import { MuiThemeProvider, createMuiTheme, withStyles } from '@material-ui/core/styles';
import Toolbar from '@material-ui/core/Toolbar';

// Material Icons
import ArrowBack from '@material-ui/icons/ArrowBack';
import LocationSearching from '@material-ui/icons/LocationSearching';
import Menu from '@material-ui/icons/Menu';
import MyLocation from '@material-ui/icons/MyLocation';

// Use moment for opening hours
import moment from 'moment';

// Custom components
import List from './List';
import Location from './Location';
import LocationMap from './LocationMap';
import Search from './Search';

// Helpers
import * as appdataHelper from './helpers/appdata';
import * as eventsHelper from './helpers/events';
import * as locationsHelper from './helpers/locations';
import * as geoHelper from './helpers/geo';
import * as isoHelper from './helpers/isochrones';

const drawerWidth = 380;

const theme = createMuiTheme({
	typography: {
		useNextVariants: true,
	},
	palette: {
		primary: { main: 'rgb(143,212,0)', contrastText: '#fff' },
		secondary: { main: 'rgb(0,120,201)', contrastText: '#fff' }
	},
	locations: {
		central: 'rgb(143, 212, 0)',
		crownhill: 'rgb(236, 0, 140)',
		devonport: 'rgb(244, 170, 0)',
		efford: 'rgb(0, 120, 201)',
		estover: 'rgb(147, 37, 178)',
		northprospect: 'rgb(39, 189, 190)',
		peverell: 'rgb(0, 105, 62)',
		plympton: 'rgb(158, 27, 50)',
		plymstock: 'rgb(239, 130, 0)',
		southway: 'rgb(0, 58, 105)',
		stbudeaux: 'rgb(77, 48, 145)',
		westpark: 'rgb(233, 85, 37)'
	}
});

const styles = {
	appBar: {
		zIndex: theme.zIndex.drawer + 1,
		backgroundColor: 'rgba(255, 255, 255, 0.5)'
	},
	buttonProgress: {
		position: 'absolute',
		top: '50%',
		left: '50%',
		marginTop: -10,
		marginLeft: -10,
	},
	drawerPaper: {
		position: 'relative',
		width: drawerWidth,
		backgroundColor: 'rgba(255, 255, 255, 0.6)'
	},
	flex: {
		flex: 1,
	},
	menuButton: {
		marginLeft: -12,
		marginRight: 20,
	},
	root: {
		height: '100%',
		zIndex: 1,
		overflow: 'hidden',
		position: 'relative',
		display: 'flex',
		width: '100%',
	},
	toolbarPadding: theme.mixins.toolbar
};

class App extends Component {
	state = {
		// We either maintain data by GPS or by postcode search
		search_type: 'gps',
		// Tracking of position and time
		current_time: moment(),
		time_update_interval: '',
		current_position: [],
		postcode: '',
		position_update_interval: '',
		// The locations displayed in the system.
		locations: [],
		location_name: '',
		location_isochrones: {},
		// App Data
		facilities: [],
		travel_types: [],
		// Event data
		events: [],
		// Map variables, sent down to the map for updates.
		map_max_bounds: null,
		map_fit_bounds: null,
		map_position: [-4.1429, 50.3732],
		map_zoom: [12],
		map_pitch: [0],
		map_bearing: [0],
		// UI display variables
		loading: false,
		main_drawer_open: true,
		list_drawer_open: true,
		location_drawer_open: false,
	}

	// componentDidMount: sets up data and any logging
	componentDidMount = () => {
		this.getLocations();
		this.getFacilities();
		this.getTravel();
		this.getEvents();

		// Set up updates for location and time
		let position_update_interval = setInterval(this.logPosition, 60000);
		this.setState({ position_update_interval: position_update_interval });
		let time_update_interval = setInterval(this.setCurrentTime, 5000);
		this.setState({ time_update_interval: time_update_interval });
	}

	// logPosition: Retrieve position from gps
	logPosition = () => {
		if (this.state.search_type === 'gps') this.getLocations();
	}

	// setCurrentTime: 
	setCurrentTime = () => this.setState({ current_time: moment() });

	// getLocations:
	getLocations = () => {
		this.setState({ loading: true });
		geoHelper.getCurrentPosition(position => {
			locationsHelper.getAllLocationsByCoords(position, locations => {
				this.setState({ loading: false, locations: locations, current_position: position });
			});
		});
	};

	// getFacilities:
	getFacilities = () => {
		appdataHelper.getFacilities(facilities => this.setState({ facilities: facilities }));
	};

	// getTravel:
	getTravel = () => {
		appdataHelper.getTravel(travel => this.setState({ travel_types: travel }));
	};

	// getEvents:
	getEvents = () => {
		eventsHelper.getEvents(events => this.setState({ events: events }));
	};

	// 
	fitLocationBounds = () => {
		// To do: 
	}

	// handleGPS:
	handleGPS = (e) => this.setState({ search_type: 'gps', postcode: '' });

	// getLocationIsochrones: fetches the underlying data for an isochrone
	getLocationIsochrones = (location_name) => {
		this.setState({ loading: true });
		let isochrones = this.state.location_isochrones;
		let received = [];
		if (isochrones[location_name]) received = Object.keys(isochrones[location_name]);
		if (!isochrones[location_name]) isochrones[location_name] = {};
		isoHelper.getAllLocationIsochrones(location_name, received, isos => {
			isos.forEach(iso => {
				isochrones[location_name][iso.travel] = { retrieved: true, selected: false, iso: iso.iso };
			});
			this.setState({ location_isochrones: isochrones, loading: false });
		});
	}

	// toggleIsochrone: turns a particular location travel type on or off
	toggleIsochrone = (location_name, travel) => {
		this.setState({ loading: true });
		let isochrones = this.state.location_isochrones;
		if (!isochrones[location_name]) isochrones[location_name] = {};
		if (!isochrones[location_name][travel]) {
			isochrones[location_name][travel] = { retrieved: false, selected: true, iso: null };
			this.setState({ isochrones: isochrones });
			isoHelper.getLocationIsochronesByType(location_name, [travel], iso => {
				isochrones[location_name][travel] = { retrieved: true, selected: true, iso: iso[0].iso };
				this.setState({ location_isochrones: isochrones, loading: false });
			});
		} else {
			isochrones[location_name][travel].selected = !isochrones[location_name][travel].selected;
			this.setState({ location_isochrones: isochrones, loading: false });
		}
	}

	// Renders the main app
	render() {
		const { classes } = this.props;
		return (
			<MuiThemeProvider theme={theme}>
				<div className={classes.root}>
					<CssBaseline />
					<AppBar
						position="absolute"
						color="default"
						elevation={0}
						className={classes.appBar}>
						<Toolbar>
							{this.state.list_drawer_open ?
								<Fab
									size="small"
									disabled={this.state.loading}
									color="secondary"
									className={classes.menuButton}
									aria-label="Menu"
									onClick={() => this.setState({ main_drawer_open: !this.state.main_drawer_open, list_drawer_open: true, location_drawer_open: false })}
								>
									{this.state.loading ?
										<CircularProgress
											size={20}
											className={classes.buttonProgress}
										/> : <Menu />}
								</Fab> : null
							}
							{this.state.location_drawer_open ?
								<Fab
									size="small"
									color="secondary"
									className={classes.menuButton}
									aria-label="Menu"
									onClick={() => this.setState({ main_drawer_open: true, location_drawer_open: false, list_drawer_open: true })} >
									<ArrowBack />
								</Fab> : null
							}
							<span className={classes.flex}></span>
							<Search />
							<Fab
								size="small"
								color="primary"
								disabled={this.state.current_position.length === 0}
								onClick={this.handleGPS}
							>
								{this.state.current_position.length > 0 ? <MyLocation /> : <LocationSearching />}
							</Fab>
						</Toolbar>
					</AppBar>
					<Drawer
						variant="persistent"
						open={this.state.main_drawer_open}
						classes={{
							paper: classes.drawerPaper
						}}
					>
						<div className={classes.toolbarPadding}></div>
						{this.state.list_drawer_open ?
							<List
								current_time={this.state.current_time}
								locations={this.state.locations}
								facilities={this.state.facilities}
								travel_types={this.state.travel_types}
								events={this.state.events}
								isochrones={this.state.location_isochrones}
								toggleIsochrone={this.toggleIsochrone}
								goTo={(position, zoom, pitch, bearing) => this.setState({ map_position: position, map_zoom: zoom, map_pitch: pitch, map_bearing: bearing })}
								viewLocation={(location_name) => this.setState({ main_drawer_open: true, location_drawer_open: true, location_name: location_name, list_drawer_open: false })}
							/> : null}
						{this.state.location_drawer_open ?
							<Location
								current_time={this.state.current_time}
								facilities={this.state.facilities}
								location={this.state.locations.find(location => { return location.location_name === this.state.location_name })}
								travel_types={this.state.travel_types}
								events={this.state.events.filter(event => event.location === this.state.location_name)}
								isochrones={this.state.location_isochrones}
								toggleIsochrone={this.toggleIsochrone}
								getIsochrones={(location_name) => this.getLocationIsochrones(location_name)}
								goTo={(position, zoom, pitch, bearing) => this.setState({ map_position: position, map_zoom: zoom, map_pitch: pitch, map_bearing: bearing })}
								close={() => this.setState({ main_drawer_open: true, location_drawer_open: false, list_drawer_open: true })}
							/> : null}
					</Drawer>
					<LocationMap
						position={this.state.map_position}
						isochrones={this.state.location_isochrones}
						locations={this.state.locations}
						max_bounds={this.state.map_max_bounds}
						fit_bounds={this.state.map_fit_bounds}
						bearing={this.state.map_bearing}
						pitch={this.state.map_pitch}
						zoom={this.state.map_zoom}
						viewLocation={(location_name) => this.setState({ main_drawer_open: true, location_drawer_open: true, location_name: location_name, list_drawer_open: false })}
					/>
				</div>
			</MuiThemeProvider >
		);
	}
}

App.propTypes = {
	classes: PropTypes.object.isRequired,
}

export default withStyles(styles)(App);