## Release Notes

### Purpose
**Winget Upgrade** simplifies the update process by checking for `winget` availability and upgrading all installed programs that have an update available, with a single command. It ships as a proper per-user installer with automatic updates, and shows everything it's doing in a full-screen console UI.

### Key Features

- **Winget Availability Check**: Before starting the update, the program checks whether Winget is installed on the system. If Winget is not installed, the program displays an error message and stops execution, providing instructions on how to install it. Next, the program checks the version of Winget and provides upgrade instructions if it's too old.

- **Discovery-first Upgrades**: Uses `winget upgrade` to find only the packages that actually have an update available, filters out anything on the ignore list, reports how many packages are installed in total (up to date / to update / ignored - even when there's nothing to do), pauses briefly, then upgrades each package individually via `winget upgrade --id`.

- **Full-screen Console UI**: Dedicated panels for session state, the current operation, live progress, and a scrolling event log. `F5` skips the package currently upgrading; `Esc` exits (with confirmation if an upgrade is still running).

- **Settings Screen**: `F2` opens a tabbed settings screen (General / Ignore list / Advanced), navigated entirely with arrow keys and Enter/Space - autostart, language, auto-exit delay (never / 30s / 60s, with a live countdown on the final summary screen), install scope, install notes, interactive prompts, max resume attempts, and a searchable, live-filtered ignore list that shows already-ignored packages in their own section with a selected/total counter. An Advanced tab manages two administrator-gated winget overrides (local-archive malware scan bypass, installer hash mismatch bypass), each requesting Windows elevation (UAC) when turned on.

- **Ukrainian / English UI**: The interface language follows Windows' system language (Ukrainian if the system is set to Ukrainian, English otherwise) and can be changed at any time from the settings screen - no restart needed.

- **Ignore List**: A plain text `winget_ignore.txt` - one entry per line, matched as a case-insensitive substring, so the exact package identifier isn't required. Reachable straight from the Start Menu or the settings screen.

- **Installer & Autostart**: A signed, per-user Inno Setup installer (no administrator rights needed) with an "run at sign-in" task enabled by default, and Start Menu shortcuts to the app, the ignore list, and the log file. Autostart can also be toggled later from the settings screen without reinstalling.

- **Automatic Updates**: Checks GitHub for a newer release on every launch and, if one is found, downloads the installer, runs it in silent mode (progress window shown, no prompts, no confirmation needed) and removes the downloaded installer once it's done.

- **Logging**: Records upgrade events and errors in a `winget_upgrade.log` file kept next to the program itself, automatically truncated to stay under 256 KB.

### System Requirements

| Supported on Windows versions with winget (Windows Package Manager) support: Windows 10 Version 1809 (Build 17763) and later or Windows 11 |                       [![windows_compatibility](https://github.com/user-attachments/assets/db2b5487-b5bf-45d9-8948-48bb88162f17)](https://en.wikipedia.org/wiki/List_of_Microsoft_Windows_versions)                       |
| :--- | :---: |

### Recent Changes
- [x] Fixed winget commands sometimes hanging or failing to auto-update. Stuck commands now time out much sooner and trigger an automatic recovery (clearing stale processes, resetting sources, and removing a broken `msstore` source as a last resort). **Note:** if you're on 3.3.0 or 3.3.1, please reinstall manually once from the [releases page](https://github.com/sergeiown/Winget_Upgrade/releases/latest) - auto-update can't reach this fix by itself.
- [x] Added an old-school pseudographic splash screen on startup.
- [x] Fixed panel content overflowing its border on high-DPI displays.
- [x] Added a small gear badge to the app icon to visually hint at the settings screen.
- [ ] Future plans are left to the future.
