/* Copyright (c) 2024 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const fs = require('fs').promises;
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const { checkAndTrimLogFile, executeAndLog, filterIgnoredPackages } = require('./utils');
const settings = require('./settings');

const execAsync = promisify(exec);

async function setConsoleTitle(title) {
    try {
        await execAsync(`title ${title}`);
    } catch (error) {
        console.error(`Failed to set console title: ${error}`);
    }
}

async function getWingetVersion() {
    try {
        const { stdout } = await execAsync(settings.wingetVersion);
        const version = stdout.trim().replace(/^v/, '');
        const [major, minor] = version.split('.').map(Number);

        if (major < 1 || (major === 1 && minor < 4)) {
            const logMessage = `Error: Outdated winget version (${version}). Update required.${os.EOL}
Please update winget to continue. Instructions:${os.EOL}
1. Open Microsoft Store and update **App Installer** to the latest version.${os.EOL}
2. Alternatively, run the following command in the terminal:
   winget upgrade --id Microsoft.DesktopAppInstaller -e --source msstore${os.EOL}
3. Ensure your Windows version is Windows 10 version 1809 or later, or Windows 11.${os.EOL}`;

            await fs.appendFile(
                settings.logFilePath,
                `Error: Outdated winget version (${version}). Update required.${os.EOL}`
            );

            console.log(logMessage);
            console.log(`Press any key to exit...`);

            await new Promise((resolve) => process.stdin.once('data', resolve));

            process.exit(1);
        }

        return version;
    } catch (error) {
        await fs.appendFile(settings.logFilePath, `Error: Failed to retrieve winget version: ${error}${os.EOL}`);

        return null;
    }
}

async function checkForWinget() {
    const currentDate = new Date().toLocaleString();
    await fs.appendFile(settings.logFilePath, `${os.EOL}>> ${currentDate}${os.EOL}`);

    await setConsoleTitle('Winget Upgrade');

    try {
        const { stdout } = await execAsync(settings.wingetPath);
        console.clear();

        const version = await getWingetVersion();
        if (version) {
            console.log(`Winget ${version} is installed on the system.${os.EOL}`);
        } else {
            throw new Error('Unable to determine winget version.');
        }

        const wingetLocation = stdout.trim();

        const exportCommand = `${wingetLocation} ${settings.wingetArgs.export.join(' ')}`;
        await executeAndLog(exportCommand, settings.logFilePath, async () => {
            await filterIgnoredPackages(settings.ignoreFilePath, settings.listFilePath, settings.logFilePath);

            const importCommand = `${wingetLocation} ${settings.wingetArgs.import.join(' ')}`;
            await executeAndLog(importCommand, settings.logFilePath, async () => {
                await checkAndTrimLogFile(settings.logFilePath, settings.maxLogFileSize);

                await fs.unlink(settings.listFilePath);

                setTimeout(() => {
                    process.stdin.setRawMode(true);
                    process.stdin.resume();
                    process.stdin.on('data', process.exit.bind(process, 0));
                    fs.appendFile(settings.logFilePath, settings.finalLogMessage);
                    console.log(settings.finalMessage);
                }, 1000);

                setTimeout(() => {
                    process.exit(0);
                }, 10000);
            });
        });
    } catch (error) {
        console.error(`Error: winget is not installed on this system.${os.EOL}`);

        console.log(`Possible solutions:${os.EOL}
1. Make sure that winget is installed on your system and that its location is 
   included in the PATH environment variable. To check, open a command prompt 
   and type "winget". If the command is not recognized, add the path to the 
   winget executable in the system's PATH environment variable.${os.EOL}
2. Ensure that your Windows version supports winget (Windows 10 version 1809 or 
   later, or Windows 11).${os.EOL}
3. Install or reinstall "App Installer". For more details, see the official guide: 
   https://learn.microsoft.com/en-us/windows/msix/app-installer/install-update-app-installer${os.EOL}
4. Check if there are any group policy restrictions or administrative settings 
   preventing winget from running.${os.EOL}`);

        await fs.appendFile(settings.logFilePath, `Error: winget is not installed on this system.${os.EOL}`);

        console.log(`Press any key to exit...`);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', () => {
            process.exit(1);
        });
    }
}

checkForWinget();
