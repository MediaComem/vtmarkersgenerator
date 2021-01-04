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

        /* Output Errors from tippecanoe */
        task.stderr.on('data', (data: string) => {
            reject(new Error(`VT export stderr: ${data}`));
        });

        task.on('close', (code: number) => {
            /* Process exited */
            if (code !== 0) reject(new Error(`VT export process exited with code ${code}`));

            const fileStats = fs.statSync(outputPath);
            console.log(`\nMBtiles created at ${outputPath} with a size of ${filesize(fileStats.size, { round: 0 })} `);
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

        /* Output Errors from tile-join */
        task.stderr.on('data', (data: string) => {
            reject(new Error(`VT filtering stderr: ${data}`));
        });

        task.on('close', (code: number) => {
            /* Process exited */
            if (code !== 0) reject(new Error(`VT filtering process exited with code ${code}`));

            const fileStats = fs.statSync(outputPath);
            console.log(`\nMBtiles filtered and created at ${outputPath} with a size of ${filesize(fileStats.size, { round: 0 })} `);
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

        /* Output Errors from tile-join */
        task.stderr.on('data', (data: string) => {
            reject(new Error(`VT merging stderr: ${data}`));
        });

        task.on('close', (code: number) => {
            /* Process exited */
            if (code !== 0) reject(new Error(`VT merging process exited with code ${code}`));

            const fileStats = fs.statSync(outputPath);
            console.log(`\nMBtiles merged at ${outputPath} with a size of ${filesize(fileStats.size, { round: 0 })} `);
            resolve();
        });
    });
};

export {
    generate,
    filter,
    merge
};
