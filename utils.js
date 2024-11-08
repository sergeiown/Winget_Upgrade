/* Copyright (c) 2024 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const fs = require('fs').promises;
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const { createWriteStream } = require('fs');
const settings = require('./settings');

const execAsync = promisify(exec);

async function setConsoleTitle(title) {
    try {
        await execAsync(`title ${title}`);
    } catch (error) {
        console.error(`Failed to set console title: ${error}`);
    }
}

async function waitForKeyPressAndExit(exitCode) {
    process.stdin.setRawMode(true);
    process.stdin.resume();

    await new Promise((resolve) => {
        process.stdin.once('data', () => {
            resolve();
        });
    });

    process.exit(exitCode);
}

async function logMessage(message) {
    await fs
        .appendFile(settings.logFilePath, message)
        .catch((err) => console.error(`Error writing to log file: ${err.message}`));

    console.log(message);
}

async function executeAndLog(command, logFilePath, callback) {
    try {
        const childProcess = exec(command);
        const logStream = createWriteStream(logFilePath, { flags: 'a' });

        childProcess.stdout.on('data', (data) => {
            const lines = data.toString().split(os.EOL);
            lines.forEach((line) => {
                const trimmedLine = line.trim();
                if (
                    !/[░▒█]/.test(trimmedLine) &&
                    /[a-zA-Zа-яА-Я0-9]/.test(trimmedLine) &&
                    !trimmedLine.includes('Found an existing package already installed.') &&
                    !trimmedLine.includes('No available upgrade found.') &&
                    !trimmedLine.includes('No newer package versions are available from the configured sources.')
                ) {
                    logStream.write(trimmedLine + os.EOL);
                }
            });
        });

        childProcess.stderr.on('data', (data) => {
            console.error(`Error: ${data}`);
            logStream.end();
        });

        childProcess.stderr.pipe(logStream);
        childProcess.stdout.pipe(process.stdout);
        childProcess.stderr.pipe(process.stderr);

        await new Promise((resolve) => childProcess.on('exit', resolve));
        logStream.end();
        callback(logFilePath);
    } catch (error) {
        console.error(`Execution failed: ${error}`);
    }
}

async function filterIgnoredPackages(ignoreFilePath, listFilePath) {
    try {
        let ignoreData = { Packages: [{ name: 'REPLACE_WITH_PACKAGE_NAME' }, { name: 'REPLACE_WITH_PACKAGE_NAME' }] };

        try {
            const data = await fs.readFile(ignoreFilePath, 'utf-8');
            ignoreData = JSON.parse(data);

            const ignoreStatusMessage = `Ignore list successfully applied.`;
            logMessage(`${ignoreStatusMessage}${os.EOL}`);
        } catch (error) {
            await fs.writeFile(ignoreFilePath, JSON.stringify(ignoreData, null, 2));
            const message = `Info: Created new ignore list template at ${ignoreFilePath}`;
            logMessage(`${message}${os.EOL}`);
        }

        const listData = JSON.parse(await fs.readFile(listFilePath, 'utf-8'));
        const removedPackages = [];

        listData.Sources.forEach((source) => {
            source.Packages = source.Packages.filter((pkg) => {
                const isIgnored = ignoreData.Packages.some((ignorePkg) =>
                    pkg.PackageIdentifier.includes(ignorePkg.name)
                );

                if (isIgnored) {
                    removedPackages.push(pkg.PackageIdentifier);
                }
                return !isIgnored;
            });
        });

        await fs.writeFile(listFilePath, JSON.stringify(listData, null, 2));

        const removalMessages =
            removedPackages.length > 0
                ? removedPackages.map((packageList) => `Package is ignored: ${packageList}${os.EOL}`).join('')
                : `Ignore list does not contain any packages.${os.EOL}`;

        logMessage(removalMessages);
    } catch (error) {
        const errorMessage = `Failed to filter ignored packages: ${error.message}${os.EOL}`;
        logMessage(errorMessage);
    }
}

async function checkAndTrimLogFile(logFilePath, maxFileSizeInBytes) {
    try {
        const stats = await fs.stat(logFilePath);
        if (stats.size > maxFileSizeInBytes) {
            const logContent = await fs.readFile(logFilePath, 'utf-8');
            const blocks = logContent.split(`${os.EOL}${os.EOL}`);
            if (blocks.length > 1) {
                const trimmedLog = blocks.slice(1).join(`${os.EOL}${os.EOL}`);
                await fs.writeFile(logFilePath, trimmedLog, 'utf-8');
                console.log(`Log file size reduced`);
            } else {
                await fs.truncate(logFilePath, 0);
            }
        }
    } catch (error) {
        console.error(`Failed to trim log file: ${error}`);
    }
}

module.exports = {
    setConsoleTitle,
    waitForKeyPressAndExit,
    logMessage,
    executeAndLog,
    checkAndTrimLogFile,
    filterIgnoredPackages,
};
