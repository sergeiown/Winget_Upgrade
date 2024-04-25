'use strict';

const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');

function checkForWinget(logFilePath) {
    const wingetCheckCommand = 'cmd /c winget --version';

    exec(wingetCheckCommand, (error) => {
        if (error) {
            console.error('Error: winget is not installed on this system.');

            fs.appendFileSync(logFilePath, `${os.EOL}>> ${new Date().toLocaleString()}${os.EOL}`);
            fs.appendFileSync(logFilePath, 'Error: winget is not installed on this system.');
            process.exit(1);
        } else {
            console.log('Winget is installed on the system.');
        }
    });
}

module.exports = {
    checkForWinget,
};
