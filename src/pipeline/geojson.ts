import { spawn } from 'child_process';
import fs from 'fs';
import filesize from 'filesize';

const generate = (exportPath: string, query: string) => {
    if (!exportPath) throw new Error('Export of geojson require an export path');
    if (!query) throw new Error('Export of geojson require an SQL query');

    const exportArgs = [
        '-f',
        '"GeoJSON"',
        exportPath,
        `PG:"host=${process.env.DB_HOST} port=${process.env.DB_PORT} user=${process.env.DB_USER} password=${process.env.DB_PASS} dbname=${process.env.DB_NAME}"`,
        '-sql',
        `"${query.trim()}"`
    ];

    /* Delete geoJSON if already exist to prevent issue with GDAL GeoJSON overwriting driver */
    if (fs.existsSync(exportPath)) {
        fs.unlinkSync(exportPath);
    }

    return new Promise<void>((resolve, reject) => {
        const task = spawn('ogr2ogr ', exportArgs, { shell: true });

        task.stderr.on('data', (data: string) => {
            console.error(`GeoJSON export stderr: ${data}`);
            reject();
        });

        task.on('close', (code: number) => {
            if (code !== 0) {
                console.error(`GeoJSON export process exited with code ${code}`);
                reject();
            }

            const fileStats = fs.statSync(exportPath);
            console.log(`Temporary geoJSON sucessfuly created at ${exportPath} with a size of ${filesize(fileStats.size, { round: 0 })} `);
            resolve();
        });
    });
};

export {
    generate
};

