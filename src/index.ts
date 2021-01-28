import './lib/env';

import './lib/logPerformance';
import { performance } from 'perf_hooks';
import fs from 'fs';
import Queue from 'better-queue';

import * as config from './lib/config';
import * as db from './lib/db';

import * as geoJSON from './pipeline/geojson';
import * as killSignal from './pipeline/killSignal';
import * as vt from './pipeline/vt';

const TMP_PATH = process.env.TMP_PATH;
const OUTPUT_PATH = process.env.OUTPUT_PATH;

/* Main */

const tasks = config.getTasks();

db.connect().then(async (subscriber: any) => {
  (await tasks).forEach(([name, task]) => {
    initPipeline(subscriber, name, task.channelName, task.sql, task.sqlColumNameRef, task.vtParams);
  });
});


interface Update {
  action: "add" | "remove";
  ref: number;
}

const initPipeline = async (subscriber: any, name: string, channelName: string, sql: string, sqlColumNameRef: string, vtParams: string[]) => {
  /* Create queue for channel update */

  const q = new Queue(async (task, cb) => {
    /* Trigger single update when a valid ref is given */
    const isSingleUpdate = task.update?.ref && (typeof task.update?.ref === 'number' && isFinite(task.update?.ref));

    if (isSingleUpdate) {
      await triggerSingleUpdate(name, sql, sqlColumNameRef, vtParams, task.update);
    } else {
      await triggerBulkUpdate(name, sql, vtParams);
    }
    cb();
  });

  /* Launch pipeline at startup to create initial mbtile */

  await triggerBulkUpdate(name, sql, vtParams);

  /* Initalize listening of channel */

  subscriber.listenTo(channelName);
  console.log(`\nListen to channel '${channelName}'\n`);

  /* Launch pipeline on update via channel notification */

  subscriber.notifications.on(channelName, async (update: Update) => {
    q.push({ id: channelName, update });
  });
};

const triggerBulkUpdate = async (name: string, sql: string, vtParams: string[]): Promise<any> => {
  console.log(`\nTask '${name}': create bulk mbtile`);

  try {
    /* Start performance timer */

    performance.mark('start');

    /* 1. Export a GeoJSON file from the DB */

    await geoJSON.generate(`${TMP_PATH}/${name}.geojson`, sql);

    /* 2. Export MbTiles from Geojson */

    await vt.generate(`${TMP_PATH}/${name}.geojson`, `${OUTPUT_PATH}/${name}.mbtiles`, vtParams);

    /* Optional: 3. Send signal to vector tiles server */

    killSignal.send();

    /* Stop performance timer and measure it - performanceObserver will log automatically the measurement */

    performance.mark('stop');
    performance.measure(`${name} pipeline`, 'start', 'stop');

  } catch (e) {
    console.error(`Task '${name}': An error happen during the generation, please review the parameters\n\n${e}`);
  }
};

const addPoint = async (ref: number, name: string, sql: string, sqlColumNameRef: string, vtParams: string[]) => {
  const sqlUniqueId = sql + ` AND ${sqlColumNameRef} = ${ref}`;
  const timestamp = Date.now();

  const singleName = `${name}_${ref}_${timestamp}`;

  try {

    /* 1. Export a GeoJSON file from the DB */
    await geoJSON.generate(`${TMP_PATH}/${singleName}.geojson`, sqlUniqueId);

    /* 2. Export MbTiles from Geojson */

    // Ensure that the point is added to the task name layer. Without attributes a new layer will be created following the geojson filename.
    if (!vtParams.includes('-l')) {
      vtParams.push('-l');
      vtParams.push(name);
    }

    await vt.generate(`${TMP_PATH}/${singleName}.geojson`, `${TMP_PATH}/${singleName}.mbtiles`, vtParams);

    /* 3. Make a temporary file */

    await fs.promises.copyFile(`${OUTPUT_PATH}/${name}.mbtiles`, `${TMP_PATH}/${name}_${timestamp}.mbtiles`);

    /* 4. Merge unique MbTiles with initial Mbtiles and remove unique MbTiles */

    const mbtilesToMerge = [
      `${TMP_PATH}/${singleName}.mbtiles`,
      `${TMP_PATH}/${name}_${timestamp}.mbtiles`,
    ];

    await vt.merge(mbtilesToMerge, `${OUTPUT_PATH}/${name}.mbtiles`);

    /* 5. Delete temporary files */

    fs.promises.unlink(`${TMP_PATH}/${singleName}.geojson`);
    fs.promises.unlink(`${TMP_PATH}/${singleName}.mbtiles`);
    fs.promises.unlink(`${TMP_PATH}/${name}_${timestamp}.mbtiles`);

  } catch (msg) {
    console.error(msg);
  }
};

const removePoint = async (ref: number, name: string) => {
  const filter = `{"*":["none",["==","$id", ${ref}]]}`; // Tippecanoe/tile-join use old Mapbox Gl Specification (as of writing). Nowadays "$ref" would be written [ref]

  try {
    /* 1. Filter MbTiles */

    await vt.filter(`${OUTPUT_PATH}/${name}.mbtiles`, `${TMP_PATH}/${name}.mbtiles`, filter);

    /* 2. Overwrite MbTiles with filterd MbTiles */

    await fs.promises.rename(`${TMP_PATH}/${name}.mbtiles`, `${OUTPUT_PATH}/${name}.mbtiles`);
  } catch (msg) {
    console.error(msg);
  }
};

const triggerSingleUpdate = async (name: string, sql: string, sqlColumNameRef: string, vtParams: string[], update: Update): Promise<any> => {
  try {
    /* Check update ref */

    if (!update?.ref || (typeof update?.ref !== 'number' && !isFinite(update?.ref))) {
      throw new Error('Id update is not a number.');
    }

    /* Start performance timer */

    performance.mark('start');

    /* Add or remove point */

    console.log(`\nTask '${name}': ${update?.action} point ${update.ref}\n`);

    switch (update?.action) {
      case 'add':
        await addPoint(update.ref, name, sql, sqlColumNameRef, vtParams);
        break;
      case 'remove':
        await removePoint(update.ref, name);
        break;
      default:
        throw new Error('Action update keyword is unknown.');
    }

    /* Optional: 3. Send signal to vector tiles server */

    killSignal.send();

    /* Stop performance timer and measure it - performanceObserver will log automatically the measurement */

    performance.mark('stop');
    performance.measure(`${name} pipeline`, 'start', 'stop');

  } catch (e) {
    console.error(`Task '${name}': An error happen during the update, please review the parameters`);
    if (e) console.error(`Error: ${e}`);
  }
};
