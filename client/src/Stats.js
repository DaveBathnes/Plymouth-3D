// React
import React from 'react';
import PropTypes from 'prop-types';

// Material UI
import { fade } from '@material-ui/core/styles/colorManipulator';
import ListSubheader from '@material-ui/core/ListSubheader';
import { withStyles } from '@material-ui/core/styles';

// Chart JS
import { Bar } from 'react-chartjs-2';

import * as isoHelper from './helpers/isochrones';

// Style: 
const styles = theme => ({

});

class Stats extends React.Component {
	componentDidMount = () => {
		// When the component is loaded we trigger the isochrones download
		this.props.getIsochrones(this.props.location.location_name);
	}

	render() {
		const { location, isochrones, theme } = this.props;
		return (
			<div>
				{isochrones && isochrones[location.location_name] ?
					Object.keys(isochrones[location.location_name])
						.map((travel, i) => {
							let travel_name = '';
							this.props.travel_types.forEach(travel_def => {
								if (travel_def.travel_type === travel) travel_name = travel_def.description;
							});
							let iso_data = isoHelper.getIsochroneData(isochrones[location.location_name][travel].iso);
							let data_labels = iso_data.map(f => { return (f.value / 60) + ' mins' });
							let data_values = iso_data.map(f => { return f.total_pop });
							return (
								<div key={'travel_stats_' + i}>
									<ListSubheader disableSticky>{travel_name + ' distance population'}</ListSubheader>
									<br />
									<Bar
										data={
											{
												labels: data_labels,
												datasets: [{
													label: 'Population',
													data: data_values,
													backgroundColor: fade(theme.locations[location.location_name.replace(' Library', '').replace(/ /g, '').toLowerCase()], 0.6)
												}]
											}
										}
										height={150}
										options={{
											maintainAspectRatio: true,
											legend: {
												display: false
											}
										}}
									/>
								</div>
							)
						}) : null}
			</div>
		);
	}
}

Stats.propTypes = {
	classes: PropTypes.object.isRequired
};

export default withStyles(styles, { withTheme: true })(Stats);