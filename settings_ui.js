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
const i18n = require('./i18n');
const { listInstalledPackages, escapeForPowerShellSingleQuotes } = require('./utils');
const wingetSettings = require('./winget_settings');

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

function isSelectableRow(row) {
    return !!row && !row.header && !row.warning && !row.hint;
}

function buildMenuList({ parent, screen, top, height }) {
    const list = blessed.list({
        parent,
        top: top || 0,
        left: 0,
        width: '100%',
        height: height || '100%',
        tags: true,
        keys: false,
        mouse: true,
        scrollbar: { ch: ' ', style: { bg: 'cyan' } },
        style: { selected: { fg: 'yellow' }, item: { fg: 'white' } },
        items: [],
    });

    let rows = [];

    function rowText(row) {
        if (row.warning) {
            return `{red-fg}{bold}${row.getText()}{/bold}{/red-fg}`;
        }
        if (row.header) {
            return `{cyan-fg}{bold}${row.getText()}{/bold}{/cyan-fg}`;
        }
        if (row.hint) {
            return `{cyan-fg}${row.getText()}{/cyan-fg}`;
        }
        if (row.type === 'checkbox') {
            const mark = row.getChecked() ? '{green-fg}✓{/green-fg}' : '○';
            return `${mark} ${row.label}`;
        }
        if (row.type === 'radio') {
            const mark = row.getSelectedValue() === row.value ? '{cyan-fg}●{/cyan-fg}' : '○';
            return `${mark} ${row.label}`;
        }
        return row.label || '';
    }

    function render() {
        const selectedIndex = list.selected;
        list.setItems(rows.map(rowText));
        list.select(selectedIndex);
        screen.render();
    }

    function moveSelection(direction) {
        if (!rows.length) {
            return;
        }
        let index = list.selected;
        for (let step = 0; step < rows.length; step++) {
            index = (index + direction + rows.length) % rows.length;
            if (isSelectableRow(rows[index])) {
                break;
            }
        }
        list.select(index);
        screen.render();
    }

    function activateCurrent() {
        const row = rows[list.selected];
        if (!row) {
            return;
        }
        if (row.type === 'checkbox') {
            row.onToggle(!row.getChecked());
        } else if (row.type === 'radio') {
            row.onSelect(row.value);
        }
        render();
    }

    list.key(['up'], () => moveSelection(-1));
    list.key(['down'], () => moveSelection(1));
    list.key(['enter', 'space'], activateCurrent);
    list.on('action', activateCurrent);

    function setRows(newRows) {
        rows = newRows;
        render();
        if (!isSelectableRow(rows[list.selected])) {
            moveSelection(1);
        }
    }

    return { list, setRows, render };
}

function blankRow() {
    return { header: true, getText: () => '─'.repeat(56) };
}

