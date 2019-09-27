import './L.GBFS.css';

const iconUrl = require('./images/bike_icon.png');

L.GBFS = L.Layer.extend({
  options: {
    gbfsURL: '',
    start: true,
    interval: 60 * 1000,
    onlyRunWhenAdded: false,
    bikeMarkerColor: 'rgb(87, 162, 255)',
    bikeMarkerBgColor: 'white',
  },

  initialize(options) {
    L.setOptions(this, options);
    this.container = L.geoJson(null, options);

    if (this.options.start && !this.options.onlyRunWhenAdded) {
      this.start();
    }
  },

  start() {
    if (!this.timer) {
      this.timer = setInterval(() => this.update(), this.options.interval);
      this.update();
    }

    return this;
  },

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      delete this.timer;
    }

    return this;
  },

  isRunning() {
    return this.timer !== undefined;
  },

  async update() {
    try {
      const stationInformationResponse = await fetch(`${this.options.gbfsURL}station_information.json`);
      const stations = await stationInformationResponse.json();
      const stationStatusResponse = await fetch(`${this.options.gbfsURL}station_status.json`);
      const stationStatus = await stationStatusResponse.json();

      const freeBikeStatusResponse = await fetch(`${this.options.gbfsURL}free_bike_status.json`);
      const freeBikeStatus = await freeBikeStatusResponse.json();

      this.container.clearLayers();

      stations.data.stations.forEach((station) => {
        stationStatus.data.stations.forEach((status) => {
          if ((status.station_id === station.station_id) && status.is_installed) {
            const icon = new L.DivIcon({
              html: this.getStationIconHtml(status.num_bikes_available, status.num_docks_available),
              bgPos: [13, 13],
              iconSize: [26, 26],
              popupAnchor: [0, -17],
              className: 'station-icon',
            });
            const point = L.latLng(station.lat, station.lon);
            const marker = new L.Marker(point, {
              icon,
            });
            marker.bindPopup(`<b>${station.name}</b><br>Available bikes: <b>${status.num_bikes_available}</b>`);
            marker.addTo(this.container);
          }
        });
      });

      const icon = new L.Icon({
        iconSize: [32, 32],
        popupAnchor: [0, -20],
        iconUrl,
      });

      freeBikeStatus.data.bikes.forEach((bike) => {
        const point = L.latLng(bike.lat, bike.lon);
        const marker = new L.Marker(point, {
          icon,
        });
        marker.addTo(this.container);
      });
    } catch (err) {
      console.warn(err);
      this.fire('error', { error: err });
    }

    return this;
  },

  getBounds() {
    if (this.container.getBounds) {
      return this.container.getBounds();
    }

    throw new Error('Container has no getBounds method');
  },

  onAdd(map) {
    map.addLayer(this.container);
    if (this.options.start) {
      this.start();
    }
  },

  onRemove(map) {
    if (this.options.onlyRunWhenAdded) {
      this.stop();
    }

    map.removeLayer(this.container);
  },

  getStationIconHtml(bikes, docks) {
    let cssClass = 'station-icon-inner';
    if (bikes === 0) {
      cssClass += ' station-icon-empty';
    }
    const degree = (bikes / (bikes + docks)) * 360;
    let ringCss = `
      background: ${this.options.bikeMarkerColor};
      background-image:
        linear-gradient(${90 + degree}deg, transparent 50%, ${this.options.bikeMarkerBgColor} 50%),
        linear-gradient(90deg, ${this.options.bikeMarkerBgColor} 50%, transparent 50%);
    `;

    if (degree > 180) {
      ringCss = `
        background: ${this.options.bikeMarkerColor};
        background-image:
          linear-gradient(${degree - 90}deg, transparent 50%, ${this.options.bikeMarkerColor} 50%),
          linear-gradient(90deg, ${this.options.bikeMarkerBgColor} 50%, transparent 50%);
      `;
    }
    return `
      <div class="station-icon-ring" style="${ringCss}">
        <div class="${cssClass}">${bikes}</div>
      </div>
    `;
  },
});

module.exports = L.GBFS;
