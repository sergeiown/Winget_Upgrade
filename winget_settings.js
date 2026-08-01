/* Copyright (c) 2024-2026 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { escapeForPowerShellSingleQuotes } = require('./utils');

const execAsync = promisify(exec);

const SCOPE_VALUES = ['user', 'machine'];
const MAX_RESUMES_OPTIONS = [1, 3, 5, 10];
const ADMIN_SETTINGS = ['LocalArchiveMalwareScanOverride', 'InstallerHashOverride'];

function isValidScopeValue(value) {
    return SCOPE_VALUES.includes(value);
}

function isValidMaxResumes(value) {
    return Number.isInteger(value) && value >= 1;
}

async function readSnapshot(wingetLocation) {
    const { stdout } = await execAsync(`"${wingetLocation}" settings export`);
    const parsed = JSON.parse(stdout);

    return {
        adminSettings: parsed.adminSettings || {},
        userSettingsFilePath: parsed.userSettingsFile,
    };
}

function stripLineComments(raw) {
    return raw
        .split(/\r?\n/)
        .filter((line) => !line.trim().startsWith('//'))
        .join('\n');
}

async function readUserSettings(userSettingsFilePath) {
    try {
        const raw = await fs.readFile(userSettingsFilePath, 'utf-8');
        return JSON.parse(stripLineComments(raw));
    } catch (error) {
        return {};
    }
}

async function updateUserSettings(userSettingsFilePath, mutateFn) {
    const parsed = await readUserSettings(userSettingsFilePath);
    mutateFn(parsed);
    await fs.mkdir(path.dirname(userSettingsFilePath), { recursive: true });
    await fs.writeFile(userSettingsFilePath, JSON.stringify(parsed, null, 4) + os.EOL);
}

function getScope(userSettings) {
    const value =
        userSettings.installBehavior && userSettings.installBehavior.preferences && userSettings.installBehavior.preferences.scope;
    return isValidScopeValue(value) ? value : 'user';
}

function getDisableInstallNotes(userSettings) {
    const value = userSettings.installBehavior && userSettings.installBehavior.disableInstallNotes;
    return typeof value === 'boolean' ? value : false;
}

function getMaxResumes(userSettings) {
    const value = userSettings.installBehavior && userSettings.installBehavior.maxResumes;
    return isValidMaxResumes(value) ? value : 3;
}

function getInteractivityDisable(userSettings) {
    const value = userSettings.interactivity && userSettings.interactivity.disable;
    return typeof value === 'boolean' ? value : false;
}

function setScope(parsed, value) {
    parsed.installBehavior = parsed.installBehavior || {};
    parsed.installBehavior.preferences = parsed.installBehavior.preferences || {};
    parsed.installBehavior.preferences.scope = value;
}

function setDisableInstallNotes(parsed, value) {
    parsed.installBehavior = parsed.installBehavior || {};
    parsed.installBehavior.disableInstallNotes = value;
}

function setMaxResumes(parsed, value) {
    parsed.installBehavior = parsed.installBehavior || {};
    parsed.installBehavior.maxResumes = value;
}

function setInteractivityDisable(parsed, value) {
    parsed.interactivity = parsed.interactivity || {};
    parsed.interactivity.disable = value;
}

function buildAdminSettingScript(wingetLocation, settingName, enable) {
    const flag = enable ? '--enable' : '--disable';
    const escapedPath = escapeForPowerShellSingleQuotes(wingetLocation);
    const escapedSetting = escapeForPowerShellSingleQuotes(settingName);

    return (
        `try { ` +
        `$p = Start-Process -FilePath '${escapedPath}' -ArgumentList @('settings','${flag}','${escapedSetting}') -Verb RunAs -Wait -PassThru; ` +
        `exit $p.ExitCode ` +
        `} catch { exit 1223 }`
    );
}

async function setAdminSetting(wingetLocation, settingName, enable) {
    const script = buildAdminSettingScript(wingetLocation, settingName, enable);

    try {
        await execAsync(`powershell -NoProfile -NonInteractive -Command "${script}"`);
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    SCOPE_VALUES,
    MAX_RESUMES_OPTIONS,
    ADMIN_SETTINGS,
    isValidScopeValue,
    isValidMaxResumes,
    readSnapshot,
    readUserSettings,
    updateUserSettings,
    getScope,
    getDisableInstallNotes,
    getMaxResumes,
    getInteractivityDisable,
    setScope,
    setDisableInstallNotes,
    setMaxResumes,
    setInteractivityDisable,
    setAdminSetting,
};