function buildGeneralTab({ parent, screen, onLocaleChanged }) {
    const { list, setRows } = buildMenuList({ parent, screen });

    const scopeKeys = wingetSettings.SCOPE_VALUES;
    const maxResumesOptions = wingetSettings.MAX_RESUMES_OPTIONS;

    let autostartEnabled = false;
    let wingetAvailable = false;
    let userSettingsFilePath = null;
    let userSettingsValues = {};

    function saveUserSettings(mutateFn) {
        if (!userSettingsFilePath) {
            return;
        }
        wingetSettings.updateUserSettings(userSettingsFilePath, mutateFn).catch(() => {});
    }

    function buildRows() {
        const t = i18n.get();

        const rows = [
            {
                type: 'checkbox',
                label: t.autostartLabel,
                getChecked: () => autostartEnabled,
                onToggle: (value) => {
                    autostartEnabled = value;
                    setAutostart(value).catch(() => {});
                },
            },
            blankRow(),
            { header: true, getText: () => i18n.get().languageLabel },
            {
                type: 'radio',
                groupId: 'language',
                value: 'uk',
                label: t.languageUkrainian,
                getSelectedValue: () => i18n.getLocale(),
                onSelect: (value) => {
                    i18n.setLocale(value);
                    onLocaleChanged();
                },
            },
            {
                type: 'radio',
                groupId: 'language',
                value: 'en',
                label: t.languageEnglish,
                getSelectedValue: () => i18n.getLocale(),
                onSelect: (value) => {
                    i18n.setLocale(value);
                    onLocaleChanged();
                },
            },
            blankRow(),
        ];

        if (!wingetAvailable) {
            rows.push({ header: true, getText: () => i18n.get().wingetSettingsUnavailable });
            return rows;
        }

        rows.push({ header: true, getText: () => i18n.get().scopeLabel });

        const scopeLabels = { user: t.scopeUser, machine: t.scopeMachine };
        scopeKeys.forEach((value) => {
            rows.push({
                type: 'radio',
                groupId: 'scope',
                value,
                label: scopeLabels[value],
                getSelectedValue: () => wingetSettings.getScope(userSettingsValues),
                onSelect: (selectedValue) => {
                    wingetSettings.setScope(userSettingsValues, selectedValue);
                    saveUserSettings((parsed) => wingetSettings.setScope(parsed, selectedValue));
                },
            });
        });

        rows.push(
            blankRow(),
            {
                type: 'checkbox',
                label: t.disableInstallNotesLabel,
                getChecked: () => !wingetSettings.getDisableInstallNotes(userSettingsValues),
                onToggle: (checked) => {
                    wingetSettings.setDisableInstallNotes(userSettingsValues, !checked);
                    saveUserSettings((parsed) => wingetSettings.setDisableInstallNotes(parsed, !checked));
                },
            },
            {
                type: 'checkbox',
                label: t.interactivityLabel,
                getChecked: () => !wingetSettings.getInteractivityDisable(userSettingsValues),
                onToggle: (checked) => {
                    wingetSettings.setInteractivityDisable(userSettingsValues, !checked);
                    saveUserSettings((parsed) => wingetSettings.setInteractivityDisable(parsed, !checked));
                },
            },
            blankRow(),
            { header: true, getText: () => i18n.get().maxResumesLabel }
        );

        maxResumesOptions.forEach((value) => {
            rows.push({
                type: 'radio',
                groupId: 'maxResumes',
                value,
                label: String(value),
                getSelectedValue: () => wingetSettings.getMaxResumes(userSettingsValues),
                onSelect: (selectedValue) => {
                    wingetSettings.setMaxResumes(userSettingsValues, selectedValue);
                    saveUserSettings((parsed) => wingetSettings.setMaxResumes(parsed, selectedValue));
                },
            });
        });

        return rows;
    }

    function applyLocale() {
        setRows(buildRows());
    }

    async function load() {
        autostartEnabled = await isAutostartEnabled();
        setRows(buildRows());
    }

    function applySnapshot(snapshot) {
        wingetAvailable = !!snapshot;
        if (snapshot) {
            userSettingsFilePath = snapshot.userSettingsFilePath;
            userSettingsValues = snapshot.userSettings;
        }
        applyLocale();
    }

    applyLocale();

    return { container: list, focusables: [list], applyLocale, load, applySnapshot };
}

const NAVIGATION_KEY_NAMES = ['up', 'down', 'enter', 'space', 'escape', 'tab', 'left', 'right'];

