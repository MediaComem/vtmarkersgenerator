import { resolve } from 'path';
import fs from 'fs';
import { config } from 'dotenv';

config({ path: resolve(__dirname, '../../.env') });

/* Set directories variable */

process.env.TMP_PATH = '/tmp';
process.env.OUTPUT_PATH = './output';

/* Create output folder if it doesn't exist */

if(!fs.existsSync(process.env.OUTPUT_PATH)){
    fs.mkdirSync(process.env.OUTPUT_PATH);
}
