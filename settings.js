/* Copyright (c) 2024 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const os = require('os');
const path = require('path');
const documentsPath = path.join(os.homedir(), 'Documents');

const settings = {
    wingetUpgradeVersion: 'Winget Upgrade 1.3',
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
    notInstalledSollutions: `Possible solutions:${os.EOL}
1. Make sure that winget is installed on your system and that its location is 
   included in the PATH environment variable. To check, open a command prompt 
   and type "winget". If the command is not recognized, add the path to the 
   winget executable in the system's PATH environment variable.${os.EOL}
2. Ensure that your Windows version supports winget (Windows 10 version 1809 or 
   later, or Windows 11).${os.EOL}
3. Install or reinstall "App Installer". For more details, see the official guide: 
   https://learn.microsoft.com/en-us/windows/msix/app-installer/install-update-app-installer${os.EOL}
4. Check if there are any group policy restrictions or administrative settings 
   preventing winget from running.${os.EOL}`,
    outdatedVersionInstructions: `Please update winget to continue. Instructions:${os.EOL}
1. Open Microsoft Store and update 'App Installer' to the latest version.${os.EOL}
2. Alternatively, run the following command in the terminal:
   winget upgrade --id Microsoft.DesktopAppInstaller -e --source msstore${os.EOL}
3. Ensure your Windows version is Windows 10 version 1809 or later, or Windows 11.${os.EOL}`,
};

module.exports = settings;
