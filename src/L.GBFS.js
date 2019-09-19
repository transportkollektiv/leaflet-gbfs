import './L.GBFS.css';

L.GBFS = L.Layer.extend({
    options: {
        gbfsURL: '',
        start: true,
        interval: 60 * 1000,
        onlyRunWhenAdded: false
    },

    initialize: function(options) {
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
            const response = await fetch(`${this.options.gbfsURL}station_information.json`);
            const stations = await response.json();

            this.container.clearLayers();
            this.container.addData({
                type: 'FeatureCollection',
                features: stations.data.stations.map(station => ({
                    type: 'Feature',
                    properties: {...station},
                    geometry: {
                        type: 'Point',
                        coordinates: [
                            station.lon,
                            station.lat
                        ]
                    }
                }))
            });
        } catch(err) {
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
    }
});

module.exports = L.GBFS;
