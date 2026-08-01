/* Copyright (c) 2024-2026 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

process.removeAllListeners('warning');
process.on('warning', (warning) => {
    if (warning.name !== 'ExperimentalWarning') {
        console.warn(warning);
    }
});

const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const { delay, logMessage, checkAndTrimLogFile, discoverUpgradablePackages, upgradePackage } = require('./utils');
const settings = require('./settings');
const appSettings = require('./app_settings');
const consoleUi = require('./console_ui');
const settingsUi = require('./settings_ui');
const i18n = require('./i18n');
const { checkForUpdate } = require('./updater');

const execAsync = promisify(exec);

async function getWingetVersion() {
    try {
        const { stdout } = await execAsync(settings.wingetVersion);
        const version = stdout.trim().replace(/^v/, '');
        const [major, minor] = version.split('.').map(Number);

        if (major < 1 || (major === 1 && minor < 4)) {
            await logMessage(`Error: Outdated winget version (${version}). Update required.${os.EOL}`);
            const t = i18n.get();
            consoleUi.showFatalError(`${t.outdatedVersion(version)}\n\n${t.outdatedVersionInstructions}`);
            await consoleUi.waitAnyKeyOrTimeout(15000);
            consoleUi.exitApp(1);
        }

        return version;
    } catch (error) {
        await logMessage(`Error: Failed to retrieve winget version: ${error}${os.EOL}`);
        return null;
    }
}

let settingsOpen = false;
let restartRequested = false;

function openSettingsScreen(wingetLocation) {
    if (settingsOpen) {
        return;
    }
    settingsOpen = true;
    settingsUi
        .open(consoleUi.getScreen(), { wingetLocation, ignoreFilePath: settings.ignoreFilePath })
        .then((result) => {
            if (result && result.ignoreListChanged) {
                restartRequested = true;
            }
        })
        .finally(() => {
            settingsOpen = false;
        });
}

async function waitWhileModalOpen() {
    while (consoleUi.isModalOpen()) {
        await delay(200);
    }
}

async function runUpgrades(wingetLocation, packages, discoveryMeta) {
    const results = [];
    const overallStartedAt = Date.now();

    for (let index = 0; index < packages.length; index++) {
        const pkg = packages[index];

        await waitWhileModalOpen();

        if (restartRequested) {
            break;
        }

        consoleUi.setSessionState({
            index: index + 1,
            total: packages.length,
            totalInstalled: discoveryMeta.totalInstalled,
            upToDateCount: discoveryMeta.upToDateCount,
            toUpdateCount: packages.length,
            ignoredCount: discoveryMeta.ignoredCount,
        });

        consoleUi.setCurrentOperation(pkg);
        consoleUi.startProgress('Starting...');
        consoleUi.setUpgradeInProgress(true);

        const controller = upgradePackage(wingetLocation, pkg, settings.logFilePath, (line) => {
            consoleUi.appendOperationLine(line);
            consoleUi.updateProgressStatus(line);
        });

        consoleUi.onSkipRequested(() => controller.skip());

        const result = await controller.promise;

        consoleUi.onSkipRequested(null);
        consoleUi.stopProgress();
        consoleUi.appendResultEvent(result);
        results.push(result);
    }

    consoleUi.setUpgradeInProgress(false);

    return { results, totalElapsedMs: Date.now() - overallStartedAt };
}

async function tryToPerformUpgrade() {
    consoleUi.init('Winget Upgrade', `Winget Upgrade ${settings.appVersion}`);
    consoleUi.setSettingsAvailable(false);

    const currentDate = settings.date;
    await logMessage(`${os.EOL}>> ${currentDate}${os.EOL}`);

    await checkForUpdate();
    await delay(settings.stepPauseMs);

    try {
        let stdout;
        try {
            stdout = (await execAsync(settings.wingetPath)).stdout;
        } catch (whereError) {
            throw new Error(`Winget is not installed.`);
        }

        const version = await getWingetVersion();
        if (version) {
            consoleUi.appendInfoEvent(i18n.get().wingetInstalled(version));
        } else {
            throw new Error(`Winget is not installed.`);
        }

        await delay(settings.stepPauseMs);

        const wingetLocation = stdout.trim();
        consoleUi.onSettingsRequested(() => openSettingsScreen(wingetLocation));
        consoleUi.setSettingsAvailable(true);

        for (;;) {
            restartRequested = false;

            const { packages, totalInstalled, upToDateCount, ignoredCount } = await discoverUpgradablePackages(
                wingetLocation,
                settings.ignoreFilePath
            );

            await logMessage(
                `Checked ${totalInstalled} installed package(s): ${upToDateCount} up to date, ${packages.length} to update, ${ignoredCount} ignored.${os.EOL}`
            );

            consoleUi.setSessionState({
                index: 0,
                total: packages.length,
                totalInstalled,
                upToDateCount,
                toUpdateCount: packages.length,
                ignoredCount,
            });

            if (packages.length === 0) {
                consoleUi.appendInfoEvent(i18n.get().noUpdatesFound);
            } else {
                consoleUi.appendInfoEvent(i18n.get().packagesToUpdate(packages.map((pkg) => pkg.id).join(', ')));
            }

            await delay(settings.preUpgradePauseMs);

            const { results, totalElapsedMs } = await runUpgrades(wingetLocation, packages, {
                totalInstalled,
                upToDateCount,
                ignoredCount,
            });

            if (restartRequested) {
                consoleUi.appendInfoEvent(i18n.get().restartingSession);
                continue;
            }

            await checkAndTrimLogFile(settings.logFilePath, settings.maxLogFileSize);
            await logMessage(settings.finalLogMessage);

            if (results.length > 0) {
                consoleUi.showSummary(results, totalElapsedMs);
            }

            const autoCloseSeconds = appSettings.getAutoCloseSeconds();
            consoleUi.appendInfoEvent(i18n.get().finalMessage(autoCloseSeconds));

            await consoleUi.waitAnyKeyOrTimeout(
                autoCloseSeconds == null ? null : autoCloseSeconds * 1000,
                autoCloseSeconds == null ? null : (remaining) => consoleUi.setCountdownDisplay(i18n.get().autoCloseCountdown(remaining))
            );
            consoleUi.setCountdownDisplay('');

            if (restartRequested) {
                consoleUi.appendInfoEvent(i18n.get().restartingSession);
                continue;
            }

            consoleUi.exitApp(0);
        }
    } catch (error) {
        const t = i18n.get();
        if (error.message.includes(`Winget is not installed.`)) {
            await logMessage(`Error: winget is not installed on this system.${os.EOL}`);
            consoleUi.showFatalError(`${t.wingetNotInstalled}\n\n${t.notInstalledSolutions}`);
        } else {
            await logMessage(`Unexpected error occurred: ${error.message}${os.EOL}`);
            consoleUi.showFatalError(t.unexpectedError(error.message));
        }

        await consoleUi.waitAnyKeyOrTimeout(15000);
        consoleUi.exitApp(1);
    }
}

tryToPerformUpgrade().catch(async (error) => {
    try {
        await logMessage(`Fatal error: ${error && error.stack ? error.stack : error}${os.EOL}`);
    } catch (loggingError) {
        console.error(`Failed to log fatal error: ${loggingError}`);
    }

    if (consoleUi.getScreen()) {
        consoleUi.showFatalError(i18n.get().fatalError(error && error.message ? error.message : error));
        await consoleUi.waitAnyKeyOrTimeout(15000);
        consoleUi.exitApp(1);
    } else {
        console.error(`Fatal error:`, error);
        process.exit(1);
    }
});
