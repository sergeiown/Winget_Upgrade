/* Copyright (c) 2024-2026 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const fs = require('fs').promises;
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const { createWriteStream } = require('fs');
const settings = require('./settings');

const execAsync = promisify(exec);

function execAcceptingPrompts(command, options) {
    const result = execAsync(command, options);
    result.child.stdin.on('error', () => {});
    result.child.stdin.write(`y${os.EOL}y${os.EOL}`);
    result.child.stdin.end();
    return result;
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function logMessage(message) {
    await fs
        .appendFile(settings.logFilePath, message)
        .catch((err) => console.error(`Error writing to log file: ${err.message}`));
}

function isLoggableLine(line) {
    return (
        line.length > 0 &&
        !/[░▒█]/.test(line) &&
        /[a-zA-Zа-яА-Я0-9]/.test(line) &&
        !line.includes('Found an existing package already installed.') &&
        !line.includes('No available upgrade found.') &&
        !line.includes('No newer package versions are available from the configured sources.')
    );
}

const DEFAULT_IGNORE_TEMPLATE =
    `# Winget Upgrade - ignore list${os.EOL}` +
    `# Add one entry per line. An entry can be the full package identifier${os.EOL}` +
    `# or just part of its name/id - matching is case-insensitive, e.g.:${os.EOL}` +
    `#${os.EOL}` +
    `# 7zip${os.EOL}` +
    `# Google.Chrome${os.EOL}` +
    `#${os.EOL}` +
    `# Lines starting with "#" are comments and are ignored.${os.EOL}`;

async function migrateLegacyIgnoreFile(ignoreFilePath, legacyIgnoreFilePath) {
    try {
        const data = await fs.readFile(legacyIgnoreFilePath, 'utf-8');
        const parsed = JSON.parse(data);
        const names = (parsed.Packages || [])
            .map((pkg) => pkg.name)
            .filter((name) => name && name !== 'REPLACE_WITH_PACKAGE_NAME');

        const migratedContent = DEFAULT_IGNORE_TEMPLATE + os.EOL + names.join(os.EOL) + (names.length ? os.EOL : '');
        await fs.writeFile(ignoreFilePath, migratedContent);
        await fs.rename(legacyIgnoreFilePath, `${legacyIgnoreFilePath}.bak`);

        await logMessage(`Info: Migrated legacy ignore list to ${ignoreFilePath}${os.EOL}`);
        return true;
    } catch (error) {
        return false;
    }
}

async function loadIgnoreList(ignoreFilePath) {
    let content;

    try {
        content = await fs.readFile(ignoreFilePath, 'utf-8');
        await logMessage(`Ignore list successfully applied.${os.EOL}`);
    } catch (error) {
        const migrated = await migrateLegacyIgnoreFile(ignoreFilePath, settings.legacyIgnoreFilePath);

        if (migrated) {
            content = await fs.readFile(ignoreFilePath, 'utf-8');
        } else {
            await fs.writeFile(ignoreFilePath, DEFAULT_IGNORE_TEMPLATE);
            await logMessage(`Info: Created new ignore list template at ${ignoreFilePath}${os.EOL}`);
            content = DEFAULT_IGNORE_TEMPLATE;
        }
    }

    return content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'));
}

function escapeForPowerShellSingleQuotes(value) {
    return value.replace(/'/g, "''");
}

function isColumnBoundary(line, position) {
    if (position <= 0) {
        return true;
    }
    if (position >= line.length) {
        return false;
    }
    return /\s/.test(line[position - 1]);
}

function parseUpgradeTable(output) {
    const lines = output.split(/\r?\n/);

    const separatorIndex = lines.findIndex((line) => /^-{5,}\s*$/.test(line));

    if (separatorIndex <= 0) {
        return [];
    }

    const header = lines[separatorIndex - 1];
    const columns = [...header.matchAll(/\S+/g)];

    if (columns.length < 4) {
        return [];
    }

    const idStart = columns[1].index;
    const versionStart = columns[2].index;
    const sourceStart = columns[columns.length - 1].index;
    const packages = [];

    for (let index = separatorIndex + 1; index < lines.length; index++) {
        const line = lines[index];

        if (!line.trim()) {
            break;
        }
        if (/^-+$/.test(line) || line.length < idStart) {
            break;
        }
        if (!isColumnBoundary(line, idStart) || !isColumnBoundary(line, versionStart)) {
            continue;
        }

        const id = line.substring(idStart, versionStart).trim();
        const source = sourceStart >= 0 ? line.substring(sourceStart).trim() : 'winget';

        if (id) {
            packages.push({ id, source: source || 'winget' });
        }
    }

    return packages;
}

async function killStaleWingetProcesses() {
    const killCommands = ['taskkill /IM winget.exe /F /T', 'taskkill /IM WindowsPackageManagerServer.exe /F /T'];

    for (const killCommand of killCommands) {
        try {
            await execAsync(killCommand, { timeout: 5000 });
        } catch (error) {
            // Nothing to kill, or already gone - not an error worth reporting.
        }
    }
}

async function execWithWingetRecovery(wingetLocation, command, options) {
    try {
        return await execAcceptingPrompts(command, options);
    } catch (firstError) {
        try {
            await logMessage(`Warning: A winget command failed, attempting recovery by killing stale winget processes.${os.EOL}`);
            await killStaleWingetProcesses();
            return await execAcceptingPrompts(command, options);
        } catch (retryError) {
            // Fall through to the original error below.
        }
        throw firstError;
    }
}

async function listInstalledPackages(wingetLocation) {
    const listCommand = `"${wingetLocation}" ${settings.wingetArgs.list.join(' ')}`;
    const { stdout } = await execWithWingetRecovery(wingetLocation, listCommand, {
        maxBuffer: 10 * 1024 * 1024,
        timeout: settings.wingetCommandTimeoutMs,
    });

    return parseUpgradeTable(stdout);
}

async function discoverUpgradablePackages(wingetLocation, ignoreFilePath) {
    const listCommand = `"${wingetLocation}" ${settings.wingetArgs.list.join(' ')}`;
    const upgradeCommand = `"${wingetLocation}" ${settings.wingetArgs.upgradeList.join(' ')}`;

    const execOptions = { maxBuffer: 10 * 1024 * 1024, timeout: settings.wingetCommandTimeoutMs };

    const listResult = await execWithWingetRecovery(wingetLocation, listCommand, execOptions);
    const upgradeResult = await execWithWingetRecovery(wingetLocation, upgradeCommand, execOptions);

    const totalInstalled = parseUpgradeTable(listResult.stdout).length;
    const upgradable = parseUpgradeTable(upgradeResult.stdout);

    if (totalInstalled === 0) {
        await logMessage(
            `Diagnostic: "winget list" returned no parseable rows.${os.EOL}` +
                `stdout (first 1000 chars): ${listResult.stdout.slice(0, 1000)}${os.EOL}` +
                `stderr (first 1000 chars): ${listResult.stderr.slice(0, 1000)}${os.EOL}`
        );
    }

    if (upgradable.some((pkg) => !/[a-zA-Z]/.test(pkg.id))) {
        await logMessage(
            `Diagnostic: "winget upgrade" produced a package id with no letters at all (likely a misparsed row).${os.EOL}` +
                `Parsed: ${JSON.stringify(upgradable)}${os.EOL}` +
                `stdout (first 1500 chars): ${upgradeResult.stdout.slice(0, 1500)}${os.EOL}`
        );
    }

    const ignoreEntries = await loadIgnoreList(ignoreFilePath);
    const removedPackages = [];

    const packages = upgradable.filter((pkg) => {
        const isIgnored = ignoreEntries.some((entry) => pkg.id.toLowerCase().includes(entry.toLowerCase()));

        if (isIgnored) {
            removedPackages.push(pkg.id);
        }
        return !isIgnored;
    });

    const removalMessages =
        removedPackages.length > 0
            ? removedPackages.map((id) => `Package is ignored: ${id}${os.EOL}`).join('')
            : `Ignore list does not contain any packages.${os.EOL}`;

    await logMessage(removalMessages);

    return {
        packages,
        totalInstalled,
        upToDateCount: totalInstalled - upgradable.length,
        ignoredCount: removedPackages.length,
    };
}

function classifyExitCode(code) {
    const normalized = (code ?? -1) >>> 0;

    if (normalized === settings.wingetExitCodes.SUCCESS) {
        return 'updated';
    }
    if (normalized === settings.wingetExitCodes.NO_APPLICABLE_UPDATE) {
        return 'no-update';
    }
    return 'failed';
}

function upgradePackage(wingetLocation, pkg, logFilePath, onProgress) {
    const command = `"${wingetLocation}" ${settings.wingetArgs.upgrade.join(' ')} --id "${pkg.id}" --source "${pkg.source}"`;
    const startedAt = Date.now();
    const logStream = createWriteStream(logFilePath, { flags: 'a' });
    const childProcess = exec(command, { timeout: settings.packageUpgradeTimeoutMs });
    let skipped = false;

    childProcess.stdin.on('error', () => {});
    childProcess.stdin.write(`y${os.EOL}y${os.EOL}`);
    childProcess.stdin.end();

    childProcess.stdout.on('data', (data) => {
        const text = data.toString();

        text.split(os.EOL).forEach((line) => {
            const trimmedLine = line.trim();
            if (isLoggableLine(trimmedLine)) {
                logStream.write(trimmedLine + os.EOL);
                if (onProgress) {
                    onProgress(trimmedLine);
                }
            }
        });
    });

    childProcess.stderr.pipe(logStream);

    const promise = new Promise((resolve) => {
        childProcess.on('exit', (code) => {
            logStream.end();
            resolve({
                id: pkg.id,
                status: skipped ? 'skipped' : classifyExitCode(code),
                durationMs: Date.now() - startedAt,
            });
        });
    });

    return {
        promise,
        skip() {
            skipped = true;
            childProcess.kill();
        },
    };
}

async function checkAndTrimLogFile(logFilePath, maxFileSizeInBytes) {
    try {
        const stats = await fs.stat(logFilePath);
        if (stats.size > maxFileSizeInBytes) {
            const logContent = await fs.readFile(logFilePath, 'utf-8');
            const blocks = logContent.split(`${os.EOL}${os.EOL}`);
            if (blocks.length > 1) {
                const trimmedLog = blocks.slice(2).join(`${os.EOL}${os.EOL}`);
                await fs.writeFile(logFilePath, trimmedLog, 'utf-8');
                logMessage(`Log file size reduced.${os.EOL}`);
            } else {
                await fs.truncate(logFilePath, 0);
            }
        }
    } catch (error) {
        console.error(`Failed to trim log file: ${error}`);
    }
}

module.exports = {
    delay,
    logMessage,
    checkAndTrimLogFile,
    discoverUpgradablePackages,
    listInstalledPackages,
    upgradePackage,
    escapeForPowerShellSingleQuotes,
};
