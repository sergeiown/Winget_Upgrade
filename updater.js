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

// `process.pkg` (used to gate this on "am I a pkg-compiled binary") doesn't exist under Bun -
// bun build --compile binaries are still Bun at runtime, so that signal is gone with the pkg ->
// Bun switch. The directory check alone is sufficient and was already doing the real work: it's
// only true when this exe sits next to Inno Setup's uninstaller, i.e. actually installed, as
// opposed to a dev checkout being run directly.
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
    // The installer needs to overwrite this very executable, which Windows won't allow while
    // it's still running. Hand off to a detached helper and exit immediately so the file lock is
    // released; the installer's own post-install step (its [Run] entry in
    // installer/winget_upgrade.iss) relaunches the app once it's done.
    //
    // A temporary .bat file (which deletes itself as its last step - the standard Windows-batch
    // "%~f0" self-delete trick) replaces the previous inline `cmd.exe /c "..."` command string.
    // That inline approach needed both `windowsVerbatimArguments` and a redundant outer quote
    // layer to survive cmd.exe's own argument parsing, and was the source of most quoting bugs in
    // this app's history. Writing the exact same commands to a file and running it directly
    // removes command-line quoting from the picture entirely - nothing left to escape.
    //
    // /SILENT shows the installation progress window but no wizard pages and no prompts -
    // /SUPPRESSMSGBOXES and /NORESTART keep it from stopping for anything else either. Task
    // selections (autostart) fall back to their .iss defaults, already checked.
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
