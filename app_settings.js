/* Copyright (c) 2024-2026 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const fs = require('fs');
const os = require('os');
const settings = require('./settings');

const AUTO_CLOSE_VALUES = ['never', '30', '60'];
const DEFAULT_AUTO_CLOSE = '30';

function readSavedAutoClose() {
    try {
        const value = fs.readFileSync(settings.autoCloseFilePath, 'utf-8').trim();
        return AUTO_CLOSE_VALUES.includes(value) ? value : null;
    } catch (error) {
        return null;
    }
}

let currentAutoClose = readSavedAutoClose() || DEFAULT_AUTO_CLOSE;

function getAutoClose() {
    return currentAutoClose;
}

function getAutoCloseSeconds() {
    return currentAutoClose === 'never' ? null : Number(currentAutoClose);
}

function setAutoClose(value) {
    if (!AUTO_CLOSE_VALUES.includes(value) || value === currentAutoClose) {
        return;
    }

    currentAutoClose = value;

    try {
        fs.writeFileSync(settings.autoCloseFilePath, value + os.EOL);
    } catch (error) {}
}

module.exports = {
    AUTO_CLOSE_VALUES,
    getAutoClose,
    getAutoCloseSeconds,
    setAutoClose,
};
