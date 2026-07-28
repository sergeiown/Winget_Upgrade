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

// No process.pkg check here - it doesn't exist under Bun. Sitting next to unins000.exe is
// enough to tell an installed copy from a dev checkout.
function isRunningInstalled() {
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

async function installAndExit(installerPath) {
    // Hand off to a detached .bat helper (self-deletes last) and exit immediately so Windows
    // releases the lock on this executable before the installer tries to overwrite it. A temp
    // file avoids the command-line quoting that caused most of this app's past self-update bugs.
    const helperPath = path.join(os.tmpdir(), 'winget_upgrade_install.bat');
    const helperScript =
        `@echo off\r\n` +
        `"${installerPath}" /SILENT /SUPPRESSMSGBOXES /NORESTART\r\n` +
        `del /f /q "${installerPath}"\r\n` +
        `del /f /q "%~f0"\r\n`;

    await fsp.writeFile(helperPath, helperScript);

    const child = spawn(helperPath, [], { detached: true, stdio: 'ignore' });
    child.unref();
    process.exit(0);
}

async function checkForUpdate() {
    if (!isRunningInstalled()) {
        return;
    }

    consoleUi.appendInfoEvent('Checking for updates...');

    let release;
    try {
        release = await fetchLatestRelease();
    } catch (error) {
        consoleUi.appendInfoEvent('{yellow-fg}Update check failed - continuing with the current version.{/yellow-fg}');
        await logMessage(`Info: Update check failed: ${error.message}${os.EOL}`);
        return;
    }

    if (!release || !release.tag_name) {
        consoleUi.appendInfoEvent('{yellow-fg}Update check returned no usable release information.{/yellow-fg}');
        await logMessage(`Info: Update check returned no usable release information.${os.EOL}`);
        return;
    }

    if (!isNewerVersion(release.tag_name, settings.appVersion)) {
        consoleUi.appendInfoEvent(`{green-fg}You're on the latest version (${settings.appVersion}).{/green-fg}`);
        await logMessage(`Info: Already running the latest version (${settings.appVersion}).${os.EOL}`);
        return;
    }

    const asset = (release.assets || []).find((item) => item.name === settings.updateAssetName);
    if (!asset) {
        consoleUi.appendInfoEvent(
            `{yellow-fg}Release ${release.tag_name} has no installer asset - skipping update.{/yellow-fg}`
        );
        await logMessage(`Info: Release ${release.tag_name} has no ${settings.updateAssetName} asset.${os.EOL}`);
        return;
    }

    const latestVersion = parseVersion(release.tag_name);
    consoleUi.appendInfoEvent(
        `{bold}{cyan-fg}Updating to version ${latestVersion} (current: ${settings.appVersion})...{/cyan-fg}{/bold}`
    );
    await logMessage(`Info: Updating to ${latestVersion} (current: ${settings.appVersion}).${os.EOL}`);

    const installerPath = path.join(os.tmpdir(), settings.updateAssetName);

    try {
        consoleUi.appendInfoEvent('Downloading update...');
        await downloadAsset(asset.browser_download_url, installerPath);

        consoleUi.appendInfoEvent('Installing update and restarting...');
        await logMessage(`Info: Installing ${latestVersion} and restarting.${os.EOL}`);

        await installAndExit(installerPath);
    } catch (error) {
        await logMessage(`Error: Auto-update failed: ${error.message}${os.EOL}`);
        consoleUi.appendInfoEvent('{yellow-fg}Update failed, continuing with the current version.{/yellow-fg}');
    }
}

module.exports = { checkForUpdate };
