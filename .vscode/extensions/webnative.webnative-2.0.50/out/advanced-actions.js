"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.advancedActions = advancedActions;
exports.removeNodeModules = removeNodeModules;
exports.runCommands = runCommands;
const node_commands_1 = require("./node-commands");
const utilities_1 = require("./utilities");
const logging_1 = require("./logging");
const analyzer_1 = require("./analyzer");
const rules_angular_json_1 = require("./rules-angular-json");
const wn_tree_provider_1 = require("./wn-tree-provider");
const ignore_1 = require("./ignore");
const command_name_1 = require("./command-name");
const vscode_1 = require("vscode");
const path_1 = require("path");
const prettier_1 = require("./prettier");
var Features;
(function (Features) {
    Features["migrateToPNPM"] = "$(find-replace) Migrate to PNPM";
    Features["migrateToBun"] = "$(find-replace) Migrate to Bun";
    Features["migrateToNX"] = "$(outline-view-icon) Migrate to NX";
    Features["reinstallNodeModules"] = "$(extensions-sync-enabled) Reinstall Node Modules";
    Features["angularESBuild"] = "$(test-view-icon) Switch from WebPack to ESBuild (experimental)";
    Features["showIgnoredRecommendations"] = "$(light-bulb) Show Ignored Recommendations";
    Features["lintAndFormat"] = "$(test-view-icon) Lint and format on commit";
    Features["newProject"] = "$(plus) New Project";
})(Features || (Features = {}));
const angularSchematics = [
    {
        name: '$(test-view-icon) Migrate to Ionic standalone components',
        minimumVersion: '14.0.0',
        description: 'This will replace IonicModule with individual Ionic components and icons in your project. Are you sure?',
        command: '',
        commandFn: migrateToAngularStandalone,
    },
    {
        name: '$(test-view-icon) Migrate to signal inputs',
        minimumVersion: '19.0.0',
        command: `npx ng generate @angular/core:signal-input-migration --interactive=false --defaults=true --path=".${path_1.sep}"`,
        description: 'This will change your @Input decorators to Signal Inputs. Are you sure?',
    },
    {
        name: '$(test-view-icon) Migrate to the built-in control flow syntax',
        minimumVersion: '17.0.0',
        description: 'This will change your Angular templates to use the new built-in control flow syntax. Are you sure?',
        command: `npx ng generate @angular/core:control-flow --interactive=false --defaults=true --path=".${path_1.sep}"`,
    },
    {
        name: '$(test-view-icon) Migrate to replace @Output with Output functions',
        minimumVersion: '19.0.0',
        description: 'This will replace your @Output decorators with Output functions. Are you sure?',
        command: `ng generate @angular/core:output-migration --interactive=false --defaults=true --path=".${path_1.sep}"`,
    },
    {
        name: '$(test-view-icon) Migrate to use inject for dependency injection',
        minimumVersion: '19.0.0',
        description: 'This will replace dependency injection to use the inject function. Are you sure?',
        command: `ng generate @angular/core:inject --interactive=false --defaults=true --path=".${path_1.sep}"`,
    },
    {
        name: '$(test-view-icon) Migrate ViewChild and ContentChild to use signals',
        minimumVersion: '19.0.0',
        description: 'This will replace @ViewChild and @ContentChild decorators with the equivalent signal query. Are you sure?',
        command: `ng generate @angular/core:signal-queries --interactive=false --defaults=true --path=".${path_1.sep}"`,
    },
];
async function advancedActions(project) {
    const picks = [];
    picks.push({ label: 'Project', kind: vscode_1.QuickPickItemKind.Separator });
    picks.push({ label: Features.newProject });
    picks.push({ label: Features.showIgnoredRecommendations });
    if (project.packageManager == node_commands_1.PackageManager.npm || project.packageManager == node_commands_1.PackageManager.bun) {
        picks.push({ label: Features.reinstallNodeModules });
    }
    picks.push({ label: 'Migrations', kind: vscode_1.QuickPickItemKind.Separator });
    if (project.packageManager == node_commands_1.PackageManager.npm) {
        picks.push({ label: Features.migrateToPNPM });
        picks.push({ label: Features.migrateToBun });
        if ((0, analyzer_1.isGreaterOrEqual)('@angular/core', '14.0.0')) {
            picks.push({ label: Features.migrateToNX });
        }
    }
    let hasAngularSchematic = false;
    for (const migration of angularSchematics) {
        if ((0, analyzer_1.isGreaterOrEqual)('@angular/core', migration.minimumVersion)) {
            if (!hasAngularSchematic) {
                picks.push({ label: 'Angular Migrations', kind: vscode_1.QuickPickItemKind.Separator });
            }
            picks.push({ label: migration.name });
            hasAngularSchematic = true;
        }
    }
    if (hasAngularSchematic) {
        picks.push({ label: '', kind: vscode_1.QuickPickItemKind.Separator });
    }
    if (!(0, analyzer_1.exists)('husky') && project.isCapacitor && (0, analyzer_1.isGreaterOrEqual)('typescript', '4.0.0')) {
        picks.push({ label: Features.lintAndFormat });
    }
    if ((0, analyzer_1.isGreaterOrEqual)('@angular-devkit/build-angular', '14.0.0')) {
        if (!(0, analyzer_1.isGreaterOrEqual)('@angular/core', '17.0.0')) {
            if (!angularUsingESBuild(project)) {
                picks.push({ label: Features.angularESBuild });
            }
        }
    }
    const selection = await vscode_1.window.showQuickPick(picks, {});
    if (!selection)
        return;
    switch (selection.label) {
        case Features.newProject:
            vscode_1.commands.executeCommand(command_name_1.CommandName.NewProject);
            break;
        case Features.migrateToPNPM:
            await runCommands(migrateToPNPM(), selection.label, project);
            break;
        case Features.migrateToBun:
            await runCommands(migrateToBun(), selection.label, project);
            break;
        case Features.migrateToNX:
            await vscode_1.window.showInformationMessage('Run the following command: npx nx init', 'OK');
            break;
        case Features.reinstallNodeModules:
            await runCommands(reinstallNodeModules(), selection.label, project);
            break;
        case Features.angularESBuild:
            switchAngularToESBuild(project);
            break;
        case Features.showIgnoredRecommendations:
            showIgnoredRecommendations();
            break;
        case Features.lintAndFormat:
            (0, prettier_1.integratePrettier)(project);
            break;
        default:
            angularSchematic(selection.label, project);
            break;
    }
}
async function angularSchematic(selection, project) {
    const migration = angularSchematics.find((migration) => selection == migration.name);
    if (!migration) {
        return;
    }
    if (!(await (0, utilities_1.confirm)(migration.description, 'Continue')))
        return;
    if (migration.commandFn) {
        await migration.commandFn(selection, project);
        return;
    }
    else {
        const commands = [migration.command];
        await runCommands(commands, selection, project);
    }
}
function migrateToPNPM() {
    return ['pnpm -v', removeNodeModules(), 'pnpm import', 'pnpm install', 'rm package-lock.json'];
}
function migrateToBun() {
    return cwd(['bun -v', removeNodeModules(), 'bun install', 'rm package-lock.json']);
}
function cwd(commands) {
    return commands.map((command) => `${command_name_1.InternalCommand.cwd}${command}`);
}
async function migrateToAngularStandalone(selection, project) {
    const commands = ['npx @ionic/angular-standalone-codemods --non-interactive'];
    if ((0, analyzer_1.isGreaterOrEqual)('@ionic/angular', '7.0.0')) {
        if ((0, analyzer_1.isLess)('@ionic/angular', '7.5.1')) {
            commands.unshift((0, node_commands_1.npmInstall)('@ionic/angular@7.5.1'));
        }
    }
    else {
        (0, logging_1.writeError)('You must be using @ionic/angular version 7 or higher.');
        return;
    }
    if ((0, analyzer_1.isLess)('ionicons', '7.2.1')) {
        commands.unshift((0, node_commands_1.npmInstall)('ionicons@latest'));
    }
    await runCommands(commands, selection, project);
}
function removeNodeModules() {
    return (0, utilities_1.isWindows)() ? 'del node_modules /S /Q' : 'rm -rf node_modules';
}
function reinstallNodeModules() {
    return cwd([removeNodeModules(), (0, node_commands_1.npmInstallAll)()]);
}
function showIgnoredRecommendations() {
    (0, ignore_1.clearIgnored)(wn_tree_provider_1.exState.context);
    vscode_1.commands.executeCommand(command_name_1.CommandName.Refresh);
}
async function runCommands(commands, title, project) {
    try {
        if (title.includes(')')) {
            title = title.substring(title.indexOf(')') + 1);
        }
        await vscode_1.window.withProgress({ location: vscode_1.ProgressLocation.Notification, title, cancellable: false }, async () => {
            await run(commands, project.folder);
        });
        (0, logging_1.writeWN)(`Completed ${title}`);
    }
    catch (err) {
        (0, logging_1.writeError)(`Failed ${title}: ${err}`);
    }
}
async function run(commands, folder) {
    for (const command of commands) {
        (0, logging_1.writeWN)((0, utilities_1.replaceAll)(command, command_name_1.InternalCommand.cwd, ''));
        try {
            (0, logging_1.write)(await (0, utilities_1.getRunOutput)(command, folder));
        }
        catch (err) {
            //writeError(err);
            break;
        }
    }
}
function angularUsingESBuild(project) {
    var _a, _b, _c;
    try {
        const angular = (0, rules_angular_json_1.readAngularJson)(project);
        for (const prj of Object.keys(angular === null || angular === void 0 ? void 0 : angular.projects)) {
            if (((_c = (_b = (_a = angular.projects[prj]) === null || _a === void 0 ? void 0 : _a.architect) === null || _b === void 0 ? void 0 : _b.build) === null || _c === void 0 ? void 0 : _c.builder) == '@angular-devkit/build-angular:browser-esbuild') {
                return true;
            }
        }
        return false;
    }
    catch (err) {
        return false;
    }
}
function switchAngularToESBuild(project) {
    var _a, _b, _c;
    const angular = (0, rules_angular_json_1.readAngularJson)(project);
    let changes = false;
    if (!angular)
        return;
    for (const prj of Object.keys(angular === null || angular === void 0 ? void 0 : angular.projects)) {
        if (((_c = (_b = (_a = angular.projects[prj]) === null || _a === void 0 ? void 0 : _a.architect) === null || _b === void 0 ? void 0 : _b.build) === null || _c === void 0 ? void 0 : _c.builder) == '@angular-devkit/build-angular:browser') {
            angular.projects[prj].architect.build.builder = '@angular-devkit/build-angular:browser-esbuild';
            changes = true;
        }
    }
    if (changes) {
        (0, rules_angular_json_1.fixGlobalScss)(project);
        (0, rules_angular_json_1.writeAngularJson)(project, angular);
        vscode_1.window.showInformationMessage(`The Angular project has been changed to esbuild. Enjoy faster builds!`, 'OK');
    }
}
//# sourceMappingURL=advanced-actions.js.map