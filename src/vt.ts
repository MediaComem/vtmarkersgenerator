import { spawn } from 'child_process';
import fs from 'fs';
import filesize from 'filesize';

const generate = (inputpPath: string, exportPath: string) => {
    if(!inputpPath) throw new Error('Export of vector tiles require an input path')
    if(!exportPath) throw new Error('Export of vector tiles require an export path')

    const exportArgs = [
        '--force',
        '--quiet',
        '-z11',
        '-o',
        exportPath,
        '--drop-densest-as-needed',
        '--extend-zooms-if-still-dropping',
        inputpPath
    ];

    return new Promise((resolve, reject) => {
        const task = spawn('tippecanoe', exportArgs, { shell: true });

        task.stderr.on('data', (data: string) => {
            console.error(`VT export stderr:\n${data}`);
        });

        task.on('close', (code: number) => {
            if (code !== 0) {
                console.error(`VT export process exited with code ${code}`);
                process.exit(1)
            }

            const fileStats = fs.statSync(exportPath);
            console.log(`MBtiles sucessfuly created at ${exportPath} with a size of ${filesize(fileStats.size, {round: 0})} `);
            resolve();
        });
    });
}

export {
    generate
};
