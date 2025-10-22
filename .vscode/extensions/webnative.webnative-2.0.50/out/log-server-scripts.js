"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectScript = injectScript;
exports.removeScript = removeScript;
const fs_1 = require("fs");
const path_1 = require("path");
const analyzer_1 = require("./analyzer");
const logging_1 = require("./logging");
const node_commands_1 = require("./node-commands");
const utilities_1 = require("./utilities");
async function injectScript(folder, address, port) {
    if (!folder) {
        return true;
    }
    return await (0, utilities_1.showProgress)('Enabling Remote Logging', async () => {
        if (!(0, analyzer_1.exists)('@ionic/remote-log')) {
            (0, logging_1.writeWN)('Installing @ionic/remote-log');
            await (0, utilities_1.getRunOutput)((0, node_commands_1.npmInstall)('@ionic/remote-log'), folder);
        }
        if (hasMainTSFile(folder)) {
            return injectRemoteLog(mainTsFile(folder), `${address}:${port}`);
        }
        else if (hasIndexTsxFile(folder)) {
            return injectRemoteLog(indexTsxFile(folder), `${address}:${port}`);
        }
        return false;
    });
}
function removeScript(folder) {
    if (!folder)
        return;
    if (hasMainTSFile(folder)) {
        return rejectRemoteLog(mainTsFile(folder));
    }
    else if (hasIndexTsxFile(folder)) {
        return rejectRemoteLog(indexTsxFile(folder));
    }
    else {
        return true;
    }
}
function mainTsFile(folder) {
    return (0, path_1.join)(folder, 'src', 'main.ts');
}
function hasMainTSFile(folder) {
    return (0, fs_1.existsSync)(mainTsFile(folder));
}
function indexTsxFile(folder) {
    return (0, path_1.join)(folder, 'src', 'index.tsx');
}
function hasIndexTsxFile(folder) {
    return (0, fs_1.existsSync)(indexTsxFile(folder));
}
function hasIndexHtml(folder) {
    return (0, fs_1.existsSync)(indexHtmlFile(folder));
}
function indexHtmlFile(folder) {
    return (0, path_1.join)(folder, 'src', 'index.html');
}
function injectRemoteLog(mainTsFile, remoteUrl) {
    try {
        rejectRemoteLog(mainTsFile);
        const txt = (0, fs_1.readFileSync)(mainTsFile, 'utf8');
        const lines = txt.split('\n');
        lines.unshift(`import { initLogger } from '@ionic/remote-log'; // Ionic VS Code Extension`);
        lines.push(`initLogger('${remoteUrl}');  // Ionic VS Code Extension`);
        (0, fs_1.writeFileSync)(mainTsFile, lines.join('\n'));
        return true;
    }
    catch (error) {
        (0, logging_1.writeError)(error);
        return false;
    }
}
function rejectRemoteLog(mainTsFile) {
    try {
        const txt = (0, fs_1.readFileSync)(mainTsFile, 'utf8');
        const lines = txt.split('\n');
        const update = [];
        let changed = false;
        for (const line of lines) {
            if (line.includes(`from '@ionic/remote-log'`) || line.startsWith(`initLogger(`)) {
                changed = true;
            }
            else {
                update.push(line);
            }
        }
        if (changed) {
            (0, fs_1.writeFileSync)(mainTsFile, update.join('\n'));
        }
        return true;
    }
    catch (error) {
        (0, logging_1.writeError)(error);
        return false;
    }
}
//# sourceMappingURL=log-server-scripts.js.map