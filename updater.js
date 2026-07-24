/* Copyright (c) 2024-2026 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const fs = require('fs');
const fsp = require('fs').promises;
const os = require('os');
const path = require('path');
const readline = require('readline');
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

function promptYesNo(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            const normalized = answer.trim().toLowerCase();
            resolve(normalized === '' || normalized === 'y' || normalized === 'yes');
        });
    });
}

async function downloadAsset(url, destinationPath) {
    const response = await fetch(url, { headers: { Accept: 'application/octet-stream' } });

    if (!response.ok) {
        throw new Error(`Failed to download update: HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fsp.writeFile(destinationPath, buffer);
}

function runInstallerSilently(installerPath) {
    return new Promise((resolve, reject) => {
        const child = spawn(
            installerPath,
            ['/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/MERGETASKS=autostart'],
            { stdio: 'ignore' }
        );

        child.on('error', reject);
        child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Installer exited with code ${code}`))));
    });
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
        consoleUi.paint(`A new version ${latestVersion} is available (current: ${settings.appVersion}).`, 'bold', 'cyan')
    );
    await logMessage(`Info: New version ${latestVersion} is available (current: ${settings.appVersion}).${os.EOL}`);

    const confirmed = await promptYesNo('Update now? [Y/n] ');
    if (!confirmed) {
        await logMessage(`Info: Update to ${latestVersion} declined by user.${os.EOL}`);
        return;
    }

    const installerPath = path.join(os.tmpdir(), settings.updateAssetName);

    try {
        console.log(consoleUi.paint('Downloading update...', 'dim'));
        await downloadAsset(asset.browser_download_url, installerPath);

        console.log(consoleUi.paint('Installing update...', 'dim'));
        await runInstallerSilently(installerPath);

        await logMessage(`Info: Updated to ${latestVersion}.${os.EOL}`);

        spawn(process.execPath, [], {
            cwd: path.dirname(process.execPath),
            detached: true,
            stdio: 'ignore',
        }).unref();

        process.exit(0);
    } catch (error) {
        await logMessage(`Error: Auto-update failed: ${error.message}${os.EOL}`);
        console.log(consoleUi.paint('Update failed, continuing with the current version.', 'yellow'));
    }
}

module.exports = { checkForUpdate };
