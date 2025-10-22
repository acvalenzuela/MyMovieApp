"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addScripts = addScripts;
const analyzer_1 = require("./analyzer");
const monorepo_1 = require("./monorepo");
const node_commands_1 = require("./node-commands");
const tip_1 = require("./tip");
const utilities_1 = require("./utilities");
// Look in package.json for scripts and add options to execute
function addScripts(project, isWeb) {
    const expand = !((0, analyzer_1.exists)('@capacitor/core') || (0, analyzer_1.exists)('cordova-ios') || (0, analyzer_1.exists)('cordova-android') || isWeb);
    project.setGroup(`Scripts`, `The scripts from package.json`, tip_1.TipType.Files, expand);
    addScriptsFrom((0, utilities_1.getPackageJSON)(project.projectFolder()), project);
    if (project.repoType == monorepo_1.MonoRepoType.nx) {
        addScriptsFrom((0, utilities_1.getPackageJSON)(project.folder), project);
        addNXScripts(['build', 'test', 'lint', 'e2e'], project);
    }
}
function addScriptsFrom(packages, project) {
    var _a, _b;
    if (packages.scripts) {
        for (const script of Object.keys(packages.scripts)) {
            project.add(new tip_1.Tip(niceName(script), '', tip_1.TipType.Run, '', (0, node_commands_1.npmRun)(script), `Running ${script}`, `Ran ${script}`)
                .canStop()
                .canAnimate()
                .setTooltip(`Runs 'npm run ${script}' found in package.json`));
        }
    }
    // We may be able to migrate a Capacitor Plugin
    project.isCapacitorPlugin = !!(((_a = packages.capacitor) === null || _a === void 0 ? void 0 : _a.ios) || ((_b = packages.capacitor) === null || _b === void 0 ? void 0 : _b.android));
}
function niceName(name) {
    return (0, utilities_1.toTitleCase)(name.replace(/-/g, ' '));
}
function addNXScripts(names, project) {
    for (const name of names) {
        project.add(new tip_1.Tip(`${project.monoRepo.name} ${name}`, '', tip_1.TipType.Run, '', `npx nx run ${project.monoRepo.name}:${name}`, `Running ${name}`, `Ran ${name}`));
    }
}
//# sourceMappingURL=scripts.js.map