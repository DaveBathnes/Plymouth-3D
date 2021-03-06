import React, { Component } from 'react';
import PropTypes from 'prop-types';

// Material UI
import Popover from '@material-ui/core/Popover';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';

// Mapbox GL
import ReactMapboxGl from 'react-mapbox-gl';
import { Cluster } from 'react-mapbox-gl';
import { GeoJSONLayer } from 'react-mapbox-gl';
import { Layer } from 'react-mapbox-gl';
import { Marker } from 'react-mapbox-gl';
import { Source } from 'react-mapbox-gl';
import { ZoomControl } from "react-mapbox-gl";

// Custom components
import LocationAvatar from './LocationAvatar';
import LocationAvatarCluster from './LocationAvatarCluster';
import MeAvatar from './MeAvatar';

const styles = theme => ({
	paper: {
		padding: theme.spacing.unit,
		border: '1px solid #e5e5e5'
	}
});

const Map = ReactMapboxGl({
	accessToken: 'pk.eyJ1IjoiZGF2ZXJvd2V1ayIsImEiOiJjajRuemx4Mnoxc2lyMzJvNGYxZjVjdnVpIn0.9aupfG_tYU0SHx3S6ZUqvw',
	minZoom: 7,
	maxZoom: 18,
	scrollZoom: true,
	interactive: true,
	dragRotate: true,
	attributionControl: true
});

class LocationMap extends Component {
	state = {
		fit_bounds: this.props.fit_bounds,
		position: this.props.position,
		zoom: this.props.zoom,
		pitch: this.props.pitch,
		bearing: this.props.bearing,
		popover: false,
		popover_position: null,
		popover_message: ''
	};

	componentWillReceiveProps = (nextProps) => {
		let stateUpdate = {};
		if (nextProps.position.length > 0 && nextProps.position !== this.state.center) stateUpdate.position = nextProps.position;
		if (nextProps.zoom.length > 0 && nextProps.zoom[0] !== this.state.zoom[0]) stateUpdate.zoom = nextProps.zoom;
		if (nextProps.pitch.length > 0 && nextProps.pitch[0] !== this.state.pitch[0]) stateUpdate.pitch = nextProps.pitch;
		if (nextProps.bearing.length > 0 && nextProps.bearing[0] !== this.state.bearing[0]) stateUpdate.bearing = nextProps.bearing;
		stateUpdate.fit_bounds = nextProps.fit_bounds;
		this.setState(stateUpdate);
	}

	displayPopover = (e) => {
		// There may be multiple features, we need to get the one closest to the library
		let message = '';
		const features = e.features.sort((a, b) => a.properties.value - b.properties.value);
		if (features && features.length > 0) {
			let total_pop = features[0].properties.total_pop;
			total_pop = total_pop.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
			let value = Math.round(features[0].properties.value / 60);
			message = 'Population of ' + total_pop + ' within ' + value + ' minutes.';
		}
		this.setState({ popover: true, popover_position: e.point, popover_message:  message });
	}

	// clusterLocations
	clusterLocations = (coordinates, points) => (
		<Marker coordinates={coordinates}>
			<LocationAvatarCluster points={points} />
		</Marker>
	)

