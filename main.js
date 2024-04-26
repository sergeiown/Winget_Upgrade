/* Copyright (c) 2024 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const { checkAndTrimLogFile, executeAndLog } = require('./utils');
const settings = require('./settings');

function checkForWinget() {
    exec(settings.wingetPath, (error, stdout) => {
        console.clear();

        if (error) {
            console.error('Error: winget is not installed on this system.');

            fs.appendFileSync(settings.logFilePath, `${os.EOL}>> ${new Date().toLocaleString()}${os.EOL}`);
            fs.appendFileSync(settings.logFilePath, 'Error: winget is not installed on this system.');
            process.exit(1);
        } else {
            console.log(`Winget is installed on the system.${os.EOL}`);
            const wingetLocation = stdout.trim();

            const command = `${wingetLocation} ${settings.wingetArgs.join(' ')}`;

            executeAndLog(command, settings.logFilePath, () => {
                checkAndTrimLogFile(settings.logFilePath, settings.maxLogFileSize);
                setTimeout(() => {
                    process.stdin.setRawMode(true);
                    process.stdin.resume();
                    process.stdin.on('data', process.exit.bind(process, 0));

                    console.log(settings.finalMessage);
                }, 1000);

                setTimeout(() => {
                    process.exit(0);
                }, 10000);
            });
        }
    });
}

checkForWinget();
