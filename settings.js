/* Copyright (c) 2024 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const os = require('os');
const path = require('path');
const documentsPath = path.join(os.homedir(), 'Documents');

const settings = {
    wingetPath: 'where.exe winget',
    wingetVersion: 'winget --version',
    logFilePath: path.join(documentsPath, 'winget_upgrade.log'),
    maxLogFileSize: 256 * 1024,
    wingetArgs: [
        'upgrade',
        '--all',
        '--accept-package-agreements',
        '--accept-source-agreements',
        '--disable-interactivity',
        '--silent',
    ],
    finalMessage: `${os.EOL}Update is complete.${os.EOL.repeat(
        2
    )}Program will automatically exit after 10 seconds, or press any key to exit immediately.`,
};

module.exports = settings;
