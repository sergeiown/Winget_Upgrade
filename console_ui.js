/* Copyright (c) 2024-2026 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const isColorEnabled = Boolean(process.stdout.isTTY);

const codes = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

function paint(text, ...styles) {
    if (!isColorEnabled || text.length === 0) {
        return text;
    }
    return styles.map((style) => codes[style]).join('') + text + codes.reset;
}

function renderProgressBar(percent, etaSeconds, width = 30) {
    const clamped = Math.max(0, Math.min(100, percent));
    const filledLength = Math.round((clamped / 100) * width);
    const bar = '█'.repeat(filledLength) + '░'.repeat(width - filledLength);
    const etaText = Number.isFinite(etaSeconds) ? `ETA ${Math.max(0, Math.round(etaSeconds))}s` : '';

    return `${paint(bar, 'cyan')} ${String(clamped).padStart(3)}%  ${paint(etaText, 'dim')}`;
}

function renderProgressLine(percent, etaSeconds) {
    process.stdout.write(`\r${renderProgressBar(percent, etaSeconds)}`);
}

function clearProgressLine() {
    process.stdout.write(`\r${' '.repeat(60)}\r`);
}

function createProgressRenderer() {
    let baselineTime = Date.now();
    let baselinePercent = 0;
    let lastPercent = 0;

    return function update(percent) {
        if (percent < lastPercent) {
            baselineTime = Date.now();
            baselinePercent = 0;
        }
        lastPercent = percent;

        const elapsedMs = Date.now() - baselineTime;
        const progressSinceBaseline = percent - baselinePercent;
        const etaSeconds = progressSinceBaseline > 0 ? (elapsedMs / progressSinceBaseline) * (100 - percent) / 1000 : NaN;

        renderProgressLine(percent, etaSeconds);
    };
}

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function createSpinner(text) {
    let frameIndex = 0;
    let timer = null;

    function render() {
        process.stdout.write(`\r${paint(spinnerFrames[frameIndex], 'cyan')} ${text}`);
        frameIndex = (frameIndex + 1) % spinnerFrames.length;
    }

    function clearLine() {
        process.stdout.write(`\r${' '.repeat(text.length + 4)}\r`);
    }

    return {
        start() {
            if (!isColorEnabled) {
                console.log(`${text}...`);
                return this;
            }
            render();
            timer = setInterval(render, 100);
            return this;
        },
        stop(finalLine) {
            if (timer) {
                clearInterval(timer);
                timer = null;
                clearLine();
            }
            if (finalLine) {
                console.log(finalLine);
            }
        },
    };
}

function printDiscoveredPackages(packages, meta = {}) {
    console.clear();

    const { totalInstalled, upToDateCount, ignoredCount } = meta;

    if (typeof totalInstalled === 'number') {
        console.log(
            `${paint('Checked', 'bold', 'cyan')} ${paint(String(totalInstalled), 'bold', 'cyan')} ${paint('installed package(s):', 'bold', 'cyan')} ` +
                `${paint(`${upToDateCount} up to date`, 'dim')}, ` +
                `${paint(`${packages.length} to update`, packages.length > 0 ? 'green' : 'dim')}, ` +
                `${paint(`${ignoredCount} ignored`, 'yellow')}`
        );
        console.log();
    }

    if (packages.length === 0) {
        console.log(paint('No updates found - everything is up to date.', 'green'));
        console.log();
        return;
    }

    console.log(paint(`Found ${packages.length} package(s) to update:`, 'bold', 'cyan'));
    packages.forEach((pkg) => console.log(`  - ${pkg.id}`));
    console.log();
}

function printPackageHeader(index, total, id) {
    console.clear();
    console.log(paint(`[${index}/${total}] Upgrading: ${id}`, 'bold', 'cyan'));
    console.log();
}

const statusLabels = {
    updated: paint('Updated', 'green'),
    'no-update': paint('Up to date', 'dim'),
    failed: paint('Failed', 'red'),
};

function printPackageResult(result) {
    console.log(`${statusLabels[result.status]}  ${result.id}  (${(result.durationMs / 1000).toFixed(1)}s)`);
}

function printSummaryTable(results, totalElapsedMs) {
    const updated = results.filter((result) => result.status === 'updated');
    const noUpdate = results.filter((result) => result.status === 'no-update');
    const failed = results.filter((result) => result.status === 'failed');

    console.log();
    console.log(paint('Upgrade summary', 'bold', 'cyan'));
    console.log(paint('----------------', 'cyan'));
    console.log(`${paint('Updated:', 'green')} ${updated.length}`);
    console.log(`${paint('Up to date:', 'dim')} ${noUpdate.length}`);
    console.log(`${paint('Failed:', 'red')} ${failed.length}`);

    if (failed.length > 0) {
        console.log();
        console.log(paint('Failed to update:', 'red'));
        failed.forEach((result) => console.log(`  - ${result.id}`));
    }

    console.log();
    console.log(paint(`Total time: ${(totalElapsedMs / 1000).toFixed(1)}s`, 'dim'));
    console.log();
}

module.exports = {
    paint,
    renderProgressBar,
    renderProgressLine,
    clearProgressLine,
    createProgressRenderer,
    createSpinner,
    printDiscoveredPackages,
    printPackageHeader,
    printPackageResult,
    printSummaryTable,
};
