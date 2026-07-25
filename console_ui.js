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

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

// winget prints no percentage at all once its stdout is piped (confirmed empirically - it only
// emits plain status lines like "Downloading ..." / "Successfully verified installer hash"), so a
// real byte-accurate progress bar/ETA isn't possible without a PTY layer, which this project
// deliberately avoids as a dependency. Instead, show a live spinner with elapsed time and whatever
// status line winget last reported - honest live feedback instead of a fabricated percentage.
function createPackageProgressRenderer() {
    const startedAt = Date.now();
    let frameIndex = 0;
    let statusText = 'Starting...';
    let timer = null;

    function render() {
        const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
        const line = `${paint(spinnerFrames[frameIndex], 'cyan')} ${statusText} ${paint(`(${elapsedSeconds}s)`, 'dim')}`;
        // Padded with trailing spaces (not measured against `line.length`, which is inflated by
        // ANSI escape codes and wouldn't reflect the actual on-screen width) so a shorter status
        // line fully overwrites a longer previous one.
        process.stdout.write(`\r${line}${' '.repeat(20)}`);
        frameIndex = (frameIndex + 1) % spinnerFrames.length;
    }

    if (isColorEnabled) {
        render();
        timer = setInterval(render, 100);
    }

    return {
        update(text) {
            statusText = text;
            if (!isColorEnabled) {
                console.log(text);
            }
        },
        stop() {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
            process.stdout.write(`\r${' '.repeat(100)}\r`);
        },
    };
}

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
        const labelWidth = 14;
        const rows = [
            ['Installed:', totalInstalled, 'cyan'],
            ['Up to date:', upToDateCount, 'dim'],
            ['To update:', packages.length, packages.length > 0 ? 'green' : 'dim'],
            ['Ignored:', ignoredCount, 'yellow'],
        ];

        console.log(paint('Discovery summary', 'bold', 'cyan'));
        console.log(paint('-'.repeat('Discovery summary'.length), 'cyan'));
        rows.forEach(([label, value, style]) => {
            console.log(`${paint(label.padEnd(labelWidth), style)}${String(value).padStart(4)}`);
        });
        console.log();
    }

    if (packages.length === 0) {
        console.log(paint('No updates found - everything is up to date.', 'green'));
        console.log();
        return;
    }

    console.log(paint('Packages to update:', 'bold', 'cyan'));
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
    createPackageProgressRenderer,
    createSpinner,
    printDiscoveredPackages,
    printPackageHeader,
    printPackageResult,
    printSummaryTable,
};
