/* Copyright (c) 2024 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const fs = require('fs').promises;
const os = require('os');
const { exec } = require('child_process');
const { createWriteStream } = require('fs');

async function executeAndLog(command, logFilePath, callback) {
    const currentDate = new Date().toLocaleString();

    try {
        await fs.appendFile(logFilePath, `${os.EOL}>> ${currentDate}${os.EOL}`);

        const childProcess = exec(command);

        const logStream = createWriteStream(logFilePath, { flags: 'a' });

        childProcess.stdout.on('data', (data) => {
            const lines = data.toString().split(os.EOL);

            lines.forEach((line) => {
                const trimmedLine = line.trim();

                if (
                    !/[░▒█]/.test(trimmedLine) &&
                    /[a-zA-Zа-яА-Я0-9]/.test(trimmedLine) &&
                    !trimmedLine.includes('have version numbers that cannot be determined')
                ) {
                    logStream.write(trimmedLine + os.EOL);
                }
            });
        });

        childProcess.stderr.on('data', (data) => {
            console.error(`Error: ${data}`);
            logStream.end();
        });

        childProcess.stderr.pipe(logStream);
        childProcess.stdout.pipe(process.stdout);
        childProcess.stderr.pipe(process.stderr);

        await new Promise((resolve) => childProcess.on('exit', resolve));

        logStream.end();
        callback(logFilePath);
    } catch (error) {
        console.error(`Execution failed: ${error}`);
    }
}

async function checkAndTrimLogFile(logFilePath, maxFileSizeInBytes) {
    try {
        const stats = await fs.stat(logFilePath);

        if (stats.size > maxFileSizeInBytes) {
            const logContent = await fs.readFile(logFilePath, 'utf-8');
            const blocks = logContent.split(`${os.EOL}${os.EOL}`);

            if (blocks.length > 1) {
                const trimmedLog = blocks.slice(1).join(`${os.EOL}${os.EOL}`);
                await fs.writeFile(logFilePath, trimmedLog, 'utf-8');
                console.log(`Log file size reduced`);
            } else {
                await fs.truncate(logFilePath, 0);
            }
        }
    } catch (error) {
        console.error(`Failed to trim log file: ${error}`);
    }
}

module.exports = {
    executeAndLog,
    checkAndTrimLogFile,
};
