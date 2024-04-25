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

executeAndLog(command, logFilePath, checkAndTrimLogFile.bind(null, logFilePath, maxLogFileSize));
