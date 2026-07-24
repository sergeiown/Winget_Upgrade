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

const CHECK_TIMEOUT_MS = 4000;

function isRunningInstalled() {
    if (!process.pkg) {
        return false;
    }

    const installDir = path.dirname(process.execPath);
    return fs.existsSync(path.join(installDir, 'unins000.exe'));
}

async function shouldCheckNow() {
    try {
        const state = JSON.parse(await fsp.readFile(settings.updateStateFilePath, 'utf-8'));
        return Date.now() - state.lastCheckedAt >= settings.updateCheckIntervalMs;
    } catch (error) {
        return true;
    }
}

async function recordCheckTimestamp() {
    await fsp.writeFile(settings.updateStateFilePath, JSON.stringify({ lastCheckedAt: Date.now() }));
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

        return response.ok ? await response.json() : null;
    } catch (error) {
        return null;
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

    if (!(await shouldCheckNow())) {
        return;
    }

    await recordCheckTimestamp();

    const release = await fetchLatestRelease();
    if (!release || !release.tag_name || !isNewerVersion(release.tag_name, settings.appVersion)) {
        return;
    }

    const asset = (release.assets || []).find((item) => item.name === settings.updateAssetName);
    if (!asset) {
        return;
    }

    const latestVersion = parseVersion(release.tag_name);
    console.log(
        consoleUi.paint(`A new version ${latestVersion} is available (current: ${settings.appVersion}).`, 'bold', 'cyan')
    );

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
