/* Copyright (c) 2024-2026 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const os = require('os');
const path = require('path');
const documentsPath = path.join(os.homedir(), 'Documents');

const settings = {
    appVersion: '2.0',
    wingetUpgradeVersion: 'Winget Upgrade 2.0',
    wingetPath: 'where.exe winget',
    wingetVersion: 'winget --version',
    logFilePath: path.join(documentsPath, 'winget_upgrade.log'),
    listFilePath: path.join(process.cwd(), 'winget_list.json'),
    ignoreFilePath: path.join(process.cwd(), 'winget_ignore.txt'),
    legacyIgnoreFilePath: path.join(process.cwd(), 'winget_ignore.json'),
    updateStateFilePath: path.join(documentsPath, 'winget_upgrade_update_state.json'),
    updateCheckIntervalMs: 24 * 60 * 60 * 1000,
    githubReleasesApiUrl: 'https://api.github.com/repos/sergeiown/Winget_Upgrade/releases/latest',
    updateAssetName: 'WingetUpgradeSetup.exe',
    maxLogFileSize: 256 * 1024,
    wingetArgs: {
        export: [
            'export',
            'winget_list.json',
            '--ignore-warnings',
            '--disable-interactivity',
            '--accept-source-agreements',
        ],
        upgrade: [
            'upgrade',
            '--exact',
            '--silent',
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
    finalMessage: `Program will automatically exit after 10 seconds, or press any key to exit immediately.${os.EOL}`,
    finalLogMessage: `Upgrade is complete.${os.EOL}`,
    notInstalledSollutions: `Possible solutions:${os.EOL}
1. Make sure that winget is installed on your system and that its location is 
   included in the PATH environment variable. To check, open a command prompt 
   and type "winget". If the command is not recognized, add the path to the 
   winget executable in the system's PATH environment variable.${os.EOL}
2. Ensure that your Windows version supports winget (Windows 10 version 1809 or 
   later, or Windows 11).${os.EOL}
3. Install or reinstall "App Installer".
4. Check if there are any group policy restrictions or administrative settings 
   preventing winget from running.${os.EOL}`,
    outdatedVersionInstructions: `Please update winget to continue. Instructions:${os.EOL}
1. Open Microsoft Store and update 'App Installer' to the latest version.${os.EOL}
2. Alternatively, run the following command in the terminal:
   winget upgrade --id Microsoft.DesktopAppInstaller -e --source msstore${os.EOL}
3. Ensure your Windows version is Windows 10 version 1809 or later, or Windows 11.${os.EOL}`,
};

module.exports = settings;
