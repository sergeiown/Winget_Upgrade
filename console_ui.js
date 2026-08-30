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
let settingsAvailable = false;

let operationLines = [];
let eventLines = [];

const OPERATION_BOX_HEIGHT = 10;

function applyLocaleToChrome() {
    const t = i18n.get();
    operationBox.setLabel(t.operationLabel);
    progressBox.setLabel(t.progressLabel);
    eventsLog.setLabel(t.eventsLabel);
    footerBox.setContent(settingsAvailable ? t.footer : t.footerSettingsPending);
    screen.render();
}

function setSettingsAvailable(value) {
    settingsAvailable = value;
    footerBox.setContent(value ? i18n.get().footer : i18n.get().footerSettingsPending);
    screen.render();
}

const BLOCK_FONT = {
    A: [' ██ ', '█  █', '████', '█  █', '█  █'],
    D: ['███ ', '█  █', '█  █', '█  █', '███ '],
    E: ['████', '█   ', '███ ', '█   ', '████'],
    G: [' ███', '█   ', '█ ██', '█  █', ' ███'],
    I: ['███', ' █ ', ' █ ', ' █ ', '███'],
    N: ['█  █', '██ █', '█ ██', '█  █', '█  █'],
    P: ['███ ', '█  █', '███ ', '█   ', '█   '],
    R: ['███ ', '█  █', '███ ', '█ █ ', '█  █'],
    T: ['███', ' █ ', ' █ ', ' █ ', ' █ '],
    U: ['█  █', '█  █', '█  █', '█  █', ' ██ '],
    W: ['█   █', '█   █', '█ █ █', '██ ██', '█   █'],
};

function renderBlockWord(word) {
    const rows = ['', '', '', '', ''];
    [...word].forEach((letter, index) => {
        const glyph = BLOCK_FONT[letter];
        for (let row = 0; row < 5; row++) {
            rows[row] += glyph[row] + (index < word.length - 1 ? ' ' : '');
        }
    });
    return rows;
}

function centeredLine(text, width) {
    const pad = Math.max(0, width - text.length);
    const left = Math.floor(pad / 2);
    return `${' '.repeat(left)}${text}`;
}

function buildBannerLines() {
    const wingetRows = renderBlockWord('WINGET');
    const upgradeRows = renderBlockWord('UPGRADE');
    const authorText = 'Copyright (c) 2024-2026 Serhii I. Myshko';
    const width = Math.max(...wingetRows.concat(upgradeRows).map((row) => row.length), authorText.length);

    const centeredWinget = wingetRows.map((row) => centeredLine(row, width));
    const centeredUpgrade = upgradeRows.map((row) => centeredLine(row, width));
    const author = centeredLine(authorText, width);

    return [...centeredWinget, '', ...centeredUpgrade, '', author];
}

function buildBannerBitmap(lines, width) {
    return lines.map((line) => {
        const padded = line.padEnd(width, ' ');
        return padded.split('').map((ch) => (ch !== ' ' ? 1 : 0));
    });
}

function combineHalfBlock(top, bottom) {
    if (top && bottom) {
        return '█';
    }
    if (top) {
        return '▀';
    }
    if (bottom) {
        return '▄';
    }
    return ' ';
}

function renderBitmapRevealFromTop(bitmap, width, windowHeight, totalShiftSteps, boundary) {
    const height = bitmap.length;
    const revealed = totalShiftSteps - boundary;

    function valueAt(row, col) {
        if (row < 0 || row >= height) {
            return 0;
        }
        return bitmap[row][col];
    }

    const outLines = [];
    for (let j = 0; j < windowHeight; j++) {
        let line = '';
        for (let x = 0; x < width; x++) {
            const upper = 2 * j < revealed ? valueAt(j, x) : 0;
            const lower = 2 * j + 1 < revealed ? valueAt(j, x) : 0;
            line += combineHalfBlock(upper, lower);
        }
        outLines.push(line);
    }
    return outLines;
}

