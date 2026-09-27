/* Copyright (c) 2024-2026 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const fs = require('fs');
const os = require('os');
const settings = require('./settings');

const MIN_AUTO_CLOSE_SECONDS = 0;
const MAX_AUTO_CLOSE_SECONDS = 180;
const DEFAULT_AUTO_CLOSE_SECONDS = 10;

function parseAutoCloseSeconds(value) {
    if (!/^\d+$/.test(String(value).trim())) {
        return null;
    }
    const parsed = Number(value);
    return parsed >= MIN_AUTO_CLOSE_SECONDS && parsed <= MAX_AUTO_CLOSE_SECONDS ? parsed : null;
}

function readSavedAutoCloseSeconds() {
    try {
        const value = fs.readFileSync(settings.autoCloseFilePath, 'utf-8').trim();
        return parseAutoCloseSeconds(value);
    } catch (error) {
        return null;
    }
}

let currentAutoCloseSeconds = readSavedAutoCloseSeconds();
if (currentAutoCloseSeconds === null) {
    currentAutoCloseSeconds = DEFAULT_AUTO_CLOSE_SECONDS;
}

function getAutoCloseValue() {
    return currentAutoCloseSeconds;
}

function getAutoCloseSeconds() {
    return currentAutoCloseSeconds === 0 ? null : currentAutoCloseSeconds;
}

function setAutoCloseSeconds(value) {
    const parsed = parseAutoCloseSeconds(value);
    if (parsed === null) {
        return false;
    }

    if (parsed === currentAutoCloseSeconds) {
        return true;
    }

    currentAutoCloseSeconds = parsed;

    try {
        fs.writeFileSync(settings.autoCloseFilePath, String(parsed) + os.EOL);
    } catch (error) {}

    return true;
}

module.exports = {
    MIN_AUTO_CLOSE_SECONDS,
    MAX_AUTO_CLOSE_SECONDS,
    DEFAULT_AUTO_CLOSE_SECONDS,
    getAutoCloseValue,
    getAutoCloseSeconds,
    setAutoCloseSeconds,
};
