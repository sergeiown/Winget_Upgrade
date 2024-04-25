/* Copyright (c) 2024 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

function executeAndLog(command, logFilePath, callback) {
    console.clear();

    const currentDate = new Date().toLocaleString();

    fs.appendFileSync(logFilePath, `${os.EOL}>> ${currentDate}${os.EOL}`);

    const childProcess = exec(command);

    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

    childProcess.stdout.on('data', (data) => {
        const lines = data.toString().split(os.EOL);

        lines.forEach((line) => {
            const trimmedLine = line.trim();

            if (!/[░▒█]/.test(trimmedLine) && /[a-zA-Zа-яА-Я0-9]/.test(trimmedLine)) {
                logStream.write(trimmedLine + os.EOL);
            }
        });
    });

    childProcess.stderr.pipe(logStream);

    childProcess.stdout.pipe(process.stdout);
    childProcess.stderr.pipe(process.stderr);

    childProcess.on('exit', () => {
        callback(logFilePath);
    });
}

function checkAndTrimLogFile(logFilePath, maxFileSizeInBytes) {
    const fileSizeInBytes = fs.statSync(logFilePath).size;

    if (fileSizeInBytes > maxFileSizeInBytes) {
        const logContent = fs.readFileSync(logFilePath, 'utf-8');
        const blocks = logContent.split(`${os.EOL}${os.EOL}`);

        if (blocks.length > 1) {
            const trimmedLog = blocks.slice(1).join(`${os.EOL}${os.EOL}`);
            fs.writeFileSync(logFilePath, trimmedLog, 'utf-8');
            console.log(`Log file size reduced`);
        } else {
            fs.truncateSync(logFilePath, 0);
        }
    }
}

module.exports = {
    executeAndLog,
    checkAndTrimLogFile,
};
