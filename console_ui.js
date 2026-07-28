/* Copyright (c) 2024-2026 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const blessed = require('neo-blessed');
const i18n = require('./i18n');

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function statusMeta(status) {
    const t = i18n.get();
    const table = {
        updated: { label: t.statusUpdated, tag: 'green-fg', icon: '✓' },
        'no-update': { label: t.statusUpToDate, tag: 'white-fg', icon: '·' },
        failed: { label: t.statusFailed, tag: 'red-fg', icon: '✗' },
        skipped: { label: t.statusSkipped, tag: 'yellow-fg', icon: '»' },
    };
    return table[status] || { label: status, tag: 'white-fg', icon: ' ' };
}

let screen = null;
let sessionBox = null;
let operationBox = null;
let progressBox = null;
let eventsLog = null;
let footerBox = null;
let exitQuestion = null;

let progressTimer = null;
let progressStartedAt = 0;
let progressStatusText = '';
let progressFrameIndex = 0;

let skipHandler = null;
let settingsHandler = null;
let upgradeInProgress = false;
let modalOpen = false;

function applyLocaleToChrome() {
    const t = i18n.get();
    operationBox.setLabel(t.operationLabel);
    progressBox.setLabel(t.progressLabel);
    eventsLog.setLabel(t.eventsLabel);
    footerBox.setContent(t.footer);
    screen.render();
}

function init(title) {
    screen = blessed.screen({
        smartCSR: true,
        mouse: true,
        fullUnicode: true,
        dockBorders: true,
        title: title || 'Winget Upgrade',
    });

    const t = i18n.get();

    const boxDefaults = {
        parent: screen,
        left: 0,
        width: '100%',
        tags: true,
        border: { type: 'line' },
        style: { border: { fg: 'cyan' }, label: { fg: 'cyan', bold: true } },
    };

    sessionBox = blessed.box(
        Object.assign({}, boxDefaults, {
            top: 0,
            height: 4,
            label: ` ${title || 'Winget Upgrade'} `,
            content: 'Initializing...',
        })
    );

    operationBox = blessed.log(
        Object.assign({}, boxDefaults, {
            top: 4,
            height: 10,
            label: t.operationLabel,
            scrollable: true,
            alwaysScroll: true,
            scrollbar: { ch: ' ', style: { bg: 'cyan' } },
        })
    );

    progressBox = blessed.box(
        Object.assign({}, boxDefaults, {
            top: 14,
            height: 3,
            label: t.progressLabel,
        })
    );

    eventsLog = blessed.log(
        Object.assign({}, boxDefaults, {
            top: 17,
            height: '100%-18',
            label: t.eventsLabel,
            scrollable: true,
            alwaysScroll: true,
            scrollbar: { ch: ' ', style: { bg: 'cyan' } },
        })
    );

    footerBox = blessed.box({
        parent: screen,
        top: '100%-1',
        left: 0,
        width: '100%',
        height: 1,
        tags: true,
        style: { fg: 'black', bg: 'cyan' },
        content: t.footer,
    });

    exitQuestion = blessed.question({
        parent: screen,
        top: 'center',
        left: 'center',
        width: '60%',
        height: 6,
        tags: true,
        border: { type: 'line' },
        style: { border: { fg: 'yellow' } },
    });

    i18n.onLocaleChange(applyLocaleToChrome);

    screen.key(['f5'], () => {
        if (!modalOpen && skipHandler) {
            skipHandler();
        }
    });

    screen.key(['f2'], () => {
        if (!modalOpen && settingsHandler) {
            settingsHandler();
        }
    });

    screen.key(['escape', 'q', 'C-c'], () => {
        if (!modalOpen) {
            requestExit();
        }
    });

    screen.render();
}

function setModalOpen(value) {
    modalOpen = value;
}

function isModalOpen() {
    return modalOpen;
}

function requestExit() {
    if (!upgradeInProgress) {
        exitApp(0);
        return;
    }

    exitQuestion.ask(i18n.get().exitConfirm, (error, confirmed) => {
        if (confirmed) {
            exitApp(1);
        }
    });
}

function exitApp(code) {
    if (screen) {
        screen.destroy();
    }
    process.exit(code);
}

function getScreen() {
    return screen;
}

function setUpgradeInProgress(value) {
    upgradeInProgress = value;
}

function onSkipRequested(handler) {
    skipHandler = handler;
}

function onSettingsRequested(handler) {
    settingsHandler = handler;
}

function setSessionState({ index, total, totalInstalled, upToDateCount, toUpdateCount, ignoredCount }) {
    const t = i18n.get();
    const stateLine = total > 0 ? t.sessionUpdating(index, total) : t.sessionNoPackages;
    const countsLine = t.sessionCounts(totalInstalled, upToDateCount, toUpdateCount, ignoredCount);

    sessionBox.setContent(`${stateLine}\n${countsLine}`);
    screen.render();
}

function setCurrentOperation(pkg) {
    operationBox.setLabel(` ${blessed.escape(pkg.id)} (${blessed.escape(pkg.source)}) `);
    operationBox.setContent('');
    screen.render();
}

function appendOperationLine(line) {
    operationBox.log(blessed.escape(line));
    screen.render();
}

function renderProgress() {
    if (modalOpen) {
        return;
    }

    const elapsedSeconds = ((Date.now() - progressStartedAt) / 1000).toFixed(1);
    const frame = spinnerFrames[progressFrameIndex];

    progressFrameIndex = (progressFrameIndex + 1) % spinnerFrames.length;
    progressBox.setContent(
        `{cyan-fg}${frame}{/cyan-fg} ${blessed.escape(progressStatusText)} {white-fg}(${elapsedSeconds}s){/white-fg}`
    );
    screen.render();
}

function startProgress(initialText) {
    progressStartedAt = Date.now();
    progressStatusText = initialText || 'Starting...';
    progressFrameIndex = 0;
    renderProgress();
    progressTimer = setInterval(renderProgress, 100);
}

function updateProgressStatus(text) {
    progressStatusText = text;
}

function stopProgress() {
    if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
    }
    progressBox.setContent('');
    screen.render();
}

function appendResultEvent(result) {
    const meta = statusMeta(result.status);
    const seconds = (result.durationMs / 1000).toFixed(1);

    eventsLog.log(
        `${meta.icon} {${meta.tag}}${meta.label.padEnd(11)}{/${meta.tag}} ${blessed.escape(result.id)}  (${seconds}s)`
    );
    screen.render();
}

function appendInfoEvent(text) {
    eventsLog.log(text);
    screen.render();
}

function showSummary(results, totalElapsedMs) {
    const updated = results.filter((result) => result.status === 'updated').length;
    const upToDate = results.filter((result) => result.status === 'no-update').length;
    const skipped = results.filter((result) => result.status === 'skipped').length;
    const failed = results.filter((result) => result.status === 'failed').length;

    appendInfoEvent('');
    appendInfoEvent(i18n.get().summaryLine(updated, upToDate, skipped, failed, (totalElapsedMs / 1000).toFixed(1)));
}

function showFatalError(message) {
    const normalizedMessage = message.replace(/\r\n/g, '\n');

    operationBox.setLabel(i18n.get().errorLabel);
    operationBox.setContent(`{red-fg}${blessed.escape(normalizedMessage)}{/red-fg}`);
    screen.render();
}

function waitAnyKeyOrTimeout(ms) {
    return new Promise((resolve) => {
        let settled = false;
        let timer = null;

        function finish() {
            if (settled || modalOpen) {
                return;
            }
            settled = true;
            clearTimeout(timer);
            screen.removeListener('keypress', finish);
            resolve();
        }

        function armTimer() {
            timer = setTimeout(() => {
                if (modalOpen) {
                    armTimer();
                    return;
                }
                finish();
            }, ms);
        }

        armTimer();
        screen.on('keypress', finish);
    });
}

module.exports = {
    init,
    getScreen,
    setSessionState,
    setCurrentOperation,
    appendOperationLine,
    startProgress,
    updateProgressStatus,
    stopProgress,
    appendResultEvent,
    appendInfoEvent,
    showSummary,
    showFatalError,
    onSkipRequested,
    onSettingsRequested,
    setUpgradeInProgress,
    setModalOpen,
    isModalOpen,
    waitAnyKeyOrTimeout,
    exitApp,
};