function showSplash() {
    return new Promise((resolve) => {
        screen = blessed.screen({
            smartCSR: true,
            mouse: true,
            fullUnicode: true,
            dockBorders: true,
            title: 'Winget Upgrade',
        });
        screen.program.hideCursor();

        const lines = buildBannerLines();
        const boxHeight = lines.length;
        const boxWidth = Math.max(...lines.map((line) => line.length));
        const bitmap = buildBannerBitmap(lines, boxWidth);

        const totalRows = screen.rows || 40;
        const finalTop = Math.max(0, Math.floor((totalRows - boxHeight) / 2));

        const splashBox = blessed.box({
            parent: screen,
            top: finalTop,
            left: 'center',
            width: boxWidth,
            height: boxHeight,
            style: { fg: 'cyan' },
            content: '',
        });

        const totalShiftSteps = boxHeight * 2;
        const durationMs = 2000;
        const stepMs = durationMs / totalShiftSteps;
        let boundary = totalShiftSteps;

        function renderFrame() {
            if (boundary <= 0) {
                splashBox.setContent(lines.join('\n'));
            } else {
                const frameLines = renderBitmapRevealFromTop(bitmap, boxWidth, boxHeight, totalShiftSteps, boundary);
                splashBox.setContent(frameLines.join('\n'));
            }
            screen.program.hideCursor();
            screen.render();
        }

        function tick() {
            boundary -= 1;
            renderFrame();
            if (boundary > 0) {
                setTimeout(tick, stepMs);
            } else {
                setTimeout(() => {
                    splashBox.destroy();
                    screen.program.hideCursor();
                    screen.render();
                    resolve();
                }, 2000);
            }
        }

        renderFrame();
        setTimeout(tick, stepMs);
    });
}

function init(windowTitle, boxLabel) {
    if (!screen) {
        screen = blessed.screen({
            smartCSR: true,
            mouse: true,
            fullUnicode: true,
            dockBorders: true,
            title: windowTitle || 'Winget Upgrade',
        });
        screen.program.hideCursor();
    } else {
        screen.title = windowTitle || 'Winget Upgrade';
    }

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
            wrap: false,
            label: ` ${boxLabel || windowTitle || 'Winget Upgrade'} `,
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
            wrap: false,
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

    screen.on('resize', () => {
        screen.alloc();
        screen.render();
    });

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
            exitApp(0);
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

function truncateWithEllipsis(text, maxLength) {
    if (maxLength <= 1 || text.length <= maxLength) {
        return text;
    }
    return `${text.slice(0, maxLength - 1)}…`;
}

function truncateTaggedLine(text, maxLength) {
    const plain = text.replace(/\{[^}]*\}/g, '');
    if (maxLength <= 1 || plain.length <= maxLength) {
        return text;
    }
    return `${plain.slice(0, maxLength - 1)}…`;
}

function setCurrentOperation(pkg) {
    const sourceSuffix = ` (${blessed.escape(pkg.source)}) `;
    const maxIdLength = Math.max(6, screen.width - 4 - sourceSuffix.length);
    const id = truncateWithEllipsis(blessed.escape(pkg.id), maxIdLength);

    operationBox.setLabel(` ${id}${sourceSuffix}`);
    operationLines = [];
    operationBox.setContent('');
    screen.render();
}

function appendOperationLine(line) {
    const visibleRows = Math.max(1, OPERATION_BOX_HEIGHT - 2);
    const maxLineLength = Math.max(10, screen.width - 4);

    operationLines.push(blessed.escape(truncateWithEllipsis(line, maxLineLength)));
    operationLines = operationLines.slice(-visibleRows);
    operationBox.setContent(operationLines.join('\n'));
    screen.render();
}

