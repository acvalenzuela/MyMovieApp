"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkBrowsersList = checkBrowsersList;
const tip_1 = require("./tip");
const logging_1 = require("./logging");
const utilities_1 = require("./utilities");
const wn_tree_provider_1 = require("./wn-tree-provider");
const ignore_1 = require("./ignore");
const analyzer_1 = require("./analyzer");
const fs_1 = require("fs");
const vscode_1 = require("vscode");
const path_1 = require("path");
const monorepo_1 = require("./monorepo");
function checkBrowsersList(project) {
    try {
        // Is browserslist in the package.json
        if ((0, analyzer_1.browsersList)().length > 0) {
            if ((0, analyzer_1.browsersList)().includes('> 0.5%') || (0, analyzer_1.browsersList)().includes('last 1 version')) {
                // We've got some poor defaults
                const title = 'Fix browserslist';
                const message = 'The browserslist in package.json may cause some older devices to show a white screen due to missing polyfills.';
                project.add(new tip_1.Tip(title, '', tip_1.TipType.Idea).setQueuedAction(setBrowsersList, project, title, message).canIgnore());
                return;
            }
            return;
        }
        // Otherwise look for a browsers list file and either migrate or set it.
        let name = 'browserslist';
        const folder = project.projectFolder();
        let filename = (0, path_1.join)(folder, name);
        if (!(0, fs_1.existsSync)(filename)) {
            name = '.browserslistrc';
            filename = (0, path_1.join)(folder, name);
        }
        if ((0, analyzer_1.exists)('@angular/core')) {
            if ((0, fs_1.existsSync)(filename)) {
                // Migrate to package.json
                const title = 'Reduce Config Files';
                const message = `${name} can be moved into your package.json`;
                project.add(new tip_1.Tip(title, message, tip_1.TipType.Idea)
                    .setQueuedAction(moveFile, project, name, filename, title, message)
                    .canIgnore());
                return;
            }
            else {
                const title = 'Set Browser Support';
                const message = `Some older devices will not be supported. Updating your package.json to include browserslist will fix this.`;
                project.add(new tip_1.Tip(title, message, tip_1.TipType.Idea).setQueuedAction(setBrowsersList, project, title, message).canIgnore());
            }
        }
    }
    catch (e) {
        (0, logging_1.writeError)(e);
    }
}
function fixPackageJson(project, browsersList) {
    // Remove cordova section
    const filename = (0, monorepo_1.getPackageJSONFilename)(project.projectFolder());
    if ((0, fs_1.existsSync)(filename)) {
        const json = (0, fs_1.readFileSync)(filename, 'utf8');
        const data = JSON.parse(json);
        data.browserslist = browsersList;
        const updated = JSON.stringify(data, undefined, 2);
        (0, fs_1.writeFileSync)(filename, updated);
    }
}
async function setBrowsersList(queueFunction, project, title, message) {
    const choice = await vscode_1.window.showWarningMessage(`${message} This is typically caused by missed steps during upgrade of an Ionic Project. Do you want to replace with a good set of defaults?`, 'Yes, Apply Changes', 'Info', 'Ignore');
    if (!choice) {
        return;
    }
    try {
        if (choice == 'Ignore') {
            (0, ignore_1.ignore)(new tip_1.Tip(title, message), wn_tree_provider_1.exState.context);
            return;
        }
        if (choice == 'Info') {
            const list = (0, analyzer_1.browsersList)();
            (0, utilities_1.openUri)(`https://browsersl.ist/#q=${encodeURIComponent(list.join(','))}`);
            return;
        }
        queueFunction();
        fixPackageJson(project, defaultValues());
    }
    catch (err) {
        vscode_1.window.showErrorMessage(`Failed to fix browserslist: ${err}`);
    }
}
async function moveFile(queueFunction, project, name, filename, title, message) {
    const choice = await vscode_1.window.showInformationMessage(`The file ${name} can be moved into package.json to reduce the number of config files in your project. Would you like to do this?`, 'Yes, Apply Changes', 'Ignore');
    if (!choice) {
        return;
    }
    try {
        if (choice == 'Ignore') {
            (0, ignore_1.ignore)(new tip_1.Tip(title, message), wn_tree_provider_1.exState.context);
            return;
        }
        queueFunction();
        const txt = (0, fs_1.readFileSync)(filename, 'utf8').split(/\r?\n/);
        const lines = txt.map((line) => line.trim());
        const list = [];
        for (const line of lines) {
            if (line && !line.startsWith('#')) {
                const arg = line.split('#')[0];
                list.push(arg);
            }
        }
        fixPackageJson(project, list);
        (0, fs_1.rmSync)(filename);
    }
    catch (err) {
        vscode_1.window.showErrorMessage(`Failed to fix ${name}: ${err}`);
    }
}
function defaultValues() {
    return ['Chrome >=61', 'ChromeAndroid >=61', 'Firefox >=63', 'Firefox ESR', 'Edge >=79', 'Safari >=13', 'iOS >=13'];
}
// async function createFile(name: string, filename: string, title: string, message: string) {
//   const choice = await window.showWarningMessage(
//     `${name} is missing. It allows support of older devices (run npx browserslist). Do you want to create this file?`,
//     'Create File',
//     'Ignore'
//   );
//   if (!choice) {
//     return;
//   }
//   if (choice == 'Ignore') {
//     ignore(new Tip(title, message), ionicState.context);
//     return;
//   }
//   const replace = defaultValues();
//   writeFileSync(filename, replace.join('\n'));
// }
//# sourceMappingURL=rules-browserslist.js.map