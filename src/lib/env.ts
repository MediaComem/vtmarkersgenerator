import { resolve } from 'path';
import fs from 'fs';
import { config } from 'dotenv';

config({ path: resolve(__dirname, '../../.env') });
