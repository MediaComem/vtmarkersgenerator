# Vector tiles generation for Smapshot

Pipeline to generate MBtiles (vector tiles) when a new point (a new picture) is validated or added. The server use Node and listen by default to two 'PG_notify' notification 'new_visit' and 'new_contribute'. A GeoJSON is created with a specific SQL query for each of the point type and then processed with Tippecanoe to create a MBTiles file. The file can be then served with for example [maptiler/tileserver-gl](https://github.com/maptiler/tileserver-gl) or [consbio/mbtileserver](https://github.com/consbio/mbtileserver)

## Getting started with Node.js

To run the application on your machine, you will need:

* ogr2ogr (from GDAL)
* tippecanoe

### Installation of ogr2ogr on ubuntu

```bash
sudo add-apt-repository ppa:ubuntugis/ppa
sudo apt-get update
sudo apt-get install gdal-bin
```

### Installation of Tippecanoe on ubuntu

```bash
git clone https://github.com/mapbox/tippecanoe.git
cd tippecanoe
make -j
make install

### Running the application

```bash
# Install dependencies.
npm ci

# Run the application.
npm run start
```

## Getting started with Docker

To run the development environment in Docker containers, you will need:

* Docker 19+
* Docker Compose 1.25+

Then simply build and run the application:
```bash
docker build . --tag smapshot-points-vt-generate:X.X
```

## Configuration

The following environment variables need to be set at build time:

Variable                         | Default value                                | Description
:---                             | :---                                         | :---
`DB_USER`                        | -                                            | The username to connect to the database
`DB_PASS`                        | -                                            | The password to connect to the database
`DB_HOST`                        | -                                            | The hostname to connect to the database
`DB_PORT`                        | -                                            | The port to connect to the database
`DB_NAME`                        | -                                            | The database name to connect to the database

Tilesets are stored at `/usr/src/app/output`.
