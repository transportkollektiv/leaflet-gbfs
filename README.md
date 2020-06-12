# leaflet-gbfs

Leaflet plugin to show GBFS data.

Still work in progress...

## Getting Started

```bash
$ git clone https://github.com/stadtulm/leaflet-gbfs
$ cd leaflet-gbfs
$ npm install
$ npm run build
```

## Options

`var gbfs = new L.GBFS({ gbfsURL: 'https://api.openbike.ulm.dev/gbfs/gbfs.json' }).addTo(map);`

* `gbfsURL` is the only **required** option. This should be the complete URL to the gbfs.json.

* `language` defines the GBFS feed language from `gbfs.json` should be used. If no language is set the first language in `gbfs.json` is used.

*  `interval` defines how often new data from GBFS feed is requested. unit: milliseconds, *default:* `60 * 1000`