function buildIgnoreTab({ parent, screen, wingetLocation, ignoreFilePath }) {
    const t = i18n.get();
    const container = blessed.box({ parent, top: 0, left: 0, width: '100%', height: '100%' });

    const listLabelBox = blessed.box({
        parent: container,
        top: 0,
        left: 0,
        width: '100%',
        height: 1,
        tags: true,
        content: t.loadingPackages,
    });

    const searchBox = blessed.box({
        parent: container,
        top: 1,
        left: 0,
        width: '100%',
        height: 3,
        tags: true,
        border: { type: 'line' },
        label: t.searchLabel,
        style: { border: { fg: 'cyan' }, label: { fg: 'cyan', bold: true } },
        content: '',
    });

    const { list, setRows } = buildMenuList({ parent: container, screen, top: 4, height: '100%-4' });

    const checkedIds = new Set();
    let packages = [];
    let initialCheckedIds = null;
    let filterText = '';

    function filteredPackages() {
        const query = filterText.trim().toLowerCase();
        return query ? packages.filter((pkg) => pkg.id.toLowerCase().includes(query)) : packages;
    }

    function updateLabel() {
        const tt = i18n.get();
        listLabelBox.setContent(
            `${tt.packagesCount(checkedIds.size, packages.length, path.basename(ignoreFilePath))}    ${tt.toggleHint}`
        );
        screen.render();
    }

    function buildRows() {
        return filteredPackages().map((pkg) => ({
            type: 'checkbox',
            label: pkg.id,
            getChecked: () => checkedIds.has(pkg.id.toLowerCase()),
            onToggle: (value) => {
                const key = pkg.id.toLowerCase();
                if (value) {
                    checkedIds.add(key);
                } else {
                    checkedIds.delete(key);
                }
                updateLabel();
            },
        }));
    }

    function applyLocale() {
        const tt = i18n.get();
        updateLabel();
        searchBox.setLabel(tt.searchLabel);
        searchBox.setContent(filterText ? `{cyan-fg}{bold}${filterText}▏{/bold}{/cyan-fg}` : `{cyan-fg}${tt.searchPlaceholder}{/cyan-fg}`);
        setRows(buildRows());
    }

    list.on('keypress', (ch, key) => {
        if (NAVIGATION_KEY_NAMES.includes(key.name)) {
            return;
        }
        if (key.name === 'backspace') {
            if (filterText) {
                filterText = filterText.slice(0, -1);
                applyLocale();
            }
            return;
        }
        if (ch && ch.length === 1 && !key.ctrl && !key.meta) {
            filterText += ch;
            applyLocale();
        }
    });

    async function load() {
        const [installedPackages, ignoreLines] = await Promise.all([
            listInstalledPackages(wingetLocation).catch(() => []),
            readIgnoreLines(ignoreFilePath),
        ]);

        packages = installedPackages;
        const ignoredIdSet = new Set(ignoreLines.map((line) => line.trim().toLowerCase()));
        packages.forEach((pkg) => {
            if (ignoredIdSet.has(pkg.id.toLowerCase())) {
                checkedIds.add(pkg.id.toLowerCase());
            }
        });

        initialCheckedIds = new Set(checkedIds);
        applyLocale();
    }

    async function flush() {
        const checkedOriginalIds = packages.filter((pkg) => checkedIds.has(pkg.id.toLowerCase())).map((pkg) => pkg.id);
        const ignoreListChanged =
            initialCheckedIds !== null &&
            (checkedIds.size !== initialCheckedIds.size || [...checkedIds].some((id) => !initialCheckedIds.has(id)));

        try {
            await applyIgnoreSelection(
                ignoreFilePath,
                checkedOriginalIds,
                packages.map((pkg) => pkg.id)
            );
        } catch (error) {}

        return { ignoreListChanged };
    }

    return {
        container,
        focusables: [list],
        applyLocale,
        load,
        flush,
    };
}

function buildAdminTab({ parent, screen, wingetLocation }) {
    const { list, setRows } = buildMenuList({ parent, screen });

    let available = false;
    let statusText = '';
    const adminState = { LocalArchiveMalwareScanOverride: false, InstallerHashOverride: false };

    async function resyncAdminState() {
        try {
            const snapshot = await wingetSettings.readSnapshot(wingetLocation);
            adminState.LocalArchiveMalwareScanOverride = !!snapshot.adminSettings.LocalArchiveMalwareScanOverride;
            adminState.InstallerHashOverride = !!snapshot.adminSettings.InstallerHashOverride;
            return snapshot.adminSettings;
        } catch (error) {
            return null;
        }
    }

    async function applyAdminChange(settingName, enable) {
        statusText = i18n.get().adminApplying;
        applyLocale();

        await wingetSettings.setAdminSetting(wingetLocation, settingName, enable);
        const adminSettingsValues = await resyncAdminState();
        const actual = adminSettingsValues ? !!adminSettingsValues[settingName] : null;

        statusText = actual === enable ? '' : i18n.get().adminChangeFailed;
        applyLocale();
    }

    function handleToggle(settingName, desired) {
        applyAdminChange(settingName, desired).catch(() => {});
    }

    function buildRows() {
        const t = i18n.get();

        if (!available) {
            return [{ header: true, getText: () => i18n.get().wingetSettingsUnavailable }];
        }

        const rows = [
            { warning: true, getText: () => i18n.get().adminRequiresRights },
            blankRow(),
            { hint: true, getText: () => i18n.get().localArchiveOverrideWarning },
            {
                type: 'checkbox',
                label: t.localArchiveOverrideLabel,
                getChecked: () => adminState.LocalArchiveMalwareScanOverride,
                onToggle: (checked) => handleToggle('LocalArchiveMalwareScanOverride', checked),
            },
            blankRow(),
            { hint: true, getText: () => i18n.get().installerHashOverrideWarning },
            {
                type: 'checkbox',
                label: t.installerHashOverrideLabel,
                getChecked: () => adminState.InstallerHashOverride,
                onToggle: (checked) => handleToggle('InstallerHashOverride', checked),
            },
        ];

        if (statusText) {
            rows.push(blankRow(), { header: true, getText: () => statusText });
        }

        return rows;
    }

    function applyLocale() {
        setRows(buildRows());
    }

    function applySnapshot(snapshot) {
        available = !!snapshot;
        if (snapshot) {
            adminState.LocalArchiveMalwareScanOverride = !!snapshot.adminSettings.LocalArchiveMalwareScanOverride;
            adminState.InstallerHashOverride = !!snapshot.adminSettings.InstallerHashOverride;
        }
        applyLocale();
    }

    applyLocale();

    return { container: list, focusables: [list], applyLocale, applySnapshot };
}

