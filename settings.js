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
    listFilePath: path.join(process.cwd(), 'winget_list.json'),
    ignoreFilePath: path.join(process.cwd(), 'winget_ignore.json'),
    maxLogFileSize: 256 * 1024,
    wingetArgs: {
        export: [
            'export',
            'winget_list.json',
            '--ignore-warnings',
            '--disable-interactivity',
            '--accept-source-agreements',
        ],
        import: [
            'import',
            'winget_list.json',
            '--ignore-versions',
            '--accept-package-agreements',
            '--accept-source-agreements',
            '--disable-interactivity',
            '--ignore-warnings',
        ],
    },
    finalMessage: `${os.EOL}Upgrade is complete.${os.EOL.repeat(
        2
    )}Program will automatically exit after 10 seconds, or press any key to exit immediately.`,
    finalLogMessage: `Upgrade is complete.${os.EOL}`,
};

module.exports = settings;
