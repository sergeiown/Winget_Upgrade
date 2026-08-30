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
- [x] Added an old-school pseudographic splash screen on startup: a block-letter "WINGET UPGRADE" banner with the license's copyright line, drawn with a smooth half-block reveal animation and a hidden cursor.
- [x] Fixed panel content bleeding past its border on high DPI-scaled displays. "Session" and "Progress" now never scroll or wrap, and long lines in "Current operation" and "Additionally" are truncated to the terminal's actual width instead of overflowing.
- [x] Added a small gear badge to the app icon (bottom-right corner) to visually hint at the settings screen, on the taskbar/title bar icon and in both readmes.
- [x] Fixed the compiled executable showing "Bun" / "Oven" as its file description and company in Windows (Properties dialog, Task Manager's Startup tab, etc.) instead of the actual app name and author - Bun's compiler leaves its own default metadata in place unless explicitly overridden. The build now sets the product name, publisher, version, description, and copyright explicitly.
- [x] Fixed the auto-exit delay setting (never / 30s / 60s) not actually taking effect if changed while the final countdown was already running: the countdown text and timer both kept using the value that was active when the wait started instead of picking up the new choice after closing settings. The countdown now lives in the "Progress" panel and is re-read live every time settings close.
- [x] Fixed a real bug where pressing `F2` on the final "press any key to exit" screen could exit the whole program instead of opening settings - a race between the auto-exit wait and the settings hotkey. `F2` is now explicitly excluded from the "any key exits" check.
- [x] Added a settings-screen option for how long the final summary screen waits before auto-exiting (never / 30 seconds / 60 seconds), with a live countdown shown on screen; opening the settings screen during the countdown now restarts it from the top afterward instead of continuing a stale timer.
- [x] The ignore list tab now shows already-ignored packages in their own section above the rest, matched the same way the real upgrade run matches them (exact id or partial/substring match) - previously the settings screen only recognized an exact id match, so hand-written partial entries like `chrome` didn't show as checked even though they were actually being honored during upgrades.
- [x] Settings screen now also manages a subset of winget's own configuration: install scope (current user / entire machine), whether install notes are shown, whether winget's interactive prompts are allowed, and the maximum resume-attempt count - written directly to winget's `settings.json`. An Advanced tab adds two administrator-gated overrides (skip malware scan for local archive installers, continue on installer hash mismatch), each triggering a real Windows elevation (UAC) prompt when turned on, with the on-screen state always resynced from winget itself afterward rather than assumed.
- [x] Settings screen redesigned around three tabs (General, Ignore list, Advanced) navigated purely with arrow keys, Enter/Space, and Left/Right for tabs - replacing the previous fixed checkbox/radio layout that had inconsistent keyboard/mouse behavior. The ignore list gained live incremental search (just start typing) and now shows how many packages are selected out of the total instead of just a raw count.
- [x] Fixed long package ids and winget status lines overflowing past the edge of the "current operation" and "progress" panels - both now truncate to the terminal's actual width with an ellipsis instead of being cut off mid-character or wrapping unpredictably.
- [x] `F2` (Settings) is now visibly de-emphasized in the footer and does nothing at all until winget is actually detected, instead of silently failing or showing a one-off message.
- [x] Fixed the same bogus-trailing-summary-line problem again on a table narrow enough that the blank-line check wasn't reached: real table rows are now also required to have their Id/Version columns start exactly at a word boundary (matching the header's own column layout), which winget's summary sentence never does - this holds regardless of table width, blank lines, or language.
- [x] Fixed a bogus "package" (id just a stray number and a period) showing up and failing during upgrades: winget's own trailing summary line ("N upgrades available.") was being parsed as a table row on some locales once the actual English/Russian column text stopped being what excluded it. The parser now stops at the blank line that separates the table from that summary instead of skipping past it, which also removes the last bit of English-specific text matching from the whole parser.
- [x] Changing the ignore list from the settings screen now restarts the current session (fresh discovery and a fresh upgrade queue) instead of finishing out the stale pre-edit package list.
- [x] Fixed the "current operation" panel's text overflowing past its own border once it had more lines than fit - it now keeps only as many lines as the panel can actually show instead of relying on the underlying widget's own scrolling.
- [x] The terminal window title is now just "Winget Upgrade" - the version number was already shown inside the app itself, so the title bar was duplicating it.
- [x] Confirming "yes" on the still-running-upgrade exit prompt now exits with code 0, not 1 - some terminals (e.g. Windows Terminal's default close-on-exit setting) only auto-close the window on a zero exit code, so the window could stay open after a deliberate, successful exit.
- [x] Fixed all-zero counters again on non-English-locale systems: the previous header fix still matched against the literal English column names ("Id", "Version"), which winget itself localizes (e.g. "ИД", "Версия" on a Russian-locale machine). Header detection now locates the (unlocalized) row of dashes below the header and reads column positions from the header's word order instead of specific label text - confirmed against a real Russian-locale log.
- [x] Added a settings-screen language switch (Ukrainian / English, applied immediately) and made the interface follow Windows' system language by default.
- [x] Fixed a crash on every single launch of the compiled binary: a terminal-capability fallback read a data file via a path that only existed on the machine that built it (visible only once the app was actually installed and run somewhere else - not on the machine that built it). Confirmed fixed with a real install-and-self-update cycle.
- [x] Fixed a real bug where every counter (installed / up to date / to update) could silently read zero: the table-header detection required a column ("Available") that `winget list` only shows when at least one package actually has a pending update. Reproduced directly and confirmed fixed.
- [x] Fixed the winget command breaking silently when the install path contains a space (e.g. a Windows profile name with a space in it) - it was being interpolated into the command line unquoted.
- [x] Replaced the linear, scrolling console output with a full-screen console UI: dedicated panels for session state, the current operation, progress, and a scrolling event log, plus a new settings screen (`F2`) for autostart and the ignore list, `F5` to skip a package, and `Esc` to exit.
- [x] Switched the compiler from `pkg` (in maintenance mode, and unable to embed an icon into the exe) to Bun (`bun build --compile`), which embeds the app icon natively.
- [x] Replaced the self-update installer's fragile inline command with a temporary `.bat` helper, removing the command-line quoting that caused most of this project's past self-update bugs.
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
