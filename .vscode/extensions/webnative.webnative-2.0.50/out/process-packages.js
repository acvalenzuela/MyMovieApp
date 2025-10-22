"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearRefreshCache = clearRefreshCache;
exports.processPackages = processPackages;
exports.reviewPackages = reviewPackages;
exports.reviewPluginsWithHooks = reviewPluginsWithHooks;
const semver_1 = require("semver");
const tip_1 = require("./tip");
const utilities_1 = require("./utilities");
const npm_model_1 = require("./npm-model");
const node_commands_1 = require("./node-commands");
const context_variables_1 = require("./context-variables");
const path_1 = require("path");
const wn_tree_provider_1 = require("./wn-tree-provider");
const logging_1 = require("./logging");
const monorepo_1 = require("./monorepo");
const vscode_1 = require("vscode");
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const package_lock_1 = require("./package-lock");
const utils_strings_1 = require("./utils-strings");
function clearRefreshCache(context) {
    if (context) {
        for (const key of context.workspaceState.keys()) {
            if (key.startsWith((0, context_variables_1.PackageCacheOutdated)(undefined))) {
                context.workspaceState.update(key, undefined);
            }
            if (key.startsWith((0, context_variables_1.PackageCacheList)(undefined))) {
                context.workspaceState.update(key, undefined);
            }
            if (key.startsWith((0, context_variables_1.CapProjectCache)(undefined))) {
                context.workspaceState.update(key, undefined);
            }
            if (key == context_variables_1.LastManifestCheck) {
                context.workspaceState.update(key, undefined);
            }
        }
    }
    console.log('Cached data cleared');
}
async function runListPackages(project, folder, context) {
    const listOutput = (0, package_lock_1.getVersionsFromPackageLock)(project);
    if (listOutput) {
        return JSON.stringify(listOutput);
    }
    const listCmd = (0, node_commands_1.listCommand)(project);
    try {
        const shell = utilities_1.isWindows ? 'powershell.exe' : undefined;
        let data = await (0, utilities_1.getRunOutput)(listCmd, folder, shell, true);
        if (project.isModernYarn()) {
            data = (0, monorepo_1.fixModernYarnList)(data);
        }
        return data;
    }
    catch (reason) {
        (0, logging_1.write)(`> ${listCmd}`);
        (0, logging_1.writeError)(reason);
    }
}
async function processPackages(folder, allDependencies, devDependencies, context, project) {
    if (!(0, fs_1.lstatSync)(folder).isDirectory()) {
        return {};
    }
    // npm outdated only shows dependencies and not dev dependencies if the node module isn't installed
    let outdated = '[]';
    let versions = '{}';
    try {
        const packagesModified = project.modified;
        const packageModifiedLast = context.workspaceState.get((0, context_variables_1.PackageCacheModified)(project));
        outdated = context.workspaceState.get((0, context_variables_1.PackageCacheOutdated)(project));
        versions = context.workspaceState.get((0, context_variables_1.PackageCacheList)(project));
        const changed = packagesModified.toUTCString() != packageModifiedLast;
        if (changed) {
            wn_tree_provider_1.exState.syncDone = [];
        }
        if (changed || !outdated || !versions) {
            const outdatedCmd = (0, node_commands_1.outdatedCommand)(project);
            const values = await Promise.all([
                (0, utilities_1.getRunOutput)(outdatedCmd, folder, undefined, true, true)
                    .then((data) => {
                    if (project.isYarnV1()) {
                        data = (0, monorepo_1.fixYarnV1Outdated)(data, project.packageManager);
                    }
                    else if (project.isModernYarn()) {
                        data = (0, monorepo_1.fixYarnOutdated)(data, project);
                    }
                    outdated = data;
                    context.workspaceState.update((0, context_variables_1.PackageCacheOutdated)(project), outdated);
                })
                    .catch((reason) => {
                    (0, logging_1.write)(`> ${outdatedCmd}`);
                    (0, logging_1.writeError)(reason);
                }),
                runListPackages(project, folder, context),
            ]);
            versions = values[1];
            context.workspaceState.update((0, context_variables_1.PackageCacheList)(project), versions);
            context.workspaceState.update((0, context_variables_1.PackageCacheModified)(project), packagesModified.toUTCString());
        }
        else {
            // Use the cached value
            // But also get a copy of the latest packages for updating later
            const itsAGoodTime = false;
            if (itsAGoodTime) {
                (0, utilities_1.getRunOutput)((0, node_commands_1.outdatedCommand)(project), folder, undefined, true).then((outdatedFresh) => {
                    context.workspaceState.update((0, context_variables_1.PackageCacheOutdated)(project), outdatedFresh);
                    context.workspaceState.update((0, context_variables_1.PackageCacheModified)(project), packagesModified.toUTCString());
                });
                (0, utilities_1.getRunOutput)((0, node_commands_1.listCommand)(project), folder, undefined, true).then((versionsFresh) => {
                    context.workspaceState.update((0, context_variables_1.PackageCacheList)(project), versionsFresh);
                });
            }
        }
    }
    catch (err) {
        outdated = '[]';
        versions = '{}';
        if (err && err.includes('401')) {
            vscode_1.window.showInformationMessage(`Unable to run '${(0, node_commands_1.outdatedCommand)(project)}' due to authentication error. Check .npmrc`, 'OK');
        }
        if (project.isModernYarn()) {
            (0, logging_1.writeWarning)(`Modern Yarn does not have a command to review outdated package versions. Most functionality of this extension will be disabled.`);
        }
        else {
            (0, logging_1.writeError)(`Unable to run '${(0, node_commands_1.outdatedCommand)(project)}'. Try reinstalling node modules.`);
            console.error(err);
        }
    }
    // outdated is an array with:
    //  "@ionic-native/location-accuracy": { "wanted": "5.36.0", "latest": "5.36.0", "dependent": "cordova-old" }
    (0, utilities_1.tStart)('processDependencies');
    const packages = processDependencies(allDependencies, getOutdatedData(outdated), devDependencies, getListData(versions));
    (0, utilities_1.tEnd)('processDependencies');
    (0, utilities_1.tStart)('inspectPackages');
    inspectPackages(project.projectFolder() ? project.projectFolder() : folder, packages);
    (0, utilities_1.tEnd)('inspectPackages');
    return packages;
}
function getOutdatedData(outdated) {
    try {
        return JSON.parse((0, utilities_1.stripJSON)(outdated, '{'));
    }
    catch {
        return [];
    }
}
function getListData(list) {
    try {
        return JSON.parse(list);
    }
    catch {
        return { name: undefined, dependencies: undefined, version: undefined };
    }
}
function reviewPackages(packages, project) {
    if (!packages || Object.keys(packages).length == 0)
        return;
    listPackages(project, 'Packages', `Your project relies on these packages.`, packages, [npm_model_1.PackageType.Dependency]);
    listPackages(project, `Plugins`, `Your project relies on these Capacitor and Cordova plugins. Consider plugins which have not had updates in more than a year to be a candidate for replacement in favor of a plugin that is actively maintained.`, packages, [npm_model_1.PackageType.CordovaPlugin, npm_model_1.PackageType.CapacitorPlugin], tip_1.TipType.Capacitor);
    // listPackages(
    //   project,
    //   `Capacitor Plugins`,
    //   `Your project relies on these Capacitor plugins. Consider plugins which have not had updates in more than a year to be a candidate for replacement in favor of a plugin that is actively maintained.`,
    //   packages,
    //   [PackageType.CapacitorPlugin],
    //   TipType.Capacitor
    // );
}
// List any plugins that use Cordova Hooks as potential issue
function reviewPluginsWithHooks(packages) {
    const tips = [];
    // List of packages that don't need to be reported to the user because they would be dropped in a Capacitor migration
    // Using a Set for O(1) lookups instead of an array with O(n) includes() method
    const dontReportSet = new Set([
        'cordova-plugin-add-swift-support',
        'cordova-plugin-androidx',
        'cordova-plugin-androidx-adapter',
        'cordova-plugin-ionic', // Works for Capacitor
        'phonegap-plugin-push', // This has a hook for browser which is not applicable
        'cordova-plugin-push', // This has a hook for browser which is not applicable
    ]);
    if (Object.keys(packages).length == 0)
        return;
    for (const library of Object.keys(packages)) {
        if (packages[library].plugin &&
            packages[library].plugin.hasHooks &&
            !dontReportSet.has(library) && // O(1) lookup operation with Set
            !library.startsWith('@ionic-enterprise')) {
            let msg = 'contains Cordova hooks that may require manual migration to use with Capacitor.';
            if (library == 'branch-cordova-sdk') {
                msg = ' can be replaced with capacitor-branch-deep-links which is compatible with Capacitor.';
            }
            tips.push(new tip_1.Tip(library, msg, tip_1.TipType.Warning, `${library} ${msg}`, tip_1.Command.NoOp, 'OK'));
        }
        else {
            if (packages[library].version == npm_model_1.PackageVersion.Custom) {
                tips.push(new tip_1.Tip(library, `Review ${library}`, tip_1.TipType.Warning, `${library} cannot be inspected to check for Capacitor compatibility as it is a custom plugin or is a remote dependency. You will need to manually test this plugin after migration to Capacitor - the good news is that most plugins will work.`, tip_1.Command.NoOp, 'OK'));
                //
            }
        }
    }
    return tips;
}
function dateDiff(d1, d2) {
    let months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    months = months <= 0 ? 0 : months;
    let updated = `${months} months`;
    if (months == 0) {
        updated = 'Recent';
    }
    if (months >= 12) {
        updated = `${Math.trunc(months / 12)} years`;
    }
    return updated;
}
function olderThan(d1, d2, days) {
    const diff = d2.getTime() - d1.getTime();
    return diff / (1000 * 3600 * 24) > days;
}
function markIfPlugin(folder) {
    var _a, _b;
    const pkg = (0, path_1.join)(folder, 'package.json');
    if ((0, fs_1.existsSync)(pkg)) {
        try {
            const packages = JSON.parse((0, fs_1.readFileSync)(pkg, 'utf8'));
            if (((_a = packages.capacitor) === null || _a === void 0 ? void 0 : _a.ios) || ((_b = packages.capacitor) === null || _b === void 0 ? void 0 : _b.android)) {
                return true;
            }
        }
        catch {
            console.warn(`Unable to parse ${pkg}`);
            return false;
        }
    }
    return false;
}
function markDeprecated(lockFile, packages) {
    const txt = (0, fs_1.readFileSync)(lockFile, { encoding: 'utf8' });
    const data = JSON.parse(txt);
    if (!data.packages) {
        return;
    }
    for (const library of Object.keys(data.packages)) {
        const warning = data.packages[library].deprecated;
        if (warning) {
            const l = library.replace('node_modules/', '');
            if (packages[l]) {
                packages[l].deprecated = warning;
            }
        }
    }
}
function inspectPackages(folder, packages) {
    var _a;
    // Use package-lock.json for deprecated packages
    const lockFile = (0, path_1.join)(folder, 'package-lock.json');
    if ((0, fs_1.existsSync)(lockFile)) {
        markDeprecated(lockFile, packages);
    }
    // plugins
    for (const library of Object.keys(packages)) {
        const plugin = (0, path_1.join)(folder, 'node_modules', library, 'plugin.xml');
        if ((0, fs_1.existsSync)(plugin)) {
            // Cordova based
            const content = (0, fs_1.readFileSync)(plugin, 'utf8');
            packages[library].depType = npm_model_1.PackageType.CordovaPlugin;
            packages[library].plugin = processPlugin(content);
        }
        const nmFolder = folder + '/node_modules/' + library;
        let isPlugin = false;
        if ((0, fs_1.existsSync)(nmFolder)) {
            isPlugin = markIfPlugin(nmFolder);
            (0, fs_1.readdirSync)(nmFolder, { withFileTypes: true })
                .filter((dirent) => dirent.isDirectory())
                .map((dirent) => {
                const hasPlugin = markIfPlugin((0, path_1.join)(nmFolder, dirent.name));
                if (hasPlugin) {
                    isPlugin = true;
                }
            });
        }
        // Look for capacitor only as well
        if (isPlugin) {
            packages[library].depType = npm_model_1.PackageType.CapacitorPlugin;
            if (!packages[library].plugin) {
                packages[library].plugin = processPlugin('');
            }
        }
    }
    // Whether to run without inspecting every package for descriptions, updates etc
    const quick = true;
    for (const library of Object.keys(packages)) {
        // Runs a command like this to find last update and other info:
        // npm show cordova-plugin-app-version --json
        try {
            if (packages[library].version == npm_model_1.PackageVersion.Custom) {
                packages[library].updated = npm_model_1.PackageVersion.Unknown;
                packages[library].description = '';
                packages[library].isOld = true;
            }
            else {
                if (!quick) {
                    const json = (0, child_process_1.execSync)(`npm show ${library} --json`, { cwd: folder }).toString();
                    const info = JSON.parse(json);
                    const modified = new Date(info.time.modified);
                    packages[library].updated = dateDiff(modified, new Date(Date.now())); // "2020-12-10T08:56:06.108Z" -> 6 Months
                    packages[library].isOld = olderThan(modified, new Date(Date.now()), 365);
                    packages[library].url = (_a = info.repository) === null || _a === void 0 ? void 0 : _a.url; // eg git+https://github.com/sampart/cordova-plugin-app-version.git
                    packages[library].description = info.description;
                    packages[library].latest = info.version;
                }
            }
        }
        catch (err) {
            console.log(`Unable to find latest version of ${library} on npm`, err);
            packages[library].updated = npm_model_1.PackageVersion.Unknown;
            packages[library].description = '';
            packages[library].isOld = true;
        }
    }
}
function processPlugin(content) {
    const result = { androidPermissions: [], androidFeatures: [], dependentPlugins: [], hasHooks: false };
    if (content == '') {
        return result;
    }
    content = (0, utils_strings_1.setAllStringIn)(content, '<platform name="wp8">', '</platform>', '');
    content = (0, utils_strings_1.setAllStringIn)(content, '<platform name="blackberry10">', '</platform>', '');
    // Inspect plugin.xml in content and return plugin information { androidPermissions: ['android.permission.INTERNET']}
    for (const permission of findAll(content, '<uses-permission android:name="', '"')) {
        result.androidPermissions.push(permission);
    }
    for (const feature of findAll(content, '<uses-feature android:name="', '"')) {
        result.androidFeatures.push(feature);
    }
    for (const dependency of findAll(content, '<dependency id="', '"')) {
        result.dependentPlugins.push(dependency);
    }
    for (const hook of findAll(content, '<hook', '"')) {
        result.hasHooks = true;
    }
    return result;
}
function findAll(content, search, endsearch) {
    const list = Array.from(content.matchAll(new RegExp(search + '(.*?)' + endsearch, 'g')));
    const result = [];
    if (!list)
        return result;
    for (const item of list) {
        result.push(item[1]);
    }
    return result;
}
function listPackages(project, title, description, packages, depTypes, tipType) {
    var _a;
    const count = Object.keys(packages).filter((library) => {
        return depTypes.includes(packages[library].depType);
    }).length;
    if (count == 0)
        return;
    if (title) {
        project.setGroup(`${count} ${title}`, description, tipType, undefined, 'packages');
    }
    let lastScope;
    for (const library of Object.keys(packages).sort()) {
        if (depTypes.includes(packages[library].depType)) {
            let v = `${packages[library].version}`;
            let latest;
            if (v == 'null')
                v = npm_model_1.PackageVersion.Unknown;
            let url = packages[library].url;
            if (url) {
                url = url.replace('git+', '');
            }
            const scope = (0, utils_strings_1.getStringFrom)(library, '@', '/');
            if (scope != lastScope) {
                if (scope) {
                    latest = undefined;
                    if (scope == 'angular') {
                        //
                        latest = (_a = packages['@angular/core']) === null || _a === void 0 ? void 0 : _a.latest;
                    }
                    project.addSubGroup(scope, latest);
                    lastScope = scope;
                }
                else {
                    project.clearSubgroup();
                }
            }
            let libraryTitle = library;
            const type = tip_1.TipType.None;
            if (scope) {
                libraryTitle = library.substring(scope.length + 2);
            }
            if (v != packages[library].latest && packages[library].latest !== npm_model_1.PackageVersion.Unknown) {
                project.upgrade(library, libraryTitle, `${v} → ${packages[library].latest}`, v, packages[library].latest, type);
            }
            else {
                project.package(library, libraryTitle, `${v}`, type);
            }
        }
    }
    project.clearSubgroup();
}
function processDependencies(allDependencies, outdated, devDependencies, list) {
    var _a, _b, _c, _d;
    const packages = {};
    for (const library of Object.keys(allDependencies)) {
        const dep = list.dependencies ? list.dependencies[library] : undefined;
        let version = dep ? dep.version : `${(0, semver_1.coerce)(allDependencies[library])}`;
        if (((_a = allDependencies[library]) === null || _a === void 0 ? void 0 : _a.startsWith('git')) || ((_b = allDependencies[library]) === null || _b === void 0 ? void 0 : _b.startsWith('file'))) {
            version = npm_model_1.PackageVersion.Custom;
        }
        if (((_c = allDependencies[library]) === null || _c === void 0 ? void 0 : _c.startsWith('catalog:')) || ((_d = allDependencies[library]) === null || _d === void 0 ? void 0 : _d.startsWith('workspace:'))) {
            version = npm_model_1.PackageVersion.Unknown;
        }
        const recent = outdated[library];
        const wanted = recent === null || recent === void 0 ? void 0 : recent.wanted;
        const latest = (recent === null || recent === void 0 ? void 0 : recent.latest) == undefined ? version : recent.latest;
        const current = recent === null || recent === void 0 ? void 0 : recent.current;
        const isDev = devDependencies && library in devDependencies;
        packages[library] = {
            version: version,
            current: current,
            wanted: wanted,
            latest: latest,
            isDevDependency: isDev,
            depType: npm_model_1.PackageType.Dependency,
        };
        // Set to version found in package lock
        allDependencies[library] = version;
    }
    return packages;
}
//# sourceMappingURL=process-packages.js.map