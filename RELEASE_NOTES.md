## Release Notes

### Purpose
**Winget Upgrade** simplifies the update process by checking for `winget` availability and upgrading all installed programs that have an update available, with a single command. It ships as a proper per-user installer with automatic updates, and keeps a clear, colored record of everything it does.

### Key Features

- **Winget Availability Check**: Before starting the update, the program checks whether Winget is installed on the system. If Winget is not installed, the program displays an error message and stops execution, providing instructions on how to install it. Next, the program checks the version of Winget and provides upgrade instructions if it's too old.

- **Discovery-first Upgrades**: Uses `winget upgrade` to find only the packages that actually have an update available, filters out anything on the ignore list, reports how many packages are installed in total (up to date / to update / ignored - even when there's nothing to do), pauses briefly, then upgrades each package individually via `winget upgrade --id` with a live colored progress bar and ETA.

- **Ignore List**: A plain text `winget_ignore.txt` - one entry per line, matched as a case-insensitive substring, so the exact package identifier isn't required. Reachable straight from the Start Menu.

- **Installer & Autostart**: A signed, per-user Inno Setup installer (no administrator rights needed) with an "run at sign-in" task enabled by default, and Start Menu shortcuts to the app, the ignore list, and the log file.

- **Automatic Updates**: Checks GitHub for a newer release on every launch (with an animated "Checking for updates..." indicator) and, if one is found, downloads, installs and restarts automatically - no confirmation needed.

- **Logging**: Records upgrade events and errors in a `winget_upgrade.log` file kept next to the program itself, automatically truncated to stay under 256 KB.

### System Requirements

| Supported on Windows versions with winget (Windows Package Manager) support: Windows 10 Version 1809 (Build 17763) and later or Windows 11 |                       [![windows_compatibility](https://github.com/user-attachments/assets/db2b5487-b5bf-45d9-8948-48bb88162f17)](https://en.wikipedia.org/wiki/List_of_Microsoft_Windows_versions)                       |
| :--- | :---: |

### Recent Changes
- [x] After the previous release, the relaunched window after an auto-update came up as a blank black console instead of showing anything, even though the run completed successfully in the log. Since that log entry proved the app itself runs fine and this is purely a console-attachment quirk in that one launch path, added a short startup delay plus a log line recording the console's actual state (isTTY, columns, rows) - not a confirmed fix, but the next occurrence will have real data instead of another guess.
- [x] Reverted the previous release's custom retry-based relaunch helper (see below).
- [x] Discovery stats are now printed as an aligned, colored table instead of a single run-on line.
- [ ] Future plans are left to the future.

Note: the update mechanism itself (download, silent install, file replacement, and even the app's own run once launched) has been 100% reliable across extensive testing. Only the automatic relaunch/display afterward has been occasionally flaky, for a cause not yet fully pinned down - if the app doesn't visibly reopen after an update, it likely still ran; opening it manually once is a safe fallback either way.
