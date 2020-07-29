import { resolve } from 'path';
import fs from 'fs';
import { config } from 'dotenv';

config({ path: resolve(__dirname, '../../.env') });

/* Check if OUTPUT_PATH is set */

if(!process.env.OUTPUT_PATH || !fs.existsSync(process.env.OUTPUT_PATH)){
    console.log("Either 'OUTPUT_PATH' env variable is missing or the path doesn't exist")
    process.exit(1);
  }
