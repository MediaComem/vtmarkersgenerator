import { spawn } from 'child_process';
import fs from 'fs';
import filesize from 'filesize';

const generate = (inputpPath: string, outputPath: string, exportArgs: string[]) => {
    if (!inputpPath) throw new Error('Export of vector tiles require an input path');
    if (!outputPath) throw new Error('Export of vector tiles require an export path');

    const baseArgs = [
        '--force',
        '--quiet',
        '-o',
        outputPath,
        inputpPath
    ];

    return new Promise<void>((resolve, reject) => {
        const task = spawn('tippecanoe', [...baseArgs, ...exportArgs], { shell: true });

        task.stderr.on('data', (data: string) => {
            console.error(`VT export stderr: ${data}`);
            reject();
        });

        task.on('close', (code: number) => {
            if (code !== 0) {
                console.error(`VT export process exited with code ${code}`);
                reject();
            }

            const fileStats = fs.statSync(outputPath);
            console.log(`MBtiles sucessfuly created at ${outputPath} with a size of ${filesize(fileStats.size, { round: 0 })} `);
            resolve();
        });
    });
};

const filter = (inputpPath: string, outputPath: string, filterArg: string) => {
    if (!inputpPath) throw new Error('Filtering vector tiles require an input path');
    if (!outputPath) throw new Error('Filtering vector tiles require an export path');
    if (!filterArg) throw new Error('Filtering vector tiles require an filter argument');

    const args = [
        '--force',
        '--quiet',
        '-j',
        `'${filterArg}'`,
        '-o',
        outputPath,
        inputpPath,
    ];

    return new Promise<void>((resolve, reject) => {
        const task = spawn('tile-join', args, { shell: true });

        task.stderr.on('data', (data: string) => {
            console.error(`VT filtering stderr: ${data}`);
            reject();
        });

        task.on('close', (code: number) => {
            if (code !== 0) {
                console.error(`VT filtering process exited with code ${code}`);
                reject();
            }

            const fileStats = fs.statSync(outputPath);
            console.log(`MBtiles sucessfuly filtered and created at ${outputPath} with a size of ${filesize(fileStats.size, { round: 0 })} `);
            resolve();
        });
    });
};

const merge = async (inputpPaths: string[], outputPath: string) => {
    if (!inputpPaths) throw new Error('Merging vector tiles require an input path');
    if (!outputPath) throw new Error('Merging vector tiles require an export path');

    const args = [
        '--force',
        '--quiet',
        '-o',
        outputPath,
        inputpPaths.join(" ")
    ];

    return new Promise<void>((resolve, reject) => {
        const task = spawn('tile-join', args, { shell: true });

        task.stderr.on('data', (data: string) => {
            console.error(`VT merging stderr: ${data}`);
            reject();
        });

        task.on('close', (code: number) => {
            if (code !== 0) {
                console.error(`VT merging process exited with code ${code}`);
                reject();
            }

            const fileStats = fs.statSync(outputPath);
            console.log(`MBtiles sucessfuly merged at ${outputPath} with a size of ${filesize(fileStats.size, { round: 0 })} `);
            resolve();
        });
    });
};

export {
    generate,
    filter,
    merge
};
