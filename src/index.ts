import './lib/env';

import chalk from 'chalk';
import { performance, PerformanceObserver } from 'perf_hooks';

import * as geoJSON from './geojson';
import * as vt from './vt';
import * as db from './db'

db.connect().then((subscriber:any) => {
  /* Initalize listening of channel(s) */
  launchListeningChannel(subscriber, ['new_visit', 'new_contribute']);

  /* New Visit point pipeline */

  subscriber.notifications.on('new_visit', async() => {
    const query = "SELECT id, ST_Force2D(location) FROM images WHERE state='validated' AND location IS NOT NULL";

    triggerPipeline('visit', query);
  })

  /* New Contribute point pipeline */

  subscriber.notifications.on('new_contribute', async() => {
    const query = "SELECT images.id, ST_Force2D(apriori_locations.geom) FROM images LEFT JOIN apriori_locations ON images.id = apriori_locations.image_id WHERE state='not_georef' AND apriori_locations IS NOT NULL";

    triggerPipeline('contribute', query);
  })

});

const launchListeningChannel = (subscriber: any, channelNames: string[]) => {
  channelNames.forEach((name: string) => {
    subscriber.listenTo(name);
    console.log(`Listen to channel '${name}'`)
  });
}

const triggerPipeline = async (type: 'contribute' | 'visit', query: string) => {

  const pipeline = async () => {
    console.log(chalk.hex(type === 'contribute' ? '#ff763c' : '#3cc0c5')(type) + ': new point triggered')
    /* Export a GeoJSON file from the DB */
    await geoJSON.generate(`/tmp/${type}.geojson`, query)
    /* Export MbTiles from Geojson */
    await vt.generate(`/tmp/${type}.geojson`, `${process.env.OUTPUT_PATH}/${type}.mbtiles`);
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


