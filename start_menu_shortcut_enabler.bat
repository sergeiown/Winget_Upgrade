:: Copyright (c) 2024 Serhii I. Myshko
:: https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE

@echo off

set shortcutName=winget_upgrade
set shortcutTargetDescription=Run checking for updates
set targetPath=%CD%\winget_upgrade.exe
set folderPath=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set shortcutPath=%folderPath%\%shortcutName%.lnk
set iconPath=%SystemRoot%\System32\SHELL32.dll,13
set workingDirectory=%CD%
set windowStyle=1

:: WindowStyle=
:: 1 - Normal window: opens the window in a normal size and position
:: 2 - Hidden window: window is hidden, process runs in the background
:: 3 - Maximized window: opens the window maximized (full screen)
:: 4 - Normal window (same as 1): opens the window in a normal mode
:: 5 - Minimized window: opens the window minimized (in taskbar)
:: 6 - Minimized window with active focus: window is minimized, but still active
:: 7 - Minimized window (same as 5): opens the window minimized

if exist "%shortcutPath%" (
    echo The shortcut "%shortcutPath%" exists. & echo. & echo Deleting the shortcut. & echo.
    del "%shortcutPath%"
) else (
    echo The shortcut "%shortcutPath%" does not exist. & echo. & echo Creating a shortcut. & echo.
    powershell -Command "$WScript=New-Object -ComObject WScript.Shell; $Shortcut=$WScript.CreateShortcut('%shortcutPath%'); $Shortcut.TargetPath='%targetPath%'; $Shortcut.IconLocation='%iconPath%'; $Shortcut.WorkingDirectory='%workingDirectory%'; $Shortcut.Description='%shortcutTargetDescription%'; $Shortcut.WindowStyle=%windowStyle%; $Shortcut.Save()"
)

echo The operation is complete. & echo. & pause



