"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.peerDependencyCleanup = peerDependencyCleanup;
const vscode_1 = require("vscode");
const analyzer_1 = require("./analyzer");
const wn_tree_provider_1 = require("./wn-tree-provider");
const logging_1 = require("./logging");
const peer_dependencies_1 = require("./peer-dependencies");
const project_1 = require("./project");
const utilities_1 = require("./utilities");
async function peerDependencyCleanup(project) {
    let report;
    await (0, utilities_1.showProgress)(`Checking dependencies in your project...`, async () => {
        // Need to reload dependency list
        await (0, project_1.inspectProject)(wn_tree_provider_1.exState.rootFolder, wn_tree_provider_1.exState.context, undefined);
        const dependencies = (0, analyzer_1.getAllPackageNames)();
        const list = [];
        for (const dependency of dependencies) {
            const versionInfo = (0, analyzer_1.getPackageVersion)(dependency);
            list.push({ name: dependency, version: versionInfo.version });
        }
        report = await (0, peer_dependencies_1.checkPeerDependencies)(project.projectFolder(), list, []);
    });
    //write(JSON.stringify(report, undefined, 2));
    if (report.commands.length == 0) {
        (0, logging_1.write)(`There are no dependency conflicts.`);
        return;
    }
    (0, logging_1.write)('');
    let question = 'Would you like to fix these?';
    if (report.commands.length == 1) {
        question = `Would you like to update ${report.dependencies[0].name}?`;
    }
    if ((await vscode_1.window.showWarningMessage(`There ${isAre(report.commands.length)} ${report.commands.length} dependency conflict${plural(report.commands.length)} that can be resolved. ${question}`, 'Yes', 'No')) != 'Yes') {
        return;
    }
    for (const cmd of report.commands) {
        (0, logging_1.write)(`> ${cmd}`);
        await project.run2(cmd, true);
    }
    (0, logging_1.write)(`${report.commands.length} dependency conflict${plural(report.commands.length)} resolved.`);
}
function isAre(count) {
    return count == 1 ? 'is' : 'are';
}
function plural(count) {
    return count > 1 ? 's' : '';
}
//# sourceMappingURL=peer-dependency-cleanup.js.map