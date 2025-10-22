"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maxAngularVersion = void 0;
exports.angularMigrate = angularMigrate;
const analyzer_1 = require("./analyzer");
const tip_1 = require("./tip");
const semver_1 = require("semver");
const node_commands_1 = require("./node-commands");
const advanced_actions_1 = require("./advanced-actions");
const vscode_1 = require("vscode");
const utilities_1 = require("./utilities");
const fs_1 = require("fs");
const logging_1 = require("./logging");
const path_1 = require("path");
const peer_dependency_cleanup_1 = require("./peer-dependency-cleanup");
// Maximum supported Angular version that we'll suggest migrating to
exports.maxAngularVersion = '20';
function angularMigrate(project, latestVersion) {
    const current = (0, analyzer_1.getPackageVersion)('@angular/core');
    let latest = (0, semver_1.coerce)(latestVersion);
    const next = current.major + 1;
    if (!latest)
        latest = current;
    if (!current)
        return;
    return new tip_1.Tip(`Migrate to Angular ${next}`, '', tip_1.TipType.Angular).setQueuedAction(migrate, project, next, current.major, current);
}
async function migrate(queueFunction, project, next, current, now) {
    const nextButton = `Update to v${next}`;
    const currentButton = `Update to latest v${current}`;
    const infoButton = 'Info';
    const result = await vscode_1.window.showInformationMessage(`Would you like to migrate from Angular ${now} to ${next}? This will use 'ng update': Make sure you have committed your code before you begin.`, infoButton, currentButton, nextButton);
    if (!result)
        return;
    switch (result) {
        case infoButton:
            (0, utilities_1.openUri)('https://angular.io/cli/update');
            break;
        case currentButton:
            await migrateTo(queueFunction, current, project);
            break;
        case nextButton:
            await migrateTo(queueFunction, next, project);
            break;
    }
    async function migrateTo(queueFunction, version, project) {
        queueFunction();
        const commands = [
            `${(0, node_commands_1.npx)(project)} ng update @angular/cli@${version} @angular/core@${version} --allow-dirty --force`,
        ];
        if ((0, analyzer_1.exists)('@angular/cdk')) {
            commands.push((0, node_commands_1.npmInstall)(`@angular/cdk@${version}`, '--force'));
        }
        if ((0, analyzer_1.exists)('@angular/pwa')) {
            commands.push((0, node_commands_1.npmInstall)(`@angular/pwa@${version}`, '--force'));
        }
        const dependencies = (0, analyzer_1.getAllPackageNames)();
        const list = [];
        for (const dependency of dependencies) {
            if (dependency.startsWith('@angular-eslint/')) {
                list.push(`${dependency}@${version}`);
            }
        }
        if (list.length > 0) {
            commands.push((0, node_commands_1.npmInstall)(list.join(' '), '--force'));
        }
        await (0, advanced_actions_1.runCommands)(commands, `Migrating to Angular ${version}`, project);
        postFixes(project, next);
        await (0, peer_dependency_cleanup_1.peerDependencyCleanup)(project);
    }
    function postFixes(project, version) {
        if (version == 17) {
            // Fix polyfills.ts
            replaceInFile((0, path_1.join)(project.projectFolder(), 'src', 'polyfills.ts'), {
                replacements: [
                    {
                        search: `import 'zone.js/dist/zone';`,
                        replace: `import 'zone.js';`,
                    },
                ],
            });
        }
        if (version >= 16) {
            replaceInFile((0, path_1.join)(project.projectFolder(), '.browserslistrc'), {
                replacements: [
                    { search: `Chrome >=60`, replace: `Chrome >=61` },
                    { search: `ChromeAndroid >=60`, replace: `ChromeAndroid >=61` },
                ],
            });
        }
    }
}
function replaceInFile(filename, options) {
    if (!(0, fs_1.existsSync)(filename)) {
        return false;
    }
    const before = (0, fs_1.readFileSync)(filename, 'utf8');
    let after = before;
    for (const replacement of options.replacements) {
        after = after.replace(replacement.search, replacement.replace);
    }
    if (before == after) {
        return false;
    }
    (0, fs_1.writeFileSync)(filename, after);
    (0, logging_1.write)(`Updated ${filename}.`);
}
//# sourceMappingURL=rules-angular-migrate.js.map