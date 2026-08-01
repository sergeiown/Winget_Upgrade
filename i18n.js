/* Copyright (c) 2024-2026 Serhii I. Myshko
https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE */

'use strict';

const fs = require('fs');
const os = require('os');
const settings = require('./settings');

const STRINGS = {
    en: {
        footer: ' {bold}F2{/bold} Settings    {bold}F5{/bold} Skip package    {bold}Esc{/bold} Exit ',
        footerSettingsPending: ' F2 Settings    {bold}F5{/bold} Skip package    {bold}Esc{/bold} Exit ',
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
        wingetInstalled: (version) => `{green-fg}Winget ${version} is installed on the system.{/green-fg}`,
        noUpdatesFound: '{green-fg}No updates found - everything is up to date.{/green-fg}',
        packagesToUpdate: (ids) => `{bold}Packages to update:{/bold} ${ids}`,
        restartingSession: '{yellow-fg}Ignore list changed - restarting the session...{/yellow-fg}',
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
        finalMessage: (seconds) =>
            seconds
                ? `{cyan-fg}Program will automatically exit in ${seconds}s, or press any key to exit immediately.{/cyan-fg}`
                : '{cyan-fg}Press any key to exit.{/cyan-fg}',
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
        settingsCloseHint:
            '{bold}Esc{/bold} - save and close    {bold}↑/↓{/bold} - navigate, {bold}Enter{/bold}/{bold}Space{/bold} - change    {bold}←/→{/bold} - switch tabs',
        toggleHint: '{bold}Enter{/bold}/{bold}Space{/bold} - toggle',
        autostartLabel: 'Start automatically when signing in to Windows',
        loadingPackages: ' Loading the list of installed packages...',
        packagesCount: (checked, total, fileName) => ` Selected: ${checked} of ${total} - written to ${fileName}`,
        ignoredPackagesLabel: (count) => `Ignored (${count})`,
        allPackagesLabel: 'All packages',
        searchLabel: ' Search ',
        searchPlaceholder: 'Type to search...',
        languageLabel: ' Language ',
        languageUkrainian: 'Ukrainian',
        languageEnglish: 'English',
        autoCloseLabel: ' Auto-exit after finishing ',
        autoCloseNever: 'Never',
        autoClose30: '30 seconds',
        autoClose60: '60 seconds',
        tabGeneral: 'General',
        tabIgnoreList: 'Ignore list',
        tabAdvanced: 'Advanced',
        wingetSettingsUnavailable: '{yellow-fg}These settings require a newer version of winget.{/yellow-fg}',
        scopeLabel: ' Install scope ',
        scopeUser: 'Current user',
        scopeMachine: 'Entire machine',
        disableInstallNotesLabel: 'Show install notes after installation',
        interactivityLabel: 'Allow winget interactive prompts',
        maxResumesLabel: 'Max resume attempts',
        adminRequiresRights: '⚠ Changing these settings requires administrator rights.',
        localArchiveOverrideLabel: 'Skip malware scan for local archive installers',
        localArchiveOverrideWarning: 'This disables a security check - only enable it if you trust the installer source.',
        installerHashOverrideLabel: 'Continue install when the installer hash does not match',
        installerHashOverrideWarning: 'This bypasses integrity verification of the downloaded installer.',
        adminApplying: 'Requesting administrator privileges...',
        adminChangeFailed: '{yellow-fg}The change was cancelled or failed.{/yellow-fg}',
    },
    uk: {
        footer: ' {bold}F2{/bold} Налаштування    {bold}F5{/bold} Пропустити пакет    {bold}Esc{/bold} Вихід ',
        footerSettingsPending: ' F2 Налаштування    {bold}F5{/bold} Пропустити пакет    {bold}Esc{/bold} Вихід ',
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
        wingetInstalled: (version) => `{green-fg}Winget ${version} встановлено в системі.{/green-fg}`,
        noUpdatesFound: '{green-fg}Оновлень не знайдено - все актуально.{/green-fg}',
        packagesToUpdate: (ids) => `{bold}Пакети для оновлення:{/bold} ${ids}`,
        restartingSession: '{yellow-fg}Список ігнорування змінено - перезапуск сесії...{/yellow-fg}',
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
        finalMessage: (seconds) =>
            seconds
                ? `{cyan-fg}Програма автоматично завершиться через ${seconds} секунд, або натисніть будь-яку клавішу для негайного виходу.{/cyan-fg}`
                : '{cyan-fg}Натисніть будь-яку клавішу, щоб вийти.{/cyan-fg}',
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
        settingsCloseHint:
            '{bold}Esc{/bold} - зберегти й закрити    {bold}↑/↓{/bold} - навігація, {bold}Enter{/bold}/{bold}Space{/bold} - зміна    {bold}←/→{/bold} - вкладки',
        toggleHint: '{bold}Enter{/bold}/{bold}Space{/bold} - позначити',
        autostartLabel: 'Запускати автоматично при вході в Windows',
        loadingPackages: ' Завантаження списку встановлених пакетів...',
        packagesCount: (checked, total, fileName) => ` Вибрано: ${checked} з ${total} - записується у ${fileName}`,
        ignoredPackagesLabel: (count) => `Ігноровані (${count})`,
        allPackagesLabel: 'Усі пакети',
        searchLabel: ' Пошук ',
        searchPlaceholder: 'Введіть текст для пошуку...',
        languageLabel: ' Мова ',
        languageUkrainian: 'Українська',
        languageEnglish: 'English',
        autoCloseLabel: ' Автозавершення після завершення роботи ',
        autoCloseNever: 'Ніколи',
        autoClose30: '30 секунд',
        autoClose60: '60 секунд',
        tabGeneral: 'Загальні',
        tabIgnoreList: 'Ігнор-лист',
        tabAdvanced: 'Розширені',
        wingetSettingsUnavailable: '{yellow-fg}Ці налаштування потребують новішої версії winget.{/yellow-fg}',
        scopeLabel: ' Область встановлення ',
        scopeUser: 'Поточний користувач',
        scopeMachine: 'Уся машина',
        disableInstallNotesLabel: 'Показувати нотатки після встановлення',
        interactivityLabel: 'Дозволяти інтерактивні запити winget',
        maxResumesLabel: 'Максимум спроб відновлення',
        adminRequiresRights: '⚠ Зміна цих налаштувань потребує прав адміністратора.',
        localArchiveOverrideLabel: 'Пропускати перевірку на шкідливий код для локальних архівів',
        localArchiveOverrideWarning: 'Це вимикає перевірку безпеки - вмикайте, лише якщо довіряєте джерелу інсталятора.',
        installerHashOverrideLabel: 'Продовжувати встановлення при розбіжності хешу інсталятора',
        installerHashOverrideWarning: 'Це обходить перевірку цілісності завантаженого інсталятора.',
        adminApplying: 'Запит прав адміністратора...',
        adminChangeFailed: '{yellow-fg}Зміну скасовано або не вдалося застосувати.{/yellow-fg}',
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
