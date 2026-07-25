## Release Notes

### Purpose
**Winget Upgrade** simplifies the update process by checking for `winget` availability and upgrading all installed programs that have an update available, with a single command. It ships as a proper per-user installer with automatic updates, and keeps a clear, colored record of everything it does.

### Key Features

- **Winget Availability Check**: Before starting the update, the program checks whether Winget is installed on the system. If Winget is not installed, the program displays an error message and stops execution, providing instructions on how to install it. Next, the program checks the version of Winget and provides upgrade instructions if it's too old.

- **Discovery-first Upgrades**: Uses `winget upgrade` to find only the packages that actually have an update available, filters out anything on the ignore list, reports how many packages are installed in total (up to date / to update / ignored - even when there's nothing to do), pauses briefly, then upgrades each package individually via `winget upgrade --id` with a live spinner showing elapsed time and winget's own status as it downloads and installs.

- **Ignore List**: A plain text `winget_ignore.txt` - one entry per line, matched as a case-insensitive substring, so the exact package identifier isn't required. Reachable straight from the Start Menu.

- **Installer & Autostart**: A signed, per-user Inno Setup installer (no administrator rights needed) with an "run at sign-in" task enabled by default, and Start Menu shortcuts to the app, the ignore list, and the log file.

- **Automatic Updates**: Checks GitHub for a newer release on every launch (with an animated "Checking for updates..." indicator) and, if one is found, downloads the installer, runs it in silent mode (progress window shown, no prompts, no confirmation needed) and removes the downloaded installer once it's done.

- **Logging**: Records upgrade events and errors in a `winget_upgrade.log` file kept next to the program itself, automatically truncated to stay under 256 KB.

### System Requirements

| Supported on Windows versions with winget (Windows Package Manager) support: Windows 10 Version 1809 (Build 17763) and later or Windows 11 |                       [![windows_compatibility](https://github.com/user-attachments/assets/db2b5487-b5bf-45d9-8948-48bb88162f17)](https://en.wikipedia.org/wiki/List_of_Microsoft_Windows_versions)                       |
| :--- | :---: |

### Recent Changes
- [x] Removed a duplicated "Already running the latest version" line from the console when no update is available - it's still recorded in the log file, just not echoed on screen next to the same message the spinner already shows.
- [x] Auto-update installer now runs in Inno's `/SILENT` mode (progress window shown, no wizard pages or prompts) instead of the fully visible standard wizard from 2.1.1.
- [x] Fully removed the ExperimentalWarning noise: the previous fix added a listener but didn't remove Node's own default one, which kept printing it regardless.
- [x] Per-package upgrade progress actually shows something now: winget prints no percentage at all once its output is piped, so the previous progress-bar/ETA code never had any data to render. Replaced it with a live spinner showing elapsed time and winget's real status line (Downloading, Installer hash verified, etc.) as it streams in.
- [x] Removed the Node "ExperimentalWarning: The Fetch API is an experimental feature" noise that showed up on every launch.
- [x] Fixed the visible-installer self-update introduced in 2.1.1: a Windows command-line quoting mismatch (missing `windowsVerbatimArguments`, plus cmd.exe's own outer-quote stripping) made the installer silently fail to launch at all. Confirmed fixed end-to-end - the installer now opens normally, installs, and the app relaunches on the new version.
- [x] Version-only release with no other changes, needed so the already-installed 2.1.1 has a newer version to update to and can exercise its new visible-installer self-update flow.
- [x] Auto-update now runs the downloaded installer the standard way (its normal window, not hidden), instead of a fully silent install, and deletes the downloaded installer from the temp folder once it's done.
- [x] Auto-update now installs and relaunches with no confirmation prompt, and the post-update relaunch - after a rocky stretch of 2.0.x patch releases - has been confirmed working end-to-end, including a properly attached console on the relaunched instance.
- [x] Discovery reports full stats (installed / up to date / to update / ignored) as an aligned, colored table, even when there's nothing to update.
- [x] Fixed a startup crash that could close the window instantly on systems where the console doesn't support raw keyboard input.
- [x] The "Start Winget Upgrade automatically when I sign in" installer task is now checked by default on both fresh installs and upgrades.
- [ ] Future plans are left to the future.
