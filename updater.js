/* Copyright (c) 2024-2026 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const fs = require('fs');
const fsp = require('fs').promises;
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const settings = require('./settings');
const consoleUi = require('./console_ui');
const { logMessage } = require('./utils');

const CHECK_TIMEOUT_MS = 8000;

function isRunningInstalled() {
    if (!process.pkg) {
        return false;
    }

    const installDir = path.dirname(process.execPath);
    return fs.existsSync(path.join(installDir, 'unins000.exe'));
}

function parseVersion(value) {
    return value.replace(/^v/i, '').trim();
}

function isNewerVersion(latest, current) {
    const latestParts = parseVersion(latest).split('.').map(Number);
    const currentParts = parseVersion(current).split('.').map(Number);
    const length = Math.max(latestParts.length, currentParts.length);

    for (let index = 0; index < length; index++) {
        const latestPart = latestParts[index] || 0;
        const currentPart = currentParts[index] || 0;

        if (latestPart > currentPart) {
            return true;
        }
        if (latestPart < currentPart) {
            return false;
        }
    }

    return false;
}

async function fetchLatestRelease() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    try {
        const response = await fetch(settings.githubReleasesApiUrl, {
            signal: controller.signal,
            headers: { Accept: 'application/vnd.github+json' },
        });

        if (!response.ok) {
            throw new Error(`GitHub API returned HTTP ${response.status}`);
        }

        return await response.json();
    } finally {
        clearTimeout(timeout);
    }
}

async function downloadAsset(url, destinationPath) {
    const response = await fetch(url, { headers: { Accept: 'application/octet-stream' } });

    if (!response.ok) {
        throw new Error(`Failed to download update: HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fsp.writeFile(destinationPath, buffer);
}

function launchInstallerAndExit(installerPath) {
    // The installer needs to overwrite this very executable, which Windows won't allow while
    // it's still running. Hand off to a fully detached installer process and exit immediately
    // so the file lock is released; the installer's own post-install step relaunches the app.
    const child = spawn(
        installerPath,
        ['/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/MERGETASKS=autostart'],
        { detached: true, stdio: 'ignore' }
    );
    child.unref();
    process.exit(0);
}

async function checkForUpdate() {
    if (!isRunningInstalled()) {
        return;
    }

    const spinner = consoleUi.createSpinner('Checking for updates...').start();

    let release;
    try {
        release = await fetchLatestRelease();
    } catch (error) {
        spinner.stop(consoleUi.paint('Update check failed - continuing with the current version.', 'yellow'));
        await logMessage(`Info: Update check failed: ${error.message}${os.EOL}`);
        return;
    }

    if (!release || !release.tag_name) {
        spinner.stop(consoleUi.paint('Update check returned no usable release information.', 'yellow'));
        await logMessage(`Info: Update check returned no usable release information.${os.EOL}`);
        return;
    }

    if (!isNewerVersion(release.tag_name, settings.appVersion)) {
        spinner.stop(consoleUi.paint(`You're on the latest version (${settings.appVersion}).`, 'green'));
        await logMessage(`Info: Already running the latest version (${settings.appVersion}).${os.EOL}`);
        return;
    }

    const asset = (release.assets || []).find((item) => item.name === settings.updateAssetName);
    if (!asset) {
        spinner.stop(consoleUi.paint(`Release ${release.tag_name} has no installer asset - skipping update.`, 'yellow'));
        await logMessage(`Info: Release ${release.tag_name} has no ${settings.updateAssetName} asset.${os.EOL}`);
        return;
    }

    const latestVersion = parseVersion(release.tag_name);
    spinner.stop(
        consoleUi.paint(`Updating to version ${latestVersion} (current: ${settings.appVersion})...`, 'bold', 'cyan')
    );
    await logMessage(`Info: Updating to ${latestVersion} (current: ${settings.appVersion}).${os.EOL}`);

    const installerPath = path.join(os.tmpdir(), settings.updateAssetName);

    try {
        console.log(consoleUi.paint('Downloading update...', 'dim'));
        await downloadAsset(asset.browser_download_url, installerPath);

        console.log(consoleUi.paint('Installing update and restarting...', 'dim'));
        await logMessage(`Info: Installing ${latestVersion} and restarting.${os.EOL}`);

        launchInstallerAndExit(installerPath);
    } catch (error) {
        await logMessage(`Error: Auto-update failed: ${error.message}${os.EOL}`);
        console.log(consoleUi.paint('Update failed, continuing with the current version.', 'yellow'));
    }
}

module.exports = { checkForUpdate };
