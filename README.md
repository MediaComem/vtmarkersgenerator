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

### Using with docker-compose

To use the kill feature, the docker socket need to be mounted as a volume:
```yaml
volumes:
    - /var/run/docker.sock:/var/run/docker.sock
```

And docker container user smapshot_vt need to be granted permission on the `docker.sock` file of the host. This might be done by giving access to `docker` user group.


## Configuration

The following environment variables need to be set at build time:

Variable                         | Default value                                | Description
:---                             | :---                                         | :---
`CHANNEL_NAME_PREFIX`            | -                                            | Give a prefix to the channel name. Default is no prefix
`KILL_IMAGE_NAME`                | -                                            | Imager name corresponding to a running container to send kill signal (for example to gracefully restart it when new tilesets are generated)
`KILL_SIGNAL`                    | -                                            | Type of kill signal send to KILL_IMAGE_NAME container
`DB_USER`                        | -                                            | The username to connect to the database
`DB_PASS`                        | -                                            | The password to connect to the database
`DB_HOST`                        | -                                            | The hostname to connect to the database
`DB_PORT`                        | -                                            | The port to connect to the database
`DB_NAME`                        | -                                            | The database name to connect to the database

Tilesets are stored at `/usr/src/app/output`.

Default channel_name are `visit` and `contribute`.
