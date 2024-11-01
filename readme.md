# Winget Upgrade

**[EN](https://github.com/sergeiown/Winget_Upgrade/blob/main/readme.md)** | [UA](https://github.com/sergeiown/Winget_Upgrade/blob/main/readme_ua.md)

Winget Upgrader is a Node.js command line tool that automates the process of updating software on your computer using Windows Package Manager ([Winget](https://learn.microsoft.com/en-us/windows/package-manager/winget/)).

|  | Structure and appearance |
| --- | --- |
| Dependencies | ![image](https://github.com/user-attachments/assets/7101a8c0-8c15-4f11-8515-90b155c6e1b0) |
| Console appearance | ![image](https://github.com/sergeiown/Winget_Upgrade/assets/112722061/3620b5fe-daf2-4a8d-8fc9-2fcaf673c25b) |

Winget Upgrader uses Winget commands to update all software installed on your computer. It automatically checks for Winget on your system, performs the software updates, and keeps an event log for easy tracking of the process.

```
Windows Package Manager (Winget) is a package management tool for Windows that allows
you to easily install, update and uninstall software directly from the command line.
Winget allows you to update installed programs quickly and conveniently, making it
a useful tool for keeping your system up to date.
```

## Functionality

### Check for Winget availability
Before starting the update, the program checks if Winget is installed on the system. If Winget is not installed, the program displays an error and stops working.

### Updating programs
Winget Upgrader uses the `winget upgrade --all` command to upgrade all installed programs. It automatically accepts the terms of the agreement and disables interactivity so that the upgrade process is continuous.

### Logging
The program keeps a log of events in the `winget_upgrade.log` file, where it stores information about actions performed, errors and other events related to the upgrade process.
The `winget_upgrade.log` log file is saved in `%USERPROFILE%\documents\` folder.

### Limiting the size of the log
The log is automatically truncated if its size exceeds 256 KB to avoid file overflow.

## System requirements

| Supported on Windows versions with winget (Windows Package Manager) support: Windows 10 Version 1809 (Build 17763) and later or Windows 11 |                       [![windows_compatibility](https://github.com/user-attachments/assets/db2b5487-b5bf-45d9-8948-48bb88162f17)](https://en.wikipedia.org/wiki/List_of_Microsoft_Windows_versions)                       |
| :--- | :---: |

## Usage

Use the `winget_upgrade.exe` available for download in the [release](https://github.com/sergeiown/Winget_Upgrade/releases) or use an alternative method:

1. Run the program using the command `node main.js`.
2. The program will automatically check for Winget in the system.
3. If Winget is present, it will start updating the entire software.
4. The upgrade process will be displayed in the console window and written to the `%USERPROFILE%\documents\winget_upgrade.log` log file.
5. After the update is complete, the program will automatically exit in 10 seconds, or you can exit manually by pressing any key.

Additionally, you can use `start_menu_shortcut_enabler.bat`, which will add a shortcut `winget_upgrade.exe` to the Windows Start Menu which will automatically launch Winget Upgrade with the system.

## Error messages

In case of errors, the program displays the corresponding messages in the console and writes them to the log file for further analysis.

## Shutting down the program

When the program is finished updating, it automatically exits to free up system resources.

## Attached files

- `main.js`: The main program file.
- `utils.js`: Module for executing commands and logging events.
- `settings.js`: A module that contains the necessary settings for executing commands and logging events.

## License

[Copyright (c) 2024 Serhii I. Myshko](https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE)
