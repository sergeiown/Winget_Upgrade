/* Copyright (c) 2024-2026 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const os = require('os');
const path = require('path');

const settings = {
    appVersion: '3.3.6',
    wingetPath: 'where.exe winget',
    wingetVersion: 'winget --version',
    logFilePath: path.join(process.cwd(), 'winget_upgrade.log'),
    ignoreFilePath: path.join(process.cwd(), 'winget_ignore.txt'),
    legacyIgnoreFilePath: path.join(process.cwd(), 'winget_ignore.json'),
    languageFilePath: path.join(process.cwd(), 'winget_language.txt'),
    autoCloseFilePath: path.join(process.cwd(), 'winget_autoclose.txt'),
    githubReleasesApiUrl: 'https://api.github.com/repos/sergeiown/Winget_Upgrade/releases/latest',
    updateAssetName: 'WingetUpgradeSetup.exe',
    maxLogFileSize: 256 * 1024,
    preUpgradePauseMs: 5000,
    wingetSettlePauseMs: 1000,
    wingetCommandTimeoutMs: 180000,
    packageUpgradeTimeoutMs: 30 * 60 * 1000,
    wingetArgs: {
        list: ['list', '--accept-source-agreements', '--disable-interactivity', '--ignore-warnings'],
        upgradeList: ['upgrade', '--accept-source-agreements', '--disable-interactivity', '--ignore-warnings'],
        upgrade: [
            'upgrade',
            '--exact',
            '--accept-package-agreements',
            '--accept-source-agreements',
            '--disable-interactivity',
            '--ignore-warnings',
        ],
    },
    wingetExitCodes: {
        SUCCESS: 0,
        NO_APPLICABLE_UPDATE: 0x8a15002b,
    },
    date: new Date()
        .toLocaleString('uk-UA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        })
        .replace(/,\s*/g, ' ')
        .trim(),
    finalLogMessage: `Upgrade is complete.${os.EOL}`,
};

module.exports = settings;
