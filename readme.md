# Winget Upgrade

**[EN](https://github.com/sergeiown/Winget_Upgrade/blob/main/readme.md)** | [UA](https://github.com/sergeiown/Winget_Upgrade/blob/main/readme_ua.md)

Winget Upgrader is a Node.js command line tool that automates the process of updating software on your computer using Windows Package Manager ([Winget](https://learn.microsoft.com/en-us/windows/package-manager/winget/)).

|  | Structure and appearance |
| --- | --- |
| Dependencies | ![image](https://github.com/user-attachments/assets/c0f0742d-666a-456a-9432-d6c593ceaaca) |
| Console appearance | ![image](https://github.com/user-attachments/assets/3bbe380f-55da-437d-aa43-f53ee7606ca0) |

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
The Winget Upgrade program uses the `winget export' and `winget import' commands to update all installed programs. Upgrade process:
- Automatically accepts the terms of the agreement.
- Disables interactivity, allowing the upgrade process to continue without interruption.

### 3. Logging.
The program keeps a log of events in the file `winget_upgrade.log`, which stores information about:
- Actions performed.
- Errors.
- Other events related to the upgrade process.

The log file `winget_upgrade.log` is stored in the folder `%USERPROFILE%\documents\`.

### 4. Limiting the size of the log
The log is automatically truncated if its size exceeds 256 KB to avoid file overflow. 

### 5. Dynamic creation and application of an ignore file
- When the program is first launched, it generates an ignore file template `ignore.json`, which specifies the packages that do not need to be updated. The user has the opportunity to add all the necessary packages, it should be noted that ***package names are case sensitive***. The template has the following structure:
  ```json
  {
    "Packages": [
      {
        "name": "REPLACE_WITH_PACKAGE_NAME"
      },
      {
        "name": "REPLACE_WITH_PACKAGE_NAME"
      }
    ]
  }
  ```
- Once created the program tries to apply this ignore file. If the structure of the ignore file is invalid the program displays a warning message.

- The program displays information about packets that are ignored in the console and log, forming messages for each packet on a new line which makes it easier to read.

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
- `start_menu_shortcut_enabler.bat`: a batch script that adds the `winget_upgrade.exe` shortcut to the Windows Start Menu or removes it if necessary.

## License

[Copyright (c) 2024 Serhii I. Myshko](https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE)
