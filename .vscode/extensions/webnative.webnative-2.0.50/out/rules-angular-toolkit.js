"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkMigrationAngularToolkit = checkMigrationAngularToolkit;
const tip_1 = require("./tip");
const vscode_1 = require("vscode");
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * For Capacitor project if @ionic/angular-toolkit >= v6 then
 * "ionic-cordova-build" / "ionic-cordova-serve" sections in angular.json are not needed
 * Note: In Cordova projects require @ionic/cordova-builders
 * @param  {Project} project
 */
function checkMigrationAngularToolkit(project) {
    // v6 removed the "ionic-cordova-build" / "ionic-cordova-serve" sections in Angular.json
    const filename = (0, path_1.join)(project.folder, 'angular.json');
    if ((0, fs_1.existsSync)(filename)) {
        const txt = (0, fs_1.readFileSync)(filename, 'utf8');
        if (txt && txt.includes('ionic-cordova-build')) {
            project.add(new tip_1.Tip('Migrate angular.json', 'Remove Cordova configurations', tip_1.TipType.Error).setQueuedAction(fixAngularJson, filename));
        }
    }
}
async function fixAngularJson(queueFunction, filename) {
    if (!(await vscode_1.window.showErrorMessage('When using @ionic/angular-toolkit v6+ the ionic-cordova-build and ionic-cordova-serve sections in angular.json can be removed.', 'Fix angular.json')))
        return;
    queueFunction();
    const txt = (0, fs_1.readFileSync)(filename, 'utf8');
    const angular = JSON.parse(txt);
    try {
        for (const project of Object.keys(angular.projects)) {
            delete angular.projects[project].architect['ionic-cordova-build'];
            delete angular.projects[project].architect['ionic-cordova-serve'];
        }
        (0, fs_1.writeFileSync)(filename, JSON.stringify(angular, undefined, 2));
        vscode_1.window.showInformationMessage('angular.json has been migrated');
    }
    catch (err) {
        vscode_1.window.showErrorMessage('Failed to fix angular.json: ' + err);
    }
}
//# sourceMappingURL=rules-angular-toolkit.js.map