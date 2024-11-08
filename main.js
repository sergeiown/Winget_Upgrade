/* Copyright (c) 2024 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const fs = require('fs').promises;
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const {
    setConsoleTitle,
    waitForKeyPressAndExit,
    logMessage,
    checkAndTrimLogFile,
    executeAndLog,
    filterIgnoredPackages,
} = require('./utils');
const settings = require('./settings');

const execAsync = promisify(exec);

async function getWingetVersion() {
    try {
        const { stdout } = await execAsync(settings.wingetVersion);
        const version = stdout.trim().replace(/^v/, '');
        const [major, minor] = version.split('.').map(Number);

        if (major < 1 || (major === 1 && minor < 4)) {
            const versionMessage = `Error: Outdated winget version (${version}). Update required.${os.EOL}`;
            await logMessage(versionMessage);

            console.log(settings.outdatedVersionInstructions + os.EOL + `Press any key to exit...`);

            await waitForKeyPressAndExit(1);
        }

        return version;
    } catch (error) {
        logMessage(`Error: Failed to retrieve winget version: ${error}${os.EOL}`);

        return null;
    }
}

async function tryToPerformUpgrade() {
    console.clear();

    const currentDate = settings.date;
    logMessage(`${os.EOL}>> ${currentDate}${os.EOL}`);

    await setConsoleTitle(settings.wingetUpgradeVersion);

    try {
        const { stdout } = await execAsync(settings.wingetPath);

        const version = await getWingetVersion();
        if (version) {
            console.log(`Winget ${version} is installed on the system.${os.EOL}`);
        } else {
            throw new Error(`Winget is not installed.`);
        }

        const wingetLocation = stdout.trim();

        const exportCommand = `${wingetLocation} ${settings.wingetArgs.export.join(' ')}`;
        await executeAndLog(exportCommand, settings.logFilePath, async () => {
            await filterIgnoredPackages(settings.ignoreFilePath, settings.listFilePath);

            const importCommand = `${wingetLocation} ${settings.wingetArgs.import.join(' ')}`;
            await executeAndLog(importCommand, settings.logFilePath, async () => {
                await checkAndTrimLogFile(settings.logFilePath, settings.maxLogFileSize);

                await fs.unlink(settings.listFilePath);

                try {
                    await logMessage(settings.finalLogMessage);

                    console.log(settings.finalMessage);

                    await Promise.race([
                        waitForKeyPressAndExit(0),
                        new Promise((resolve) => setTimeout(resolve, 10000)),
                    ]);

                    process.exit(0);
                } catch (error) {
                    console.error(`An error occurred:`, error);
                }
            });
        });
    } catch (error) {
        if (error.message.includes(`Winget is not installed.`)) {
            await logMessage(`Error: winget is not installed on this system.${os.EOL}`);
            console.log(settings.notInstalledSollutions + os.EOL + `Press any key to exit...`);
        } else {
            await logMessage(`Unexpected error occurred: ${error.message}${os.EOL}`);
        }

        await waitForKeyPressAndExit(1);
    }
}

tryToPerformUpgrade();