function renderProgress() {
    if (modalOpen) {
        return;
    }

    const elapsedSeconds = ((Date.now() - progressStartedAt) / 1000).toFixed(1);
    const frame = spinnerFrames[progressFrameIndex];
    const timeSuffix = ` (${elapsedSeconds}s)`;

    progressFrameIndex = (progressFrameIndex + 1) % spinnerFrames.length;

    const maxStatusLength = Math.max(10, screen.width - 4 - timeSuffix.length);
    const statusText = truncateWithEllipsis(progressStatusText, maxStatusLength);

    progressBox.setContent(
        `{cyan-fg}${frame}{/cyan-fg} ${blessed.escape(statusText)} {white-fg}${timeSuffix}{/white-fg}`
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

function setCountdownDisplay(text) {
    progressBox.setContent(text || '');
    screen.render();
}

function appendEventLine(text) {
    const resolvedHeight = typeof eventsLog.height === 'number' ? eventsLog.height : 20;
    const visibleRows = Math.max(1, resolvedHeight - 2);
    const maxLineLength = Math.max(10, screen.width - 4);

    eventLines.push(truncateTaggedLine(text, maxLineLength));
    eventLines = eventLines.slice(-visibleRows);
    eventsLog.setContent(eventLines.join('\n'));
    screen.render();
}

function appendResultEvent(result) {
    const meta = statusMeta(result.status);
    const seconds = (result.durationMs / 1000).toFixed(1);

    appendEventLine(
        `${meta.icon} {${meta.tag}}${meta.label.padEnd(11)}{/${meta.tag}} ${blessed.escape(result.id)}  (${seconds}s)`
    );
}

function appendInfoEvent(text) {
    appendEventLine(text);
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

function waitAnyKeyOrTimeout(ms, onTick) {
    return new Promise((resolve) => {
        let settled = false;
        let timer = null;
        let remainingMs = ms;
        let pausedForModal = false;

        function finish() {
            if (settled) {
                return;
            }
            settled = true;
            if (timer) {
                clearInterval(timer);
            }
            screen.removeListener('keypress', handleKeypress);
            resolve();
        }

        function handleKeypress(ch, key) {
            if (modalOpen || (key && key.name === 'f2')) {
                return;
            }
            finish();
        }

        function tick() {
            if (modalOpen) {
                pausedForModal = true;
                return;
            }
            if (pausedForModal) {
                pausedForModal = false;
                remainingMs = ms;
                if (onTick) {
                    onTick(Math.ceil(remainingMs / 1000));
                }
                return;
            }
            remainingMs -= 1000;
            if (onTick) {
                onTick(Math.max(0, Math.ceil(remainingMs / 1000)));
            }
            if (remainingMs <= 0) {
                finish();
            }
        }

        if (ms != null) {
            if (onTick) {
                onTick(Math.ceil(remainingMs / 1000));
            }
            timer = setInterval(tick, 1000);
        }

        screen.on('keypress', handleKeypress);
    });
}

function waitForAutoExit(getSeconds, onTick) {
    return new Promise((resolve) => {
        let settled = false;
        let remainingMs = null;
        let pausedForModal = false;

        function currentMs() {
            const seconds = getSeconds();
            return seconds == null ? null : seconds * 1000;
        }

        function report() {
            if (onTick) {
                onTick(remainingMs == null ? null : Math.max(0, Math.ceil(remainingMs / 1000)));
            }
        }

        function finish() {
            if (settled) {
                return;
            }
            settled = true;
            clearInterval(timer);
            screen.removeListener('keypress', handleKeypress);
            resolve();
        }

        function handleKeypress(ch, key) {
            if (modalOpen || (key && key.name === 'f2')) {
                return;
            }
            finish();
        }

        function tick() {
            if (modalOpen) {
                pausedForModal = true;
                return;
            }
            if (pausedForModal) {
                pausedForModal = false;
                remainingMs = currentMs();
                report();
                return;
            }
            if (remainingMs == null) {
                return;
            }
            remainingMs -= 1000;
            report();
            if (remainingMs <= 0) {
                finish();
            }
        }

        remainingMs = currentMs();
        report();
        const timer = setInterval(tick, 1000);
        screen.on('keypress', handleKeypress);
    });
}

module.exports = {
    showSplash,
    init,
    getScreen,
    setSessionState,
    setCurrentOperation,
    appendOperationLine,
    startProgress,
    updateProgressStatus,
    stopProgress,
    setCountdownDisplay,
    appendResultEvent,
    appendInfoEvent,
    showSummary,
    showFatalError,
    onSkipRequested,
    onSettingsRequested,
    setSettingsAvailable,
    setUpgradeInProgress,
    setModalOpen,
    isModalOpen,
    waitAnyKeyOrTimeout,
    waitForAutoExit,
    exitApp,
};
