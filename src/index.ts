import './lib/env';

import fs from 'fs';
import chalk from 'chalk';
import { performance, PerformanceObserver } from 'perf_hooks';

import * as geoJSON from './geojson';
import * as vt from './vt';
import * as db from './db'

/* Create output folder if it doesn't exist */
if(!fs.existsSync("output")){
  fs.mkdirSync("output");
}

/* Main */

db.connect().then((subscriber:any) => {
  /* Visit point pipeline */
  const visitQuery = "SELECT id, ST_Force2D(location) FROM images WHERE state='validated' AND location IS NOT NULL";
  enablePipeline(subscriber, 'visit', visitQuery);

  /* Contribute point pipeline */
  const contributeQuery = "SELECT images.id, ST_Force2D(apriori_locations.geom) FROM images LEFT JOIN apriori_locations ON images.id = apriori_locations.image_id WHERE state='not_georef' AND apriori_locations IS NOT NULL";
  enablePipeline(subscriber, 'contribute', contributeQuery);
});

const enablePipeline = (subscriber: any, type: 'contribute' | 'visit', query: string) => {
  const channelName = `new_${type}`;

  /* Initalize listening of channel */
  listenToChannel(subscriber, channelName);

  /* Launch pipeline at startup if MBTiles doesn't exist */
  if(!fs.existsSync(`./output/${type}.mbtiles`)){
    triggerPipeline(type, query);
  }

  /* Set trigger on channel notification */
  subscriber.notifications.on(channelName, async() => { triggerPipeline(type, query); })
}

const listenToChannel = (subscriber: any, name: string) => {
  subscriber.listenTo(name);
  console.log(`Listen to channel '${name}'`);
}

const triggerPipeline = async (type: 'contribute' | 'visit', query: string) => {

  const pipeline = async () => {
    console.log(chalk.hex(type === 'contribute' ? '#ff763c' : '#3cc0c5')(type) + ': new point triggered')
    /* Export a GeoJSON file from the DB */
    await geoJSON.generate(`/tmp/${type}.geojson`, query)
    /* Export MbTiles from Geojson */
    await vt.generate(`/tmp/${type}.geojson`, `./output/${type}.mbtiles`);
  }

  /* Measure pipeline duration */

  performance.mark('start');
  await pipeline();
  performance.mark('stop');
  performance.measure(`${type} pipeline`, 'start', 'stop');

}

/* Log pipeline duration */

const performanceObserver = new PerformanceObserver((items: any, observer: any) => {
  const entry = items.getEntries().pop();
  const ms = entry?.duration || 0;
  console.log(`Duration of ${entry?.name}: ${(ms/1000).toFixed(2)} seconds`);
});
performanceObserver.observe({ entryTypes: ['measure'] });


