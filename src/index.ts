import './lib/env';

import './lib/logPerformance';
import { performance } from 'perf_hooks';

import * as config from './lib/config';
import * as db from './lib/db';

import * as geoJSON from './pipeline/geojson';
import * as killSignal from './pipeline/killSignal';
import * as vt from './pipeline/vt';

/* Main */

const tasks = config.getTasks();

db.connect().then(async(subscriber:any) => {
  (await tasks).forEach(([name, task]) => {
    initPipeline(subscriber, name, task.channelName, task.sql, task.vtParams);
  })
});

const initPipeline = (subscriber: any, name: string, channelName: string, sql: string, vtParams: string[]) => {
  /* Initalize listening of channel */

  subscriber.listenTo(channelName);
  console.log(`Listen to channel '${channelName}'`);

  /* Launch pipeline at startup */

  if(process.env.TRIGGER_AT_STARTUP === 'yes'){
    triggerPipeline(name, sql, vtParams);
  }

  /* Set trigger on channel notification */
  subscriber.notifications.on(channelName, async() => { triggerPipeline(name, sql, vtParams); })
}

const triggerPipeline = async (name: string, sql: string, vtParams: string[]) => {
  console.log(`Task ${name}: new point triggered`)

  /* Start performance timer */

  performance.mark('start');

  /* 1. Export a GeoJSON file from the DB */

  await geoJSON.generate(`${process.env.TMP_PATH}/${name}.geojson`, sql)

  /* 2. Export MbTiles from Geojson */

  await vt.generate(`${process.env.TMP_PATH}/${name}.geojson`, `${process.env.OUTPUT_PATH}/${name}.mbtiles`, vtParams);

  /* 3. Send signal to vector tiles server */

  killSignal.send();

  /* Stop performance timer and measure it - performanceObserver will log automatically the measurement */

  performance.mark('stop');
  performance.measure(`${name} pipeline`, 'start', 'stop');
}
