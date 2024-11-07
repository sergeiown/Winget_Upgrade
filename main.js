/* Copyright (c) 2024 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const fs = require('fs').promises;
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const { logMessage, checkAndTrimLogFile, executeAndLog, filterIgnoredPackages } = require('./utils');
const settings = require('./settings');

const execAsync = promisify(exec);

async function setConsoleTitle(title) {
    try {
        await execAsync(`title ${title}`);
    } catch (error) {
        console.error(`Failed to set console title: ${error}`);
    }
}

async function waitForKeyPressAndExit() {
    process.stdin.setRawMode(true);
    process.stdin.resume();

    await new Promise((resolve) => {
        process.stdin.once('data', () => {
            resolve();
        });
    });

    process.exit(1);
}

async function getWingetVersion() {
    try {
        const { stdout } = await execAsync(settings.wingetVersion);
        const version = stdout.trim().replace(/^v/, '');
        const [major, minor] = version.split('.').map(Number);

        if (major < 1 || (major === 1 && minor < 4)) {
            const versionMessage = `Error: Outdated winget version (${version}). Update required.${os.EOL}`;
            logMessage(versionMessage);

            await new Promise((resolve) => setTimeout(resolve, 1000));

            console.log(settings.outdatedVersionInstructions);
            console.log(`Press any key to exit...`);

            await waitForKeyPressAndExit();
        }

        return version;
    } catch (error) {
        logMessage(`Error: Failed to retrieve winget version: ${error}${os.EOL}`);

        return null;
    }
}

async function checkForWinget() {
    const currentDate = new Date().toLocaleString();
    logMessage(`${os.EOL}>> ${currentDate}${os.EOL}`);

    await setConsoleTitle(settings.wingetUpgradeVersion);

    try {
        const { stdout } = await execAsync(settings.wingetPath);
        console.clear();

        const version = await getWingetVersion();
        if (version) {
            console.log(`Winget ${version} is installed on the system.${os.EOL}`);
        } else {
            throw new Error(`Unable to determine winget version.`);
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
        logMessage(`Error: winget is not installed on this system.${os.EOL}`);

        await new Promise((resolve) => process.stdin.once('data', resolve));

        console.log(settings.notInstalledSollutions);
        console.log(`Press any key to exit...`);

        await waitForKeyPressAndExit();
    }
}

checkForWinget();
