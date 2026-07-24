# Winget Upgrade

**[EN](https://github.com/sergeiown/Winget_Upgrade/blob/main/readme.md)** | [UA](https://github.com/sergeiown/Winget_Upgrade/blob/main/readme_ua.md)

Winget Upgrader is a Node.js command line tool that automates the process of updating software on your computer using Windows Package Manager ([Winget](https://learn.microsoft.com/en-us/windows/package-manager/winget/)).

|  | Structure and appearance |
| --- | --- |
| Dependencies | ![image](https://github.com/user-attachments/assets/156a9109-53d5-49a4-bb1a-9bfa8c864ec4) |
| Console appearance <sup>(pre-2.0 screenshot, pending update)</sup> | ![image](https://github.com/user-attachments/assets/3bbe380f-55da-437d-aa43-f53ee7606ca0) |

Winget Upgrader uses Winget commands to update all software installed on your computer. It automatically checks for Winget on your system, performs the software updates, and keeps an event log for easy tracking of the process.

```
Windows Package Manager (Winget) is a package management tool for Windows that allows
you to easily install, update and uninstall software directly from the command line.
Winget allows you to update installed programs quickly and conveniently, making it
a useful tool for keeping your system up to date.
```

## Functionality

### 1. Checking the availability of Winget
Before starting the update, the program checks whether Winget is installed on the system. If Winget is not installed, the program displays an error message and stops execution, providing instructions on how to install it.

Next, the program checks the version of Winget. If the version of Winget is less than the one required for correct execution of commands, the program displays an error message and provides instructions on how to update Winget to the latest version via the Microsoft Store or the command line.

### 2. Upgrading programs
The Winget Upgrade program uses `winget export` to get the list of installed packages, then calls `winget upgrade --id` once per package (skipping anything on the ignore list) to update each one individually. Upgrade process:
- Automatically accepts the terms of the agreement.
- Disables interactivity, allowing the upgrade process to continue without interruption.
- Distinguishes an actual upgrade from "already up to date" and from a genuine failure, so the final summary is accurate.

### 3. Visual output
Before each package the console is cleared and a header with the package name and its position (e.g. `[3/42]`) is shown, followed by a colored, live progress bar with an ETA. Once every package has been processed, a colored summary is printed: how many packages were updated, how many were already up to date, and which ones (if any) failed.

### 4. Logging.
The program keeps a log of events in the file `winget_upgrade.log`, which stores information about:
- Actions performed.
- Errors.
- Other events related to the upgrade process.

The log file `winget_upgrade.log` is stored in the folder `%USERPROFILE%\documents\`.

### 5. Limiting the size of the log
The log is automatically truncated if its size exceeds 256 KB to avoid file overflow.

### 6. Ignore list
When the program is first launched, it generates a plain text ignore file template `winget_ignore.txt`, listing the packages that should not be updated. Each entry goes on its own line, and it doesn't need to be the exact package identifier - any part of the name or id is enough, matched case-insensitively. Lines starting with `#` are treated as comments. For example:
```
# 7zip
# Google.Chrome
7zip
chrome
```
This matches `7zip.7zip` and both `Google.Chrome` and any other package whose id contains "chrome".

If an older `winget_ignore.json` from a previous version is found, its entries are automatically migrated into `winget_ignore.txt` and the old file is kept as `winget_ignore.json.bak`.

The program logs which packages were ignored, one per line, in both the console and the log file.

### 7. Automatic updates
On every launch (at most once every 24 hours, when installed via the installer), the program checks GitHub for a newer release. If one is found, it asks for confirmation before downloading and silently installing it, then restarts automatically. Declining, or running the portable `.exe`/`node main.js` directly, simply skips the update and continues with the regular upgrade process.

## System requirements

| Supported on Windows versions with winget (Windows Package Manager) support: Windows 10 Version 1809 (Build 17763) and later or Windows 11 |                       [![windows_compatibility](https://github.com/user-attachments/assets/db2b5487-b5bf-45d9-8948-48bb88162f17)](https://en.wikipedia.org/wiki/List_of_Microsoft_Windows_versions)                       |
| :--- | :---: |

## Usage

### Installer (recommended)

Download `WingetUpgradeSetup.exe` from the [release](https://github.com/sergeiown/Winget_Upgrade/releases) page and run it:

1. The installer runs for the current user only - no administrator rights are required.
2. During installation you can leave the "Start Winget Upgrade automatically when I sign in" task checked (enabled by default) to have it run at every sign-in, or uncheck it if you'd rather launch it manually.
3. Once installed, the program can be removed at any time from "Apps & features" ("Programs and Features").

### Portable

Alternatively, use the `winget_upgrade.exe` from the release assets directly, or run the source:

1. Run the program using the command `node main.js`.
2. The program will automatically check for Winget in the system.
3. If Winget is present, it will start updating the entire software.
4. The upgrade process will be displayed in the console window and written to the `%USERPROFILE%\documents\winget_upgrade.log` log file.
5. After the update is complete, the program will automatically exit in 10 seconds, or you can exit manually by pressing any key.

For a portable copy, you can also use `start_menu_shortcut_enabler.bat`, which will add a shortcut `winget_upgrade.exe` to the Windows Start Menu which will automatically launch Winget Upgrade with the system. Automatic updates only apply to the installer-based setup.

## Error messages

In case of errors, the program displays the corresponding messages in the console and writes them to the log file for further analysis.

## Shutting down the program

When the program is finished updating, it automatically exits to free up system resources.

## Attached files

- `main.js`: The main program file.
- `utils.js`: Module for executing commands and logging events.
- `settings.js`: A module that contains the necessary settings for executing commands and logging events.
- `console_ui.js`: Module responsible for the colored console output, progress bar/ETA, and the final summary.
- `updater.js`: Module that checks GitHub for newer releases and applies them.
- `installer/winget_upgrade.iss`: Inno Setup script used to build the installer.
- `build_installer.bat`: Local/manual fallback that builds and signs `winget_upgrade.exe`, then compiles and signs the installer (the release workflow does this automatically - see below).
- `.github/workflows/release.yml`: Builds, signs, packages and publishes the release automatically.
- `start_menu_shortcut_enabler.bat`: a batch script that adds the `winget_upgrade.exe` shortcut to the Windows Start Menu or removes it if necessary (for portable use).

## Releasing (for maintainers)

Building and publishing a release is fully automated - no local Inno Setup install or manual build step is needed. Pushing a version tag (e.g. `v2.0.0`) triggers [`.github/workflows/release.yml`](.github/workflows/release.yml), which runs on a `windows-latest` GitHub Actions runner (Inno Setup 6 comes preinstalled on that image) and:

1. Builds `winget_upgrade.exe` with `pkg`.
2. Signs it with the code-signing certificate.
3. Compiles and signs `WingetUpgradeSetup.exe` with Inno Setup.
4. Publishes both files to a GitHub Release for that tag.

One-time setup: add two repository secrets under *Settings > Secrets and variables > Actions*:
- `CERTIFICATE_BASE64` - the `.pfx` certificate, base64-encoded (e.g. `[Convert]::ToBase64String([IO.File]::ReadAllBytes('certificate.pfx'))` in PowerShell).
- `CERTIFICATE_PASSWORD` - the certificate's password.

After that, releasing is just:
```
git tag v2.0.0
git push --tags
```
The workflow can also be re-run manually from the Actions tab (`workflow_dispatch`).

## License

[Copyright (c) 2024-2026 Serhii I. Myshko](https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE)
