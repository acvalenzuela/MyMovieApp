"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPackageLock = hasPackageLock;
exports.getVersionsFromPackageLock = getVersionsFromPackageLock;
const path_1 = require("path");
const node_commands_1 = require("./node-commands");
const fs_1 = require("fs");
const utilities_1 = require("./utilities");
function hasPackageLock(project) {
    return (0, fs_1.existsSync)((0, path_1.join)(project.projectFolder(), 'package-lock.json'));
}
function getVersionsFromPackageLock(project) {
    if (project.packageManager != node_commands_1.PackageManager.npm)
        return undefined;
    const lockFile = (0, path_1.join)(project.projectFolder(), 'package-lock.json');
    if (!(0, fs_1.existsSync)(lockFile))
        return undefined;
    const command = `getVersionsFromPackageLock`;
    (0, utilities_1.tStart)(command);
    const txt = (0, fs_1.readFileSync)(lockFile, { encoding: 'utf8' });
    const data = JSON.parse(txt);
    const result = {};
    try {
        const packages = data.packages[''];
        for (const dep of [...Object.keys(packages.dependencies), ...Object.keys(packages.devDependencies)]) {
            const name = `node_modules/${dep}`;
            result[dep] = { version: data.packages[name].version };
        }
        (0, utilities_1.tEnd)(command);
        return { name: project.name, version: '0.0.0', dependencies: result };
    }
    catch {
        return undefined;
    }
}
//# sourceMappingURL=package-lock.js.map