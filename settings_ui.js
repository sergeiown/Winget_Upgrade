/* Copyright (c) 2024-2026 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const blessed = require('neo-blessed');
const consoleUi = require('./console_ui');
const { listInstalledPackages } = require('./utils');

const execAsync = promisify(exec);

const STARTUP_SHORTCUT_NAME = 'Winget Upgrade.lnk';

function getStartupShortcutPath() {
    return path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', STARTUP_SHORTCUT_NAME);
}

async function isAutostartEnabled() {
    try {
        await fs.access(getStartupShortcutPath());
        return true;
    } catch (error) {
        return false;
    }
}

function escapeForPowerShellSingleQuotes(value) {
    return value.replace(/'/g, "''");
}

async function setAutostart(enabled) {
    const shortcutPath = getStartupShortcutPath();

    if (!enabled) {
        await fs.unlink(shortcutPath).catch(() => {});
        return;
    }

    const targetPath = process.execPath;
    const workingDirectory = path.dirname(targetPath);
    const psScript =
        `$s = (New-Object -ComObject WScript.Shell).CreateShortcut('${escapeForPowerShellSingleQuotes(shortcutPath)}'); ` +
        `$s.TargetPath = '${escapeForPowerShellSingleQuotes(targetPath)}'; ` +
        `$s.WorkingDirectory = '${escapeForPowerShellSingleQuotes(workingDirectory)}'; ` +
        `$s.Save()`;

    await execAsync(`powershell -NoProfile -NonInteractive -Command "${psScript}"`);
}

async function readIgnoreLines(ignoreFilePath) {
    try {
        const content = await fs.readFile(ignoreFilePath, 'utf-8');
        return content.split(/\r?\n/);
    } catch (error) {
        return [];
    }
}

async function applyIgnoreSelection(ignoreFilePath, checkedIds, allInstalledIds) {
    const existingLines = await readIgnoreLines(ignoreFilePath);
    const knownIds = new Set(allInstalledIds.map((id) => id.toLowerCase()));
    const keptLines = existingLines.filter((line) => !knownIds.has(line.trim().toLowerCase()));
    const content = keptLines.concat(checkedIds).join(os.EOL);

    await fs.writeFile(ignoreFilePath, content.endsWith(os.EOL) ? content : content + os.EOL);
}

function formatItem(pkg, checked) {
    return `${checked ? '[x]' : '[ ]'} ${pkg.id}`;
}

async function open(screen, { wingetLocation, ignoreFilePath }) {
    consoleUi.setModalOpen(true);

    return new Promise((resolve) => {
        const overlay = blessed.box({
            parent: screen,
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            style: { bg: 'black' },
        });

        const header = blessed.box({
            parent: overlay,
            top: 0,
            left: 0,
            width: '100%',
            height: 3,
            tags: true,
            border: { type: 'line' },
            label: ' Налаштування ',
            style: { border: { fg: 'cyan' }, label: { fg: 'cyan', bold: true } },
            content: '{bold}Esc{/bold} - зберегти й закрити    {bold}Space/Enter{/bold} - позначити пакет',
        });

        const autostartCheckbox = blessed.checkbox({
            parent: overlay,
            top: 3,
            left: 2,
            height: 1,
            content: 'Запускати автоматично при вході в Windows',
            mouse: true,
            checked: false,
        });

        const listLabelBox = blessed.box({
            parent: overlay,
            top: 5,
            left: 0,
            width: '100%',
            height: 1,
            content: ' Завантаження списку встановлених пакетів...',
        });

        const list = blessed.list({
            parent: overlay,
            top: 6,
            left: 0,
            width: '100%',
            height: '100%-7',
            tags: true,
            border: { type: 'line' },
            label: ' Чорний список ',
            keys: true,
            vi: true,
            mouse: true,
            scrollbar: { ch: ' ', style: { bg: 'cyan' } },
            style: { border: { fg: 'cyan' }, label: { fg: 'cyan', bold: true }, selected: { bg: 'blue' } },
            items: [],
        });

        const checkedIds = new Set();
        let packages = [];
        let closed = false;

        function renderList() {
            const selectedIndex = list.selected;
            list.setItems(packages.map((pkg) => formatItem(pkg, checkedIds.has(pkg.id.toLowerCase()))));
            list.select(selectedIndex);
            screen.render();
        }

        function toggleSelected() {
            const pkg = packages[list.selected];
            if (!pkg) {
                return;
            }
            const key = pkg.id.toLowerCase();
            if (checkedIds.has(key)) {
                checkedIds.delete(key);
            } else {
                checkedIds.add(key);
            }
            renderList();
        }

        list.key(['space', 'enter'], toggleSelected);

        autostartCheckbox.on('check', () => {
            setAutostart(true).catch(() => {});
        });
        autostartCheckbox.on('uncheck', () => {
            setAutostart(false).catch(() => {});
        });

        async function close() {
            if (closed) {
                return;
            }
            closed = true;

            const checkedOriginalIds = packages.filter((pkg) => checkedIds.has(pkg.id.toLowerCase())).map((pkg) => pkg.id);

            try {
                await applyIgnoreSelection(
                    ignoreFilePath,
                    checkedOriginalIds,
                    packages.map((pkg) => pkg.id)
                );
            } catch (error) {}

            overlay.destroy();
            screen.render();
            consoleUi.setModalOpen(false);
            resolve();
        }

        overlay.key(['escape'], close);
        list.key(['escape'], close);

        list.focus();
        screen.render();

        (async () => {
            const [autostartEnabled, installedPackages, ignoreLines] = await Promise.all([
                isAutostartEnabled(),
                listInstalledPackages(wingetLocation).catch(() => []),
                readIgnoreLines(ignoreFilePath),
            ]);

            autostartCheckbox.checked = autostartEnabled;

            packages = installedPackages;
            const ignoredIdSet = new Set(ignoreLines.map((line) => line.trim().toLowerCase()));
            packages.forEach((pkg) => {
                if (ignoredIdSet.has(pkg.id.toLowerCase())) {
                    checkedIds.add(pkg.id.toLowerCase());
                }
            });

            listLabelBox.setContent(` Пакети (${packages.length}) - позначені записуються у ${path.basename(ignoreFilePath)}`);
            renderList();
            list.items.forEach((item) => item.on('click', toggleSelected));
            screen.render();
        })();
    });
}

module.exports = { open };
