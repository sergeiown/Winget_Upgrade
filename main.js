/* Copyright (c) 2024 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const { checkAndTrimLogFile, executeAndLog } = require('./utils');
const settings = require('./settings');

function setConsoleTitle(title) {
    exec(`title ${title}`);
}

function getWingetVersion(callback) {
    exec(settings.wingetVersion, (error, stdout) => {
        if (error) {
            callback(null);
        } else {
            callback(stdout.trim());
        }
    });
}

function checkForWinget() {
    setConsoleTitle('Winget Upgrade');

    exec(settings.wingetPath, (error, stdout) => {
        console.clear();

        if (error) {
            console.error('Error: winget is not installed on this system.');

            console.log(`
Possible solutions:

1. Make sure that winget is installed on your system and that its location is 
   included in the PATH environment variable. To check, open a command prompt 
   and type "winget". If the command is not recognized, add the path to the 
   winget executable in the system's PATH environment variable.

2. Ensure that your Windows version supports winget (Windows 10 version 1809 or 
   later, or Windows 11).

3. Install or reinstall "App Installer". For more details, see the official guide: 
   https://learn.microsoft.com/en-us/windows/msix/app-installer/install-update-app-installer

4. Check if there are any group policy restrictions or administrative settings 
   preventing winget from running.
`);

            fs.appendFileSync(settings.logFilePath, `${os.EOL}>> ${new Date().toLocaleString()}${os.EOL}`);
            fs.appendFileSync(settings.logFilePath, 'Error: winget is not installed on this system.');

            console.log('Press any key to exit...');
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.on('data', () => {
                process.exit(1);
            });
        } else {
            getWingetVersion((version) => {
                console.log(`Winget ${version} is installed on the system.${os.EOL}`);
            });

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