async function open(screen, { wingetLocation, ignoreFilePath }) {
    consoleUi.setModalOpen(true);

    return new Promise((resolve) => {
        const t = i18n.get();

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
            label: t.settingsTitle,
            style: { border: { fg: 'cyan' }, label: { fg: 'cyan', bold: true } },
            content: t.settingsCloseHint,
        });

        const tabBar = blessed.listbar({
            parent: overlay,
            top: 3,
            left: 0,
            width: '100%',
            height: 1,
            keys: true,
            mouse: true,
            autoCommandKeys: true,
            style: {
                prefix: { fg: 'white', bold: true },
                item: { fg: 'white' },
                selected: { fg: 'black', bg: 'cyan', bold: true },
            },
        });

        const contentTop = 5;
        const contentArea = blessed.box({
            parent: overlay,
            top: contentTop,
            left: 0,
            width: '100%',
            height: `100%-${contentTop}`,
        });

        function applyLocaleToAll() {
            const tt = i18n.get();
            header.setLabel(tt.settingsTitle);
            header.setContent(tt.settingsCloseHint);
            rebuildTabBar();
            tabs.forEach((tab) => tab.applyLocale());
            screen.render();
        }

        const generalTab = buildGeneralTab({ parent: contentArea, screen, onLocaleChanged: applyLocaleToAll });
        const ignoreTab = buildIgnoreTab({ parent: contentArea, screen, wingetLocation, ignoreFilePath });
        const adminTab = buildAdminTab({ parent: contentArea, screen, wingetLocation });

        const tabs = [generalTab, ignoreTab, adminTab];
        let currentTabIndex = 0;

        function showTab(index) {
            currentTabIndex = index;
            tabs.forEach((tab, tabIndex) => {
                if (tabIndex === index) {
                    tab.container.show();
                } else {
                    tab.container.hide();
                }
            });
            tabs[index].focusables[0].focus();
            tabBar.select(index);
            screen.render();
        }

        function rebuildTabBar() {
            const tt = i18n.get();
            tabBar.setItems({
                [tt.tabGeneral]: () => showTab(0),
                [tt.tabIgnoreList]: () => showTab(1),
                [tt.tabAdvanced]: () => showTab(2),
            });
            tabBar.items.forEach((item, index) => {
                const cmd = tabBar.commands[index];
                if (cmd) {
                    item.setContent(cmd.text);
                }
            });
            tabBar.select(currentTabIndex);
        }

        rebuildTabBar();

        function handleTabSwitchKey(ch, key) {
            if (key.name !== 'left' && key.name !== 'right') {
                return;
            }
            const offset = key.name === 'left' ? -1 : 1;
            showTab((currentTabIndex + offset + tabs.length) % tabs.length);
        }

        function handleEscapeKey(ch, key) {
            if (key.name === 'escape') {
                close();
            }
        }

        screen.on('keypress', handleTabSwitchKey);
        screen.on('keypress', handleEscapeKey);

        let closed = false;

        async function close() {
            if (closed) {
                return;
            }
            closed = true;

            let ignoreListChanged = false;
            try {
                const flushResult = await ignoreTab.flush();
                ignoreListChanged = flushResult.ignoreListChanged;
            } catch (error) {}

            screen.removeListener('keypress', handleTabSwitchKey);
            screen.removeListener('keypress', handleEscapeKey);
            overlay.destroy();
            screen.render();
            consoleUi.setModalOpen(false);
            resolve({ ignoreListChanged });
        }

        showTab(0);
        screen.render();

        (async () => {
            let snapshot = null;
            try {
                const rawSnapshot = await wingetSettings.readSnapshot(wingetLocation);
                const userSettingsValues = await wingetSettings.readUserSettings(rawSnapshot.userSettingsFilePath);
                snapshot = {
                    adminSettings: rawSnapshot.adminSettings,
                    userSettings: userSettingsValues,
                    userSettingsFilePath: rawSnapshot.userSettingsFilePath,
                };
            } catch (error) {
                snapshot = null;
            }

            await Promise.all([generalTab.load(), ignoreTab.load()]);

            generalTab.applySnapshot(snapshot);
            adminTab.applySnapshot(snapshot);

            screen.render();
        })();
    });
}

module.exports = { open };