	// render
	render() {
		const { theme, classes, open_tab } = this.props;
		const open_locations = this.props.locations.filter(location => location.currently_open.open).length;
		const closed_locations = this.props.locations.filter(location => !location.currently_open.open).length;
		const locations = this.props.locations.filter(location => {
			let show = true;
			if ((open_tab === 0 && open_locations !== 0) && !location.currently_open.open) show = false;
			if ((open_tab === 1 && closed_locations !== 0) && location.currently_open.open) show = false;
			return show;
		})
		return (
			<div>
				<Map
					style='style.json'  // eslint-disable-line react/style-prop-object
					center={this.state.position}
					zoom={this.state.zoom}
					maxZoom={17}
					pitch={this.state.pitch}
					bearing={this.state.bearing}
					fitBounds={this.state.fit_bounds}
					containerStyle={{ top: 0, bottom: 0, right: 0, left: 0, height: '100vh', width: '100vw', position: 'absolute' }}
				>
					<ZoomControl position="bottom-right" />
					<Source
						id='buildings_source'
						tileJsonSource={{
							type: 'vector',
							url: 'mapbox://daveroweuk.9uj2a4uw'
						}}
					/>
					<Layer
						id='3d-buildings'
						type='fill-extrusion'
						sourceId='buildings_source'
						sourceLayer='PlymouthBuildings-5m5usp'
						minZoom={16}
						paint={{
							'fill-extrusion-color': [
								'match',
								['get', 'ID'],
								'0D4F70BCC1FF27B3E050A00A568A259B', theme.locations.central,
								'0D4F70C084A527B3E050A00A568A259B', theme.locations.crownhill,
								'0D4F70C2C5A727B3E050A00A568A259B', theme.locations.devonport,
								'0D4F70C2790D27B3E050A00A568A259B', theme.locations.efford,
								'0D4F70B79A2A27B3E050A00A568A259B', theme.locations.estover,
								'0D4F70C2440A27B3E050A00A568A259B', theme.locations.northprospect,
								'0D4F70C2EEE527B3E050A00A568A259B', theme.locations.peverell,
								'0D4F70B7594D27B3E050A00A568A259B', theme.locations.plympton,
								'0D4F70C31D6E27B3E050A00A568A259B', theme.locations.plymstock,
								'0D4F70C2862A27B3E050A00A568A259B', theme.locations.southway,
								'0D4F709BDA5D27B3E050A00A568A259B', theme.locations.stbudeaux,
								'0D4F70C21F9327B3E050A00A568A259B', theme.locations.westpark,
								'#CCCCCC'
							],
							'fill-extrusion-height': [
								'interpolate', ['linear'], ['zoom'],
								16, 0,
								16.05, ['get', 'max']
							],
							'fill-extrusion-opacity': 0.7
						}}
					/>
					{Object.keys(this.props.isochrones).map(location => { // Each isochrone set
						return Object.keys(this.props.isochrones[location])
							.filter(travel => {
								return this.props.isochrones[location][travel].selected
							})
							.map((travel, x) => { // Each travel method
								return (
									<span key={'sp_isotravel_' + x}>
										<GeoJSONLayer // Shows the shaded polygons
											data={this.props.isochrones[location][travel].iso}
											fillPaint={{
												'fill-opacity': 0.1,
												'fill-antialias': true,
												'fill-color': theme.locations[location.replace(' Library', '').replace(/ /g, '').toLowerCase()]
											}}
											fillOnClick={(e) => this.displayPopover(e)}
										/>
										<GeoJSONLayer // Shows the outlines of the distances
											data={this.props.isochrones[location][travel].iso}
											linePaint={{
												'line-opacity': 0.4,
												'line-width': 2,
												'line-color': theme.locations[location.replace(' Library', '').replace(/ /g, '').toLowerCase()]
											}}
										/>
										<GeoJSONLayer // Shows the distances labels
											data={this.props.isochrones[location][travel].iso}
											symbolLayout={{
												'text-field': ['concat', ['to-string', ['/', ['get', 'value'], 60]], ' mins'],
												'text-font': ['Source Sans Pro Bold'],
												'symbol-placement': 'line',
												'text-allow-overlap': false,
												'text-padding': 2,
												'text-max-angle': 90,
												'text-size': {
													'base': 1.2,
													'stops': [[8, 12], [22, 30]]
												},
												'text-letter-spacing': 0.1
											}}
											symbolPaint={{
												'text-halo-color': 'rgba(255, 255, 255, 0.8)',
												'text-halo-width': 8,
												'text-halo-blur': 3,
												"text-color": theme.locations[location.replace(' Library', '').replace(/ /g, '').toLowerCase()]
											}}
										/>
									</span>)
							})
					})}
					<Cluster ClusterMarkerFactory={this.clusterLocations}>
						{
							locations.map((location, key) =>
								<Marker
									key={'mk_lib_' + key}
									style={styles.marker}
									coordinates={[location.longitude, location.latitude]}>
									<LocationAvatar
										location={location}
										viewLocation={() => this.props.viewLocation(location.location_name)} />
								</Marker>
							)
						}
					</Cluster>
					{this.props.current_position && this.props.current_position.length > 0 ?
						<Marker
							key={'mk_me'}
							style={styles.marker}
							coordinates={[this.props.current_position[0], this.props.current_position[1]]}>
							<MeAvatar search_type={this.props.search_type} />
						</Marker>
						: null}
				</Map>
				<Popover
					classes={{
						paper: classes.paper
					}}
					elevation={0}
					open={this.state.popover}
					anchorReference="anchorPosition"
					anchorPosition={{ top: this.state.popover_position ? this.state.popover_position.y : 0, left: this.state.popover_position ? this.state.popover_position.x : 0 }}
					onClose={() => { this.setState({ popover_position: null, popover: false }) }}
				>
					<Typography variant="body2">{this.state.popover_message}</Typography>
				</Popover>
			</div>
		);
	}
}

LocationMap.propTypes = {
	classes: PropTypes.object.isRequired,
	theme: PropTypes.object.isRequired
};

export default withStyles(styles, { withTheme: true })(LocationMap);
