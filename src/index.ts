import './lib/env';

import './lib/logPerformance';
import { performance } from 'perf_hooks';

import * as config from './lib/config';
import * as db from './lib/db';

import * as geoJSON from './pipeline/geojson';
import * as killSignal from './pipeline/killSignal';
import * as vt from './pipeline/vt';

import Queue from 'better-queue';

/* Main */

const tasks = config.getTasks();

db.connect().then(async(subscriber:any) => {
  (await tasks).forEach(([name, task]) => {
    initPipeline(subscriber, name, task.channelName, task.debounceWait, task.sql, task.vtParams);
  })
});

const initPipeline = async (subscriber: any, name: string, channelName: string, debounceWait: number, sql: string, vtParams: string[]) => {
  /* Initalize listening of channel */

  subscriber.listenTo(channelName);
  console.log(`Listen to channel '${channelName}'`);

  /* Create queue for channel */

  const q = new Queue(async (task, cb) => {
    await triggerPipeline(name, sql, vtParams)
    cb();
  }, {
    afterProcessDelay : debounceWait
  })

  /* Launch pipeline at startup */

  if(process.env.TRIGGER_AT_STARTUP === 'yes'){
    q.push({ id: channelName })
  }

  /* Launch pipeline on channel notification */

  subscriber.notifications.on(channelName, async() => {
    q.push({ id: channelName })
  })
}

const triggerPipeline = async (name: string, sql: string, vtParams: string[]): Promise<any> => {
  console.log(`\nTask ${name}: new point triggered`)

  try{
    /* Start performance timer */

    performance.mark('start');

    /* 1. Export a GeoJSON file from the DB */

    await geoJSON.generate(`${process.env.TMP_PATH}/${name}.geojson`, sql)

    /* 2. Export MbTiles from Geojson */

    await vt.generate(`${process.env.TMP_PATH}/${name}.geojson`, `${process.env.OUTPUT_PATH}/${name}.mbtiles`, vtParams);

    /* Optional: 3. Send signal to vector tiles server */

    killSignal.send();

    /* Stop performance timer and measure it - performanceObserver will log automatically the measurement */

    performance.mark('stop');
    performance.measure(`${name} pipeline`, 'start', 'stop');

  } catch(e){
    console.log(e);
    process.exit(1);
  }
}
