/* Copyright (c) 2024-2026 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

// The global fetch API (used by updater.js) still emits an ExperimentalWarning on first use in
// Node 18 - noise the end user has no use for in a compiled CLI tool. Node registers its own
// default listener that prints these regardless of any listener added with process.on(), so that
// default listener has to be removed first, not just outvoted by adding another one.
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
const consoleUi = require('./console_ui');
const settingsUi = require('./settings_ui');
const { checkForUpdate } = require('./updater');

const execAsync = promisify(exec);

async function getWingetVersion() {
    try {
        const { stdout } = await execAsync(settings.wingetVersion);
        const version = stdout.trim().replace(/^v/, '');
        const [major, minor] = version.split('.').map(Number);

        if (major < 1 || (major === 1 && minor < 4)) {
            await logMessage(`Error: Outdated winget version (${version}). Update required.${os.EOL}`);
            consoleUi.showFatalError(`Outdated winget version (${version}).\n\n${settings.outdatedVersionInstructions}`);
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

function openSettingsScreen(wingetLocation) {
    if (settingsOpen) {
        return;
    }
    settingsOpen = true;
    settingsUi
        .open(consoleUi.getScreen(), { wingetLocation, ignoreFilePath: settings.ignoreFilePath })
        .finally(() => {
            settingsOpen = false;
        });
}

async function runUpgrades(wingetLocation, packages, discoveryMeta) {
    const results = [];
    const overallStartedAt = Date.now();

    for (let index = 0; index < packages.length; index++) {
        const pkg = packages[index];

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
    consoleUi.init(`Winget Upgrade ${settings.appVersion}`);
    consoleUi.onSettingsRequested(() => {
        consoleUi.appendInfoEvent('{yellow-fg}Налаштування доступні після визначення winget.{/yellow-fg}');
    });

    const currentDate = settings.date;
    await logMessage(`${os.EOL}>> ${currentDate}${os.EOL}`);

    await checkForUpdate();
    await delay(settings.stepPauseMs);

    try {
        let stdout;
        try {
            stdout = (await execAsync(settings.wingetPath)).stdout;
        } catch (whereError) {
            // where.exe found nothing at all for this account - most commonly a standard
            // (non-admin) profile that's never had a full interactive sign-in, so the App
            // Installer's per-user execution alias was never provisioned. Treat it the same as
            // "not installed" so the user gets the actionable instructions instead of a generic
            // "Unexpected error occurred: Command failed: where.exe winget" message.
            throw new Error(`Winget is not installed.`);
        }

        const version = await getWingetVersion();
        if (version) {
            consoleUi.appendInfoEvent(`{green-fg}Winget ${version} is installed on the system.{/green-fg}`);
        } else {
            throw new Error(`Winget is not installed.`);
        }

        await delay(settings.stepPauseMs);

        const wingetLocation = stdout.trim();
        consoleUi.onSettingsRequested(() => openSettingsScreen(wingetLocation));

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
            consoleUi.appendInfoEvent('{green-fg}No updates found - everything is up to date.{/green-fg}');
        } else {
            consoleUi.appendInfoEvent(`{bold}Packages to update:{/bold} ${packages.map((pkg) => pkg.id).join(', ')}`);
        }

        await delay(settings.preUpgradePauseMs);

        const { results, totalElapsedMs } = await runUpgrades(wingetLocation, packages, {
            totalInstalled,
            upToDateCount,
            ignoredCount,
        });

        await checkAndTrimLogFile(settings.logFilePath, settings.maxLogFileSize);
        await logMessage(settings.finalLogMessage);

        if (results.length > 0) {
            consoleUi.showSummary(results, totalElapsedMs);
        }

        consoleUi.appendInfoEvent(`{dim}${settings.finalMessage.trim()}{/dim}`);

        await consoleUi.waitAnyKeyOrTimeout(10000);
        consoleUi.exitApp(0);
    } catch (error) {
        if (error.message.includes(`Winget is not installed.`)) {
            await logMessage(`Error: winget is not installed on this system.${os.EOL}`);
            consoleUi.showFatalError(`Winget is not installed on this system.\n\n${settings.notInstalledSollutions}`);
        } else {
            await logMessage(`Unexpected error occurred: ${error.message}${os.EOL}`);
            consoleUi.showFatalError(`Unexpected error occurred: ${error.message}`);
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

    // A stray console.error while blessed still holds the alternate screen buffer would corrupt
    // the display, so route through the TUI whenever it's already up.
    if (consoleUi.getScreen()) {
        consoleUi.showFatalError(`Fatal error: ${error && error.message ? error.message : error}`);
        await consoleUi.waitAnyKeyOrTimeout(15000);
        consoleUi.exitApp(1);
    } else {
        console.error(`Fatal error:`, error);
        process.exit(1);
    }
});
