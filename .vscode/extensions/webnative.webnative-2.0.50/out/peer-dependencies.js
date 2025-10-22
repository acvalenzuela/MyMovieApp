"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPeerDependencies = checkPeerDependencies;
exports.findCompatibleVersion2 = findCompatibleVersion2;
const wn_tree_provider_1 = require("./wn-tree-provider");
const semver_1 = require("semver");
const logging_1 = require("./logging");
const node_commands_1 = require("./node-commands");
const utilities_1 = require("./utilities");
const analyzer_1 = require("./analyzer");
/**
 * Check project for dependencies that do not meet peer dependency requirements
 * @param {string} peerDependency (eg @capacitor/core)
 * @param {string} minVersion (eg 5.0.0)
 * @returns {Promise<PeerReport>}
 */
async function checkPeerDependencies(folder, peerDeps, ignoreDeps) {
    if (wn_tree_provider_1.exState.packageManager != node_commands_1.PackageManager.npm)
        return { dependencies: [], incompatible: [], commands: [] };
    const dependencies = await getDependencyConflicts(folder, peerDeps, ignoreDeps);
    const conflicts = [];
    const updates = [];
    const commands = [];
    for (const dependency of dependencies) {
        const version = await findCompatibleVersion2(dependency);
        if (version == 'latest') {
            conflicts.push(dependency);
        }
        else {
            const v = version !== null && version !== void 0 ? version : 'unsure';
            (0, logging_1.write)(`${dependency.name} will be updated to ${v}`);
            const cmd = `${dependency.name}@${v}`;
            if (updates.indexOf(cmd) == -1) {
                updates.push(cmd);
            }
        }
    }
    if (updates.length > 0) {
        commands.push((0, node_commands_1.npmInstall)(updates.join(' '), '--force'));
    }
    return { dependencies, incompatible: conflicts, commands };
}
async function getDependencyConflicts(folder, peerDeps, ignoreDeps) {
    try {
        const list = [];
        const data = await (0, utilities_1.getRunOutput)(`npm ls --depth=1 --long --json`, folder, undefined, true, true);
        const deps = JSON.parse(data);
        for (const peerDependency of peerDeps) {
            for (const key of Object.keys(deps.dependencies)) {
                for (const peer of Object.keys(deps.dependencies[key].peerDependencies)) {
                    const versionRange = deps.dependencies[key].peerDependencies[peer];
                    if (peer == peerDependency.name) {
                        if (!(0, semver_1.satisfies)(peerDependency.version, cleanRange(versionRange))) {
                            // Migration will update capacitor plugins so leave them out
                            let ignore = false;
                            for (const ignoreDep of ignoreDeps) {
                                if (key.startsWith(ignoreDep)) {
                                    ignore = true;
                                }
                            }
                            if (!ignore) {
                                list.push({ name: key, conflict: peerDependency });
                            }
                        }
                    }
                }
            }
        }
        return list;
    }
    catch (error) {
        (0, logging_1.writeWarning)(`Unable to check for dependencies that may need updating after migration.`);
        return [];
    }
}
async function getNPMInfoFor(dependency) {
    var _a;
    try {
        const pck = (await (0, utilities_1.httpRequest)('GET', 'registry.npmjs.org', `/${dependency}`));
        pck.latestVersion = (_a = pck['dist-tags']) === null || _a === void 0 ? void 0 : _a.latest;
        return pck;
    }
    catch (error) {
        // This can happen if the package is not public
        const data = await (0, utilities_1.getRunOutput)(`npm view ${dependency} --json`, wn_tree_provider_1.exState.rootFolder, undefined, true);
        const pck = JSON.parse(data);
        pck.latestVersion = pck.version;
        pck.versions[pck.latestVersion] = { peerDependencies: pck.peerDependencies };
        // NOTE: We're only looking at the latest version in this situation. This means that if your
        // project is 2 versions behind on Capacitor that it wouldnt find the right version
        return pck;
    }
}
// The semver satisfies function chokes on "> 1.0.0 && < 2.0.0" and this will return "> 1.0.0 < 2.0.0"
function cleanRange(range) {
    if (range.includes('&&')) {
        return (0, utilities_1.replaceAll)(range, '&&', '');
    }
    return range;
}
/**
 * Finds the latest release version of the plugin that is compatible with peer dependencies.
 * If hasPeer is supplied then it will look for a version that passes with that peer and version
 *
 */
async function findCompatibleVersion2(dependency) {
    var _a;
    let best;
    let incompatible = false;
    try {
        const pck = await getNPMInfoFor(dependency.name);
        const latestVersion = pck.latestVersion;
        for (const version of Object.keys(pck.versions)) {
            if (pck.versions[version].peerDependencies) {
                for (const peerDependency of Object.keys(pck.versions[version].peerDependencies)) {
                    const peerVersion = pck.versions[version].peerDependencies[peerDependency];
                    const current = (0, analyzer_1.getPackageVersion)(peerDependency);
                    let meetsNeeds = (0, semver_1.satisfies)(current.version, cleanRange(peerVersion));
                    if (dependency.conflict) {
                        if (dependency.conflict.name == peerDependency) {
                            meetsNeeds = (0, semver_1.satisfies)(dependency.conflict.version, cleanRange(peerVersion));
                        }
                        else {
                            meetsNeeds = false;
                        }
                    }
                    // Is it a real version (not nightly etc) and meets version and we have the package
                    if (!version.includes('-') && meetsNeeds) {
                        if (!best || (0, semver_1.gt)(version, best)) {
                            best = version;
                        }
                    }
                    else {
                        if (dependency.conflict) {
                            if (dependency.conflict.name == peerDependency && version == latestVersion) {
                                incompatible = true;
                                if (!best) {
                                    (0, logging_1.writeError)(`Your version of ${dependency.name} is not compatible with ${peerDependency} ${dependency.conflict.version}.`);
                                    if ((_a = pck.bugs) === null || _a === void 0 ? void 0 : _a.url) {
                                        (0, logging_1.writeWarning)(`Recommendation: File an issue with the plugin author at: ${pck.bugs.url}`);
                                    }
                                }
                            }
                        }
                        else {
                            if (version == latestVersion && !best && current) {
                                (0, logging_1.writeWarning)(`${dependency.name} requires ${peerDependency} ${peerVersion} but you have ${current}`);
                                incompatible = true;
                            }
                        }
                    }
                }
            }
        }
        if (!best) {
            best = incompatible ? 'latest' : latestVersion;
        }
    }
    catch (error) {
        (0, logging_1.writeError)(`Unable to search for a version of ${dependency.name} that works in your project`);
        console.error(error);
        best = undefined;
    }
    return best;
}
//# sourceMappingURL=peer-dependencies.js.map