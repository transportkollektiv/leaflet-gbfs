import './L.GBFS.css';

import {
  Layer, GeoJSON, Marker, Icon, DivIcon, LatLng, setOptions,
} from 'leaflet';

const iconUrl = require('./images/bike_icon.png');

const GBFS = Layer.extend({
  options: {
    gbfsURL: '',
    language: null,
    start: true,
    interval: 60 * 1000,
    onlyRunWhenAdded: false,
    bikeMarkerColor: 'white',
    bikeMarkerBgColor: 'silver',
    showStationPopup: true,
    showBikePopup: true,
  },

  initialize(options) {
    setOptions(this, options);
    this.container = new GeoJSON(null, options);
    this.updating = false;

    if (this.options.start && !this.options.onlyRunWhenAdded) {
      this.start();
    }
  },

  async start() {
    try {
      const gbfsResponse = await fetch(this.options.gbfsURL);
      const gbfs = await gbfsResponse.json();
      if (this.options.language) {
        if (!Object.prototype.hasOwnProperty.call(gbfs.data, this.options.language)) {
          throw new Error(`defined language (${this.options.language}) missing in gbfs file`);
        }
      } else {
        const languages = Object.keys(gbfs.data);
        if (languages.length === 0) {
          throw new Error('GBFS has no languages defined');
        } else {
          this.options.language = languages[0];
        }
      }

      const feeds = gbfs.data[this.options.language].feeds;
      const stationInformation = feeds.find((el) => el.name === 'station_information');
      const stationStatus = feeds.find((el) => el.name === 'station_status');
      const freeBikeStatus = feeds.find((el) => el.name === 'free_bike_status');
      const vehicleTypes = feeds.find((el) => el.name === 'vehicle_types');

      this.feeds = {
        stationInformation, stationStatus, freeBikeStatus, vehicleTypes,
      };

      if (!this.timer) {
        this.timer = setInterval(() => this.update(), this.options.interval);
        this.update();
      }
    } catch (err) {
      console.warn(err);
      this.fire('error', { error: err });
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

  isUpdating() {
    return this.updating;
  },

  async update() {
    if (typeof this.feeds === 'undefined') {
      return this;
    }
    try {
      this.updating = true;
      const stationInformationResponse = await fetch(this.feeds.stationInformation.url);
      const stations = await stationInformationResponse.json();
      const stationStatusResponse = await fetch(this.feeds.stationStatus.url);
      const stationStatus = await stationStatusResponse.json();
      const freeBikeStatusResponse = await fetch(this.feeds.freeBikeStatus.url);
      const freeBikeStatus = await freeBikeStatusResponse.json();
      let vehicleTypes;
      if (typeof this.feeds.vehicleTypes !== 'undefined') {
        const vehicleTypesResponse = await fetch(this.feeds.vehicleTypes.url);
        vehicleTypes = await vehicleTypesResponse.json();
      }

      this.container.clearLayers();

      stations.data.stations.forEach((station) => {
        stationStatus.data.stations.forEach((status) => {
          if ((status.station_id === station.station_id) && status.is_installed) {
            const icon = new DivIcon({
              html: this.getStationIconHtml(status.num_bikes_available, status.num_docks_available),
              bgPos: [16, 16],
              iconSize: [32, 32],
              popupAnchor: [0, -21],
              className: 'station-icon',
            });
            const point = new LatLng(station.lat, station.lon);
            const marker = new Marker(point, {
              icon,
            });
            if (this.options.showStationPopup) {
              marker.bindPopup(`<b>${station.name}</b><br>Available bikes: <b>${status.num_bikes_available}</b>`);
            }
            marker.on('click', (e) => this.fire('stationClick', { event: e, station, status }));
            marker.addTo(this.container);
          }
        });
      });

      const icon = new Icon({
        iconSize: [32, 32],
        popupAnchor: [0, -20],
        iconUrl,
      });

      freeBikeStatus.data.bikes.forEach((bike) => {
        const point = new LatLng(bike.lat, bike.lon);
        const marker = new Marker(point, {
          icon,
        });
        if (this.options.showBikePopup) {
          marker.bindPopup('Bike available');
        }
        marker.on('click', (e) => this.fire('bikeClick', { event: e, bike }));
        marker.addTo(this.container);
      });

      const dataUpdate = { stations, stationStatus, freeBikeStatus };
      if (typeof vehicleTypes !== 'undefined') dataUpdate.vehicleTypes = vehicleTypes;
      this.fire('data', dataUpdate);
    } catch (err) {
      this.updating = false;
      console.warn(err);
      this.fire('error', { error: err });
    }

    this.updating = false;
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

export default GBFS;
