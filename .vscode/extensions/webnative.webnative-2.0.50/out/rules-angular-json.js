"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAngularJson = checkAngularJson;
exports.readAngularJson = readAngularJson;
exports.writeAngularJson = writeAngularJson;
exports.fixGlobalScss = fixGlobalScss;
const tip_1 = require("./tip");
const logging_1 = require("./logging");
const wn_tree_provider_1 = require("./wn-tree-provider");
const analyzer_1 = require("./analyzer");
const capacitor_config_file_1 = require("./capacitor-config-file");
const path_1 = require("path");
const fs_1 = require("fs");
const vscode_1 = require("vscode");
const utilities_1 = require("./utilities");
const monorepo_1 = require("./monorepo");
/**
 * For Capacitor project if @angular/core >= v13 then
 * Check if aot is false in angular.json and remove it
 * Note: When Angular defaulted to AOT only the Ionic starter was not updated
 * and it misses syntax errors checked by AOT that are not in JIT
 * @param  {Project} project
 */
function checkAngularJson(project) {
    var _a, _b;
    let defaultConfiguration = undefined;
    try {
        const filename = (0, path_1.join)(project.projectFolder(), 'angular.json');
        if ((0, fs_1.existsSync)(filename)) {
            const angular = parseAngularJSON(filename);
            for (const projectName of Object.keys(angular.projects)) {
                defaultConfiguration = (_b = (_a = angular.projects[projectName].architect) === null || _a === void 0 ? void 0 : _a.build) === null || _b === void 0 ? void 0 : _b.defaultConfiguration;
                if (!wn_tree_provider_1.exState.buildConfiguration && defaultConfiguration) {
                    wn_tree_provider_1.exState.buildConfiguration = defaultConfiguration;
                }
                if (!wn_tree_provider_1.exState.project) {
                    wn_tree_provider_1.exState.project = projectName;
                }
                checkWebpackToESBuild(angular, project, projectName, filename);
                if (fixAOT(angular, project, projectName, filename))
                    break;
            }
            checkPackageManager(angular, project, filename);
        }
        if (wn_tree_provider_1.exState.project == 'app') {
            wn_tree_provider_1.exState.project = undefined;
        }
    }
    catch (e) {
        (0, logging_1.writeError)(e);
    }
}
function checkWebpackToESBuild(angular, project, projectName, filename) {
    var _a, _b;
    try {
        const builder = (_b = (_a = angular.projects[projectName].architect) === null || _a === void 0 ? void 0 : _a.build) === null || _b === void 0 ? void 0 : _b.builder;
        if (builder == '@angular-devkit/build-angular:browser' ||
            builder == '@angular-devkit/build-angular:browser-esbuild') {
            // Stable in Angular 17+
            if ((0, analyzer_1.isGreaterOrEqual)('@angular/core', '17.0.0')) {
                project.add(new tip_1.Tip('Switch to ESBuild', '', tip_1.TipType.Idea).setQueuedAction(switchESBuild, project, filename));
            }
        }
    }
    finally {
        // angular.json may change over time. Dont fail
    }
    return true;
}
function checkPackageManager(angular, project, filename) {
    var _a, _b, _c, _d;
    try {
        // Angular CLI supports yarn and pnpm
        if (project.repoType == monorepo_1.MonoRepoType.pnpm) {
            if (!((_a = angular.cli) === null || _a === void 0 ? void 0 : _a.packageManager) || ((_b = angular.cli) === null || _b === void 0 ? void 0 : _b.packageManager) !== 'pnpm') {
                project.add(new tip_1.Tip('Set Angular CLI to pnpm', '', tip_1.TipType.Idea).setQueuedAction(setAngularPackageManager, project, filename, 'pnpm'));
            }
        }
        else if (project.repoType == monorepo_1.MonoRepoType.yarn) {
            if (!((_c = angular.cli) === null || _c === void 0 ? void 0 : _c.packageManager) || ((_d = angular.cli) === null || _d === void 0 ? void 0 : _d.packageManager) !== 'pnpm') {
                project.add(new tip_1.Tip('Set Angular CLI to yarn', '', tip_1.TipType.Idea).setQueuedAction(setAngularPackageManager, project, filename, 'yarn'));
            }
        }
    }
    finally {
        // Dont fail
    }
    return true;
}
function fixAOT(angular, project, projectName, filename) {
    var _a, _b, _c;
    if (((_c = (_b = (_a = angular.projects[projectName].architect) === null || _a === void 0 ? void 0 : _a.build) === null || _b === void 0 ? void 0 : _b.options) === null || _c === void 0 ? void 0 : _c.aot) === false) {
        project.add(new tip_1.Tip('Use Default Angular Compilation', `Use Angular's recommended AOT (Ahead of Time) compilation`, tip_1.TipType.Error).setQueuedAction(fixAngularJson, filename));
        return true;
    }
    return false;
}
function readAngularJson(project) {
    try {
        const filename = (0, path_1.join)(project.folder, 'angular.json');
        if ((0, fs_1.existsSync)(filename)) {
            return parseAngularJSON(filename);
        }
        return undefined;
    }
    catch (error) {
        return undefined;
    }
}
function writeAngularJson(project, angular) {
    const filename = (0, path_1.join)(project.folder, 'angular.json');
    if ((0, fs_1.existsSync)(filename)) {
        (0, fs_1.writeFileSync)(filename, JSON.stringify(angular, null, 2));
    }
}
function parseAngularJSON(filename) {
    try {
        return JSON.parse((0, fs_1.readFileSync)(filename, 'utf8'));
    }
    catch (err) {
        // Angular json may have comments
        try {
            const txt = (0, fs_1.readFileSync)(filename, 'utf8');
            const lines = txt.split('\n');
            let tmp = '';
            for (const line of lines) {
                if (line && line.trim().startsWith('//')) {
                    // Ignore comments
                }
                else {
                    tmp += line;
                }
            }
            return JSON.parse(tmp);
        }
        catch (err) {
            (0, logging_1.writeError)(`Unable to parse angular.json: ${err}`);
        }
    }
}
async function fixAngularJson(queueFunction, filename) {
    var _a, _b, _c;
    if (!(await vscode_1.window.showErrorMessage(`Use Angular's recommended AOT (Ahead of Time) compilation? (this will find additional errors in your templates by switching from JIT to AOT compilation during development)`, 'Yes, Apply Changes'))) {
        return;
    }
    queueFunction();
    const txt = (0, fs_1.readFileSync)(filename, 'utf8');
    const angular = JSON.parse(txt);
    try {
        for (const project of Object.keys(angular.projects)) {
            (_c = (_b = (_a = angular.projects[project].architect) === null || _a === void 0 ? void 0 : _a.build) === null || _b === void 0 ? void 0 : _b.options) === null || _c === void 0 ? true : delete _c.aot;
        }
        (0, fs_1.writeFileSync)(filename, JSON.stringify(angular, undefined, 2));
    }
    catch (err) {
        vscode_1.window.showErrorMessage('Failed to fix angular.json: ' + err);
    }
}
async function setAngularPackageManager(queueFunction, project, filename, packageMangerName) {
    if (!(await vscode_1.window.showErrorMessage(`It appears you are using ${packageMangerName} but your Angular CLI is set to the default of npm. Would you like to update angular.json to use ${packageMangerName}?`, 'Yes, Apply Changes'))) {
        return;
    }
    queueFunction();
    const txt = (0, fs_1.readFileSync)(filename, 'utf8');
    const angular = JSON.parse(txt);
    try {
        if (!angular.cli) {
            angular.cli = { packageManager: packageMangerName };
        }
        else {
            angular.cli.packageManager = packageMangerName;
        }
        (0, fs_1.writeFileSync)(filename, JSON.stringify(angular, undefined, 2));
    }
    catch (err) {
        vscode_1.window.showErrorMessage('Failed to fix angular.json: ' + err);
    }
}
async function switchESBuild(queueFunction, project, filename) {
    var _a, _b, _c, _d, _e;
    const response = await vscode_1.window.showInformationMessage(`Angular 17 projects use ESBuild by default but your project is still using WebPack. Would you like to switch to ESBuild?`, 'Yes, Apply Changes', 'More Information');
    if (!response) {
        return;
    }
    if (response == 'More Information') {
        (0, utilities_1.openUri)('https://angular.io/guide/esbuild');
        return;
    }
    queueFunction();
    const txt = (0, fs_1.readFileSync)(filename, 'utf8');
    const angular = JSON.parse(txt);
    let success = false;
    try {
        for (const projectName of Object.keys(angular.projects)) {
            const builder = (_b = (_a = angular.projects[projectName].architect) === null || _a === void 0 ? void 0 : _a.build) === null || _b === void 0 ? void 0 : _b.builder;
            if (builder == '@angular-devkit/build-angular:browser' ||
                builder == '@angular-devkit/build-angular:browser-esbuild') {
                angular.projects[projectName].architect.build.builder = '@angular-devkit/build-angular:application';
                // Neen to replace "main" with "browser"
                const main = angular.projects[projectName].architect.build.options.main;
                if (main) {
                    angular.projects[projectName].architect.build.options.browser = main;
                    delete angular.projects[projectName].architect.build.options.main;
                }
                if ((_e = (_d = (_c = angular.projects[projectName].architect.serve) === null || _c === void 0 ? void 0 : _c.configurations) === null || _d === void 0 ? void 0 : _d.ci) === null || _e === void 0 ? void 0 : _e.progress) {
                    delete angular.projects[projectName].architect.serve.configurations.ci.progress;
                }
                if (angular.projects[projectName].architect.build.options.vendorChunk !== undefined) {
                    delete angular.projects[projectName].architect.build.options.vendorChunk;
                }
                if (angular.projects[projectName].architect.build.options.buildOptimizer !== undefined) {
                    delete angular.projects[projectName].architect.build.options.buildOptimizer;
                }
                if (angular.projects[projectName].architect.build.configurations) {
                    for (const projectConfig of Object.keys(angular.projects[projectName].architect.build.configurations)) {
                        if (angular.projects[projectName].architect.build.configurations[projectConfig].vendorChunk !== undefined) {
                            delete angular.projects[projectName].architect.build.configurations[projectConfig].vendorChunk;
                        }
                        if (angular.projects[projectName].architect.build.configurations[projectConfig].buildOptimizer !== undefined) {
                            delete angular.projects[projectName].architect.build.configurations[projectConfig].buildOptimizer;
                        }
                        // Migrate service worker path
                        if (angular.projects[projectName].architect.build.configurations[projectConfig].ngswConfigPath !== undefined) {
                            const ngswPath = angular.projects[projectName].architect.build.configurations[projectConfig].ngswConfigPath;
                            angular.projects[projectName].architect.build.configurations[projectConfig].serviceWorker = ngswPath;
                            delete angular.projects[projectName].architect.build.configurations[projectConfig].ngswConfigPath;
                        }
                    }
                }
                // Need to make polyfills an array:
                const polyfills = angular.projects[projectName].architect.build.options.polyfills;
                if (polyfills && !Array.isArray(polyfills)) {
                    angular.projects[projectName].architect.build.options.polyfills = [polyfills];
                }
                success = true;
                // Need to fix the output path as it adds browser as a sub folder
                const outputPath = angular.projects[projectName].architect.build.options.outputPath;
                if (outputPath) {
                    const webDir = (0, capacitor_config_file_1.getCapacitorConfigWebDir)(project.projectFolder());
                    if (!webDir) {
                        const f = (0, capacitor_config_file_1.getCapacitorConfigureFilename)(project.projectFolder());
                        (0, logging_1.writeError)(`Unable to update ${f} to append "browser" to the webDir property.`);
                    }
                    else {
                        let value = webDir;
                        if (!value.endsWith(path_1.sep)) {
                            value = (0, path_1.join)(value, 'browser'); // Angular now writes to a browser folder
                            value = value.replace(/\\/g, '/'); // On windows backslash is escape
                        }
                        (0, capacitor_config_file_1.writeCapacitorConfig)(project, [{ key: 'webDir', value }]);
                        (0, logging_1.writeWN)(`Your Capacitor config webDir was changed from "${webDir}" to "${value}"`);
                    }
                }
            }
        }
        fixGlobalScss(project);
        (0, fs_1.writeFileSync)(filename, JSON.stringify(angular, undefined, 2));
        (0, logging_1.writeWN)(`Your angular.json was modified to use ESBuild.`);
        if (success) {
            vscode_1.window.showInformationMessage(`Your project is now using ESBuild. Enjoy faster builds!`, 'OK');
        }
    }
    catch (err) {
        vscode_1.window.showErrorMessage('Failed to fix angular.json: ' + err);
    }
}
function fixGlobalScss(project) {
    try {
        const filename = (0, path_1.join)(project.projectFolder(), 'src', 'global.scss');
        if ((0, fs_1.existsSync)(filename)) {
            let txt = (0, fs_1.readFileSync)(filename, 'utf8');
            txt = (0, utilities_1.replaceAll)(txt, `@import "~@ionic/`, `@import "@ionic/`);
            txt = (0, utilities_1.replaceAll)(txt, `@import '~@ionic/`, `@import '@ionic/`);
            txt = (0, utilities_1.replaceAll)(txt, `@import "~`, `@import "`);
            txt = (0, utilities_1.replaceAll)(txt, `@import '~`, `@import '`);
            (0, fs_1.writeFileSync)(filename, txt);
            (0, logging_1.writeWN)(`Modified global.scss to use ESBuild compatible imports.`);
        }
    }
    catch (error) {
        (0, logging_1.writeError)(`Unable to write global.scss ${error}`);
    }
}
//# sourceMappingURL=rules-angular-json.js.map