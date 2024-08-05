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

if exist "%shortcutPath%" (
    echo The shortcut "%shortcutPath%" exists. & echo. & echo Deleting the shortcut. & echo.
    del "%shortcutPath%"
) else (
    echo The shortcut "%shortcutPath%" does not exist. & echo. & echo Creating a shortcut. & echo.
    powershell -Command "$WScript=New-Object -ComObject WScript.Shell; $Shortcut=$WScript.CreateShortcut('%shortcutPath%'); $Shortcut.TargetPath='%targetPath%'; $Shortcut.IconLocation='%iconPath%'; $Shortcut.WorkingDirectory='%workingDirectory%'; $Shortcut.Description='%shortcutTargetDescription%'; $Shortcut.WindowStyle=1; $Shortcut.Save()"
)

:: WindowStyle=
:: 1 Normal window
:: 2 Hidden window
:: 3 Maximized window
:: 4 Normal window (again)
:: 5 Minimized window
:: 6 Minimized window with active focus
:: 7 Minimized window (again)

echo The operation is complete. & echo. & pause
