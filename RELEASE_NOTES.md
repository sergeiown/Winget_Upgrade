## Release Notes

### System Requirements

| Supported on Windows versions with winget (Windows Package Manager) support: Windows 10 Version 1809 (Build 17763) and later or Windows 11 |                       [![windows_compatibility](https://github.com/user-attachments/assets/db2b5487-b5bf-45d9-8948-48bb88162f17)](https://en.wikipedia.org/wiki/List_of_Microsoft_Windows_versions)                       |
| :--- | :---: |

### Recent Changes
- [x] Fixed the final summary always showing "0" up-to-date packages regardless of the real count.
- [x] Fixed the log and ignore-list files sometimes being written to the wrong (and inaccessible) system folder when launched at sign-in, and stray error text corrupting the console UI.
- [x] Fixed winget commands sometimes hanging or failing to auto-update. Slow commands now show a progress indicator instead of looking frozen, get more time before timing out, and trigger an automatic recovery if they do fail. **Note:** if you're on 3.3.0 or 3.3.1, please reinstall manually once from the [releases page](https://github.com/sergeiown/Winget_Upgrade/releases/latest) - auto-update can't reach this fix by itself.
- [x] Added an old-school pseudographic splash screen on startup.
- [x] Fixed panel content overflowing its border on high-DPI displays.
- [x] Added a small gear badge to the app icon to visually hint at the settings screen.
- [ ] Future plans are left to the future.
