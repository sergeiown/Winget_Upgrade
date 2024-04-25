const os = require('os');
const path = require('path');
const { checkForWinget } = require('./wingetCheck');
const { executeAndLog, checkAndTrimLogFile } = require('./executionAndLog');

const documentsPath = path.join(os.homedir(), 'Documents');

const logFilePath = path.join(documentsPath, 'winget_upgrade.log');

const maxLogFileSize = 256 * 1024;

const command =
    'winget upgrade --all --accept-package-agreements --accept-source-agreements --disable-interactivity --silent';

checkForWinget(logFilePath);

executeAndLog(command, logFilePath, () => {
    checkAndTrimLogFile(logFilePath, maxLogFileSize);
    setTimeout(() => {
        console.log(
            '\nUpdate is complete.\n\nProgram will automatically exit after 10 seconds, or press any key to exit immediately.'
        );
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', process.exit.bind(process, 0));
    }, 1000);

    setTimeout(() => {
        process.exit(0);
    }, 10000);
});
