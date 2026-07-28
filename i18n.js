/* Copyright (c) 2024-2026 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const fs = require('fs');
const os = require('os');
const settings = require('./settings');

const STRINGS = {
    en: {
        footer: ' {bold}F2{/bold} Settings    {bold}F5{/bold} Skip package    {bold}Esc{/bold} Exit ',
        exitConfirm: 'An upgrade is still running. Exit and cancel the current package?',
        errorLabel: ' Error ',
        sessionUpdating: (index, total) => `Session:  {bold}Upgrading ${index} of ${total}{/bold}`,
        sessionNoPackages: `Session:  {bold}No packages to upgrade{/bold}`,
        sessionCounts: (installed, upToDate, toUpdate, ignored) =>
            `Installed: {cyan-fg}${installed}{/cyan-fg}   ` +
            `Up to date: {white-fg}${upToDate}{/white-fg}   ` +
            `To update: {green-fg}${toUpdate}{/green-fg}   ` +
            `Ignored: {yellow-fg}${ignored}{/yellow-fg}`,
        operationLabel: ' Current operation ',
        progressLabel: ' Progress ',
        eventsLabel: ' Additionally: recent events ',
        statusUpdated: 'Updated',
        statusUpToDate: 'Up to date',
        statusFailed: 'Failed',
        statusSkipped: 'Skipped',
        summaryLine: (updated, upToDate, skipped, failed, seconds) =>
            `{bold}Summary:{/bold} Updated: {green-fg}${updated}{/green-fg}  Up to date: ${upToDate}  ` +
            `Skipped: {yellow-fg}${skipped}{/yellow-fg}  Failed: {red-fg}${failed}{/red-fg}  Time: ${seconds}s`,
        settingsUnavailable: '{yellow-fg}Settings become available once winget is detected.{/yellow-fg}',
        wingetInstalled: (version) => `{green-fg}Winget ${version} is installed on the system.{/green-fg}`,
        noUpdatesFound: '{green-fg}No updates found - everything is up to date.{/green-fg}',
        packagesToUpdate: (ids) => `{bold}Packages to update:{/bold} ${ids}`,
        wingetNotInstalled: 'Winget is not installed on this system.',
        notInstalledSolutions: `Possible solutions:
1. Make sure that winget is installed on your system and that its location is
   included in the PATH environment variable. To check, open a command prompt
   and type "winget". If the command is not recognized, add the path to the
   winget executable in the system's PATH environment variable.
2. Ensure that your Windows version supports winget (Windows 10 version 1809 or
   later, or Windows 11).
3. Install or reinstall "App Installer".
4. Check if there are any group policy restrictions or administrative settings
   preventing winget from running.`,
        outdatedVersion: (version) => `Outdated winget version (${version}).`,
        outdatedVersionInstructions: `Please update winget to continue. Instructions:
1. Open Microsoft Store and update 'App Installer' to the latest version.
2. Alternatively, run the following command in the terminal:
   winget upgrade --id Microsoft.DesktopAppInstaller -e --source msstore
3. Ensure your Windows version is Windows 10 version 1809 or later, or Windows 11.`,
        unexpectedError: (message) => `Unexpected error occurred: ${message}`,
        fatalError: (message) => `Fatal error: ${message}`,
        finalMessage: 'Program will automatically exit after 10 seconds, or press any key to exit immediately.',
        checkingForUpdates: 'Checking for updates...',
        updateCheckFailed: '{yellow-fg}Update check failed - continuing with the current version.{/yellow-fg}',
        updateCheckNoInfo: '{yellow-fg}Update check returned no usable release information.{/yellow-fg}',
        upToDateVersion: (version) => `{green-fg}You're on the latest version (${version}).{/green-fg}`,
        noInstallerAsset: (tag) => `{yellow-fg}Release ${tag} has no installer asset - skipping update.{/yellow-fg}`,
        updatingTo: (version, current) =>
            `{bold}{cyan-fg}Updating to version ${version} (current: ${current})...{/cyan-fg}{/bold}`,
        downloadingUpdate: 'Downloading update...',
        installingUpdate: 'Installing update and restarting...',
        updateFailed: '{yellow-fg}Update failed, continuing with the current version.{/yellow-fg}',
        settingsTitle: ' Settings ',
        settingsCloseHint: '{bold}Esc{/bold} - save and close    {bold}Space/Enter{/bold} - toggle package',
        autostartLabel: 'Start automatically when signing in to Windows',
        loadingPackages: ' Loading the list of installed packages...',
        packagesCount: (count, fileName) => ` Packages (${count}) - checked ones are written to ${fileName}`,
        blacklistLabel: ' Ignore list ',
        languageLabel: ' Language ',
        languageUkrainian: 'Ukrainian',
        languageEnglish: 'English',
    },
    uk: {
        footer: ' {bold}F2{/bold} Налаштування    {bold}F5{/bold} Пропустити пакет    {bold}Esc{/bold} Вихід ',
        exitConfirm: 'Оновлення ще виконується. Вийти й перервати поточний пакет?',
        errorLabel: ' Помилка ',
        sessionUpdating: (index, total) => `Стан сесії:  {bold}Оновлення ${index} з ${total}{/bold}`,
        sessionNoPackages: `Стан сесії:  {bold}Немає пакетів для оновлення{/bold}`,
        sessionCounts: (installed, upToDate, toUpdate, ignored) =>
            `Встановлено: {cyan-fg}${installed}{/cyan-fg}   ` +
            `Актуально: {white-fg}${upToDate}{/white-fg}   ` +
            `До оновлення: {green-fg}${toUpdate}{/green-fg}   ` +
            `Ігнор: {yellow-fg}${ignored}{/yellow-fg}`,
        operationLabel: ' Поточна операція ',
        progressLabel: ' Прогрес ',
        eventsLabel: ' Додатково: останні події ',
        statusUpdated: 'Оновлено',
        statusUpToDate: 'Актуально',
        statusFailed: 'Помилка',
        statusSkipped: 'Пропущено',
        summaryLine: (updated, upToDate, skipped, failed, seconds) =>
            `{bold}Підсумок:{/bold} Оновлено: {green-fg}${updated}{/green-fg}  Актуально: ${upToDate}  ` +
            `Пропущено: {yellow-fg}${skipped}{/yellow-fg}  Помилки: {red-fg}${failed}{/red-fg}  Час: ${seconds}с`,
        settingsUnavailable: '{yellow-fg}Налаштування доступні після визначення winget.{/yellow-fg}',
        wingetInstalled: (version) => `{green-fg}Winget ${version} встановлено в системі.{/green-fg}`,
        noUpdatesFound: '{green-fg}Оновлень не знайдено - все актуально.{/green-fg}',
        packagesToUpdate: (ids) => `{bold}Пакети для оновлення:{/bold} ${ids}`,
        wingetNotInstalled: 'Winget не встановлено в цій системі.',
        notInstalledSolutions: `Можливі рішення:
1. Переконайтеся, що winget встановлено у вашій системі і його розташування
   додано до змінної середовища PATH. Щоб перевірити, відкрийте командний рядок
   і введіть "winget". Якщо команда не розпізнається, додайте шлях до
   виконуваного файлу winget у змінну середовища PATH.
2. Переконайтеся, що ваша версія Windows підтримує winget (Windows 10 версії 1809
   або новіша, або Windows 11).
3. Встановіть або перевстановіть "App Installer".
4. Перевірте, чи немає обмежень групової політики або адміністративних
   налаштувань, що блокують роботу winget.`,
        outdatedVersion: (version) => `Застаріла версія winget (${version}).`,
        outdatedVersionInstructions: `Будь ласка, оновіть winget, щоб продовжити. Інструкції:
1. Відкрийте Microsoft Store і оновіть 'App Installer' до останньої версії.
2. Або виконайте таку команду в терміналі:
   winget upgrade --id Microsoft.DesktopAppInstaller -e --source msstore
3. Переконайтеся, що ваша версія Windows 10 версії 1809 або новіша, або Windows 11.`,
        unexpectedError: (message) => `Неочікувана помилка: ${message}`,
        fatalError: (message) => `Критична помилка: ${message}`,
        finalMessage: 'Програма автоматично завершиться через 10 секунд, або натисніть будь-яку клавішу для негайного виходу.',
        checkingForUpdates: 'Перевірка оновлень...',
        updateCheckFailed: '{yellow-fg}Перевірка оновлень не вдалась - продовжуємо з поточною версією.{/yellow-fg}',
        updateCheckNoInfo: '{yellow-fg}Перевірка оновлень не повернула придатної інформації.{/yellow-fg}',
        upToDateVersion: (version) => `{green-fg}У вас остання версія (${version}).{/green-fg}`,
        noInstallerAsset: (tag) => `{yellow-fg}Реліз ${tag} не має файлу інсталятора - оновлення пропущено.{/yellow-fg}`,
        updatingTo: (version, current) =>
            `{bold}{cyan-fg}Оновлення до версії ${version} (поточна: ${current})...{/cyan-fg}{/bold}`,
        downloadingUpdate: 'Завантаження оновлення...',
        installingUpdate: 'Встановлення оновлення й перезапуск...',
        updateFailed: '{yellow-fg}Оновлення не вдалось, продовжуємо з поточною версією.{/yellow-fg}',
        settingsTitle: ' Налаштування ',
        settingsCloseHint: '{bold}Esc{/bold} - зберегти й закрити    {bold}Space/Enter{/bold} - позначити пакет',
        autostartLabel: 'Запускати автоматично при вході в Windows',
        loadingPackages: ' Завантаження списку встановлених пакетів...',
        packagesCount: (count, fileName) => ` Пакети (${count}) - позначені записуються у ${fileName}`,
        blacklistLabel: ' Чорний список ',
        languageLabel: ' Мова ',
        languageUkrainian: 'Українська',
        languageEnglish: 'English',
    },
};

function detectSystemLocale() {
    try {
        return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('uk') ? 'uk' : 'en';
    } catch (error) {
        return 'en';
    }
}

function readSavedLocale() {
    try {
        const value = fs.readFileSync(settings.languageFilePath, 'utf-8').trim();
        return value === 'uk' || value === 'en' ? value : null;
    } catch (error) {
        return null;
    }
}

let currentLocale = readSavedLocale() || detectSystemLocale();
const listeners = [];

function get() {
    return STRINGS[currentLocale];
}

function getLocale() {
    return currentLocale;
}

function setLocale(locale) {
    if (locale !== 'en' && locale !== 'uk' || locale === currentLocale) {
        return;
    }

    currentLocale = locale;

    try {
        fs.writeFileSync(settings.languageFilePath, locale + os.EOL);
    } catch (error) {}

    listeners.forEach((listener) => listener());
}

function onLocaleChange(listener) {
    listeners.push(listener);
}

module.exports = { get, getLocale, setLocale, onLocaleChange };
