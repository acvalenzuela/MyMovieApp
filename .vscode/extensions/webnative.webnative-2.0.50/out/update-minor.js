"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMinorDependencies = updateMinorDependencies;
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const logging_1 = require("./logging");
const node_commands_1 = require("./node-commands");
const utilities_1 = require("./utilities");
const monorepo_1 = require("./monorepo");
const vscode_1 = require("vscode");
async function updateMinorDependencies(queueFunction, project, packages) {
    const channel = (0, logging_1.clearOutput)();
    try {
        (0, logging_1.writeWN)(`Checking for minor updates for ${Object.keys(packages).length} dependencies`);
        const pkg = { dependencies: {}, name: 'tmp', license: 'MIT' };
        for (const library of Object.keys(packages).sort()) {
            pkg.dependencies[library] = `^${packages[library].version}`;
        }
        const tmpDir = (0, fs_1.mkdtempSync)((0, path_1.join)((0, os_1.tmpdir)(), 'vscode.ionic.ext'));
        const tmpFile = (0, path_1.join)(tmpDir, 'package.json');
        (0, fs_1.writeFileSync)(tmpFile, JSON.stringify(pkg, undefined, 2));
        let count = 0;
        let updates = [];
        await (0, utilities_1.showProgress)('Checking dependencies....', async () => {
            if (project.packageManager == node_commands_1.PackageManager.yarn && project.isYarnV1()) {
                updates = await addForYarn(packages, tmpDir, channel);
            }
            else {
                updates = await addForPackageManager(project, packages, tmpDir, channel);
            }
            count = updates.length;
            (0, fs_1.rmSync)(tmpFile);
        });
        if (count == 0) {
            const msg = 'All dependencies are on the latest minor update.';
            (0, logging_1.writeWN)(msg);
            vscode_1.window.showInformationMessage(msg, 'OK');
            return;
        }
        const result = await vscode_1.window.showInformationMessage(`Update all ${count} dependencies?`, 'Update', 'Cancel');
        if (!result || result == 'Cancel')
            return;
        let updated = 0;
        await (0, utilities_1.showProgress)('Updating Dependencies', async () => {
            queueFunction();
            for (const update of updates) {
                const cmd = (0, node_commands_1.npmInstall)(`${update}`);
                channel.appendLine(`> ${cmd}`);
                if (!(await run2(project, cmd))) {
                    channel.appendLine(`[Error] Failed to update ${update}`);
                }
                else {
                    channel.appendLine(`Updated ${update}`);
                    updated++;
                }
            }
            vscode_1.window.showInformationMessage(`${updated}/${count} Dependencies were updated.`, 'Ok');
        });
    }
    catch (error) {
        (0, logging_1.writeError)(error);
    }
}
async function addForPackageManager(project, packages, tmpDir, channel) {
    let data = await (0, utilities_1.getRunOutput)((0, node_commands_1.outdatedCommand)(project), tmpDir, undefined, true);
    if (project.isYarnV1()) {
        data = (0, monorepo_1.fixYarnV1Outdated)(data, project.packageManager);
    }
    if (project.isModernYarn()) {
        (0, logging_1.writeWarning)(`This feature is not available with yarn ${project.yarnVersion}`);
        return [];
    }
    const updates = [];
    try {
        const out = JSON.parse(data);
        for (const library of Object.keys(packages).sort()) {
            const dep = out[library];
            if (dep && packages[library].version !== dep.wanted) {
                channel.appendLine(`${library} ${packages[library].version} → ${dep.wanted}`);
                updates.push(`${library}@${dep.wanted}`);
            }
        }
    }
    catch {
        (0, logging_1.writeError)(`${(0, node_commands_1.outdatedCommand)(project)} returned invalid json.`);
        (0, logging_1.writeError)(data);
    }
    return updates;
}
async function addForYarn(packages, tmpDir, channel) {
    (0, logging_1.writeWN)(`This may take a moment (as you are using yarn)`);
    await (0, utilities_1.getRunOutput)((0, node_commands_1.npmInstallAll)(), tmpDir);
    const data = await (0, utilities_1.getRunOutput)('yarn list --depth=0', tmpDir);
    const lines = data.split('\n');
    const updates = [];
    for (const line of lines) {
        if (line.startsWith('└─ ') || line.startsWith('├─ ')) {
            const kv = line.split('@');
            let dependency = kv[0];
            let version = kv[1];
            if (kv.length == 3) {
                dependency = `@${kv[1]}`;
                version = kv[2];
            }
            if (packages[dependency]) {
                if (packages[dependency].version !== version) {
                    channel.appendLine(`${dependency} ${packages[dependency].version} → ${version}`);
                    updates.push(`${dependency}@${version}`);
                }
            }
            else {
                // Yarn lists a lot of dependencies of dependencies even though depth is 0
            }
        }
    }
    return updates;
}
async function run2(project, command) {
    const result = { output: '', success: false };
    try {
        await (0, utilities_1.run)(project.projectFolder(), command, undefined, [], [], undefined, undefined, result, false);
        return result.success;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=update-minor.js.map