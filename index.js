/* Copyright (c) 2024 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const { checkForWinget } = require('./wingetCheck');
const { executeAndLog, checkAndTrimLogFile } = require('./executionAndLog');
const { logFilePath, maxLogFileSize, command, finalMessage } = require('./settings');

checkForWinget(logFilePath);

executeAndLog(command, logFilePath, () => {
    checkAndTrimLogFile(logFilePath, maxLogFileSize);
    setTimeout(() => {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', process.exit.bind(process, 0));

        console.log(finalMessage);
    }, 1000);

    setTimeout(() => {
        process.exit(0);
    }, 10000);
});
