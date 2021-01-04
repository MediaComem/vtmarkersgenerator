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

        /* Output Errors from ogr2ogr */
        task.stderr.on('data', (data: string) => {
            reject(new Error(`GeoJSON export stderr: ${data}`));
        });

        task.on('close', (code: number) => {
            /* Process exited */
            if (code !== 0) reject(new Error(`GeoJSON export process exited with code ${code}`));

            const fileStats = fs.statSync(exportPath);

            /* Check if file is empty */
            if (fileStats.size < 1000) { // Evalute only file under 1000 B. 100 B should be sufficient in theory. 1000 B is safe bet
                const file = fs.readFileSync(exportPath, 'utf8');
                const fileParsed = JSON.parse(file);
                const isFeaturesEmpty = Object.entries(fileParsed.features).length === 0;

                if (isFeaturesEmpty) reject(`No matching feature, check SQL parameters`);
            }

            console.log(`Temporary geoJSON created at ${exportPath} with a size of ${filesize(fileStats.size, { round: 0 })} `);
            resolve();
        });
    });
};

export {
    generate
};

