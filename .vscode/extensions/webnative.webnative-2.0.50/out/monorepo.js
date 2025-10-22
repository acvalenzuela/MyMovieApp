"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonoRepoType = void 0;
exports.checkForMonoRepo = checkForMonoRepo;
exports.isFolderBasedMonoRepo = isFolderBasedMonoRepo;
exports.getMonoRepoFolder = getMonoRepoFolder;
exports.getPackageJSONFilename = getPackageJSONFilename;
exports.getLocalFolder = getLocalFolder;
exports.fixYarnV1Outdated = fixYarnV1Outdated;
exports.fixYarnOutdated = fixYarnOutdated;
exports.fixModernYarnList = fixModernYarnList;
const analyzer_1 = require("./analyzer");
const command_name_1 = require("./command-name");
const wn_tree_provider_1 = require("./wn-tree-provider");
const monorepos_npm_1 = require("./monorepos-npm");
const monorepos_nx_1 = require("./monorepos-nx");
const context_variables_1 = require("./context-variables");
const monorepos_pnpm_1 = require("./monorepos-pnpm");
const node_commands_1 = require("./node-commands");
const monorepos_lerna_1 = require("./monorepos-lerna");
const path_1 = require("path");
const logging_1 = require("./logging");
const vscode_1 = require("vscode");
const fs_1 = require("fs");
const tip_1 = require("./tip");
const utilities_1 = require("./utilities");
const web_configuration_1 = require("./web-configuration");
var MonoRepoType;
(function (MonoRepoType) {
    MonoRepoType[MonoRepoType["none"] = 0] = "none";
    MonoRepoType[MonoRepoType["nx"] = 1] = "nx";
    MonoRepoType[MonoRepoType["turboRepo"] = 2] = "turboRepo";
    MonoRepoType[MonoRepoType["pnpm"] = 3] = "pnpm";
    MonoRepoType[MonoRepoType["lerna"] = 4] = "lerna";
    MonoRepoType[MonoRepoType["npm"] = 5] = "npm";
    MonoRepoType[MonoRepoType["yarn"] = 6] = "yarn";
    MonoRepoType[MonoRepoType["folder"] = 7] = "folder";
    MonoRepoType[MonoRepoType["bun"] = 8] = "bun";
})(MonoRepoType || (exports.MonoRepoType = MonoRepoType = {}));
/**
 * Check to see if this is a monorepo and what type.
 * @param  {Project} project
 */
async function checkForMonoRepo(project, selectedProject, context) {
    var _a;
    project.repoType = MonoRepoType.none;
    if (!selectedProject) {
        selectedProject = context.workspaceState.get('SelectedProject');
    }
    let projects = undefined;
    // Might be pnpm based
    const pw = (0, path_1.join)(project.folder, 'pnpm-workspace.yaml');
    const isPnpm = (0, fs_1.existsSync)(pw);
    if ((0, analyzer_1.exists)('@nrwl/cli') || (0, fs_1.existsSync)((0, path_1.join)(project.folder, 'nx.json'))) {
        project.repoType = MonoRepoType.nx;
        projects = await (0, monorepos_nx_1.getNXProjects)(project);
        if (!projects) {
            projects = [];
        }
        if (projects.length == 0) {
            // Standalone nx project
            projects.push({ name: 'app', folder: '', nodeModulesAtRoot: true, isNXStandalone: true });
        }
        wn_tree_provider_1.exState.projects = projects;
        wn_tree_provider_1.exState.projectsView.title = 'NX Projects';
    }
    else if (((_a = project.workspaces) === null || _a === void 0 ? void 0 : _a.length) > 0 && !isPnpm) {
        // For npm workspaces check package.json
        projects = (0, monorepos_npm_1.getNpmWorkspaceProjects)(project);
        project.repoType = MonoRepoType.npm;
        if (project.packageManager == node_commands_1.PackageManager.yarn) {
            project.repoType = MonoRepoType.yarn;
        }
        if (project.packageManager == node_commands_1.PackageManager.bun) {
            project.repoType = MonoRepoType.bun;
        }
        wn_tree_provider_1.exState.projects = projects;
        wn_tree_provider_1.exState.projectsView.title = 'Workspaces';
    }
    else {
        // See if it looks like a folder based repo
        projects = getFolderBasedProjects(project);
        if ((projects === null || projects === void 0 ? void 0 : projects.length) > 0 && !isPnpm) {
            project.repoType = MonoRepoType.folder;
            wn_tree_provider_1.exState.projectsView.title = 'Projects';
        }
        else {
            if (isPnpm) {
                project.repoType = MonoRepoType.pnpm;
                projects = (0, monorepos_pnpm_1.getPnpmWorkspaces)(project);
                wn_tree_provider_1.exState.projects = projects;
                wn_tree_provider_1.exState.projectsView.title = 'Workspaces';
            }
            else {
                // Might be lerna based
                const lerna = (0, path_1.join)(project.folder, 'lerna.json');
                if ((0, fs_1.existsSync)(lerna)) {
                    project.repoType = MonoRepoType.lerna;
                    projects = (0, monorepos_lerna_1.getLernaWorkspaces)(project);
                    wn_tree_provider_1.exState.projects = projects;
                    wn_tree_provider_1.exState.projectsView.title = 'Workspaces';
                }
            }
        }
        wn_tree_provider_1.exState.projects = projects;
    }
    if ((projects === null || projects === void 0 ? void 0 : projects.length) > 0) {
        const found = projects.find((project) => project.name == selectedProject);
        if (!found) {
            context.workspaceState.update('SelectedProject', projects[0].name);
        }
        project.monoRepo = found ? found : projects[0];
        if (!project.monoRepo) {
            project.repoType = MonoRepoType.none;
            vscode_1.window.showErrorMessage('No mono repo projects found.');
        }
        else {
            wn_tree_provider_1.exState.view.title = project.monoRepo.name;
            //  // Switch to pnpm if needed
            //  const isPnpm = fs.existsSync(path.join(projects[0].folder, 'pnpm-lock.yaml'));
            //  if (isPnpm)project.repoType = MonoRepoType.pnpm;
            project.monoRepo.localPackageJson = [
                MonoRepoType.npm,
                MonoRepoType.bun,
                MonoRepoType.folder,
                MonoRepoType.yarn,
                MonoRepoType.lerna,
                MonoRepoType.pnpm,
            ].includes(project.repoType);
            // Is the node_modules folder kept only at the root of the mono repo
            project.monoRepo.nodeModulesAtRoot = [
                MonoRepoType.npm,
                MonoRepoType.bun,
                MonoRepoType.nx,
                MonoRepoType.yarn,
            ].includes(project.repoType);
            vscode_1.commands.executeCommand(command_name_1.CommandName.ProjectsRefresh, project.monoRepo.name);
        }
    }
    wn_tree_provider_1.exState.repoType = project.repoType;
    vscode_1.commands.executeCommand(context_variables_1.VSCommand.setContext, context_variables_1.Context.isMonoRepo, project.repoType !== MonoRepoType.none);
}
/**
 * Does it looks like there are subfolders with Ionic/web apps in them
 * @param  {string} rootFolder
 * @returns boolean
 */
function isFolderBasedMonoRepo(rootFolder) {
    if (vscode_1.workspace.workspaceFolders.length > 1) {
        return vsCodeWorkSpaces();
    }
    const folders = (0, fs_1.readdirSync)(rootFolder, { withFileTypes: true })
        .filter((dir) => dir.isDirectory())
        .map((dir) => dir.name);
    const result = [];
    for (const folder of folders) {
        const packageJson = (0, path_1.join)(rootFolder, folder, 'package.json');
        if ((0, fs_1.existsSync)(packageJson)) {
            result.push({ name: folder, packageJson: packageJson, path: (0, path_1.join)(rootFolder, folder) });
        }
    }
    if (result.length == 0) {
        // It could be an ionic multi-app config file
        const configFile = (0, path_1.join)(rootFolder, 'ionic.config.json');
        if ((0, fs_1.existsSync)(configFile)) {
            const json = (0, fs_1.readFileSync)(configFile);
            const data = JSON.parse(json);
            if (data.projects) {
                for (const key of Object.keys(data.projects)) {
                    const project = data.projects[key];
                    if (project.root) {
                        const packageJson = (0, path_1.join)(rootFolder, project.root, 'package.json');
                        if ((0, fs_1.existsSync)(packageJson)) {
                            result.push({ name: project.name, packageJson: packageJson, path: (0, path_1.join)(rootFolder, project.root) });
                        }
                    }
                    else {
                        const packageJson = (0, path_1.join)(rootFolder, 'package.json');
                        if ((0, fs_1.existsSync)(packageJson)) {
                            result.push({ name: project.name, packageJson: packageJson, path: (0, path_1.join)(rootFolder) });
                        }
                    }
                }
            }
        }
    }
    return result;
}
function vsCodeWorkSpaces() {
    var _a;
    const result = [];
    const wsp = vscode_1.workspace.workspaceFile.fsPath;
    if (wsp && (0, fs_1.existsSync)(wsp)) {
        try {
            const txt = (0, fs_1.readFileSync)(wsp, 'utf-8');
            const json = JSON.parse(txt);
            if (json.folders) {
                for (const folder of json.folders) {
                    const packageJson = (0, path_1.join)((0, path_1.dirname)(wsp), folder.path, 'package.json');
                    if ((0, fs_1.existsSync)(packageJson)) {
                        let id = folder.path.replace('.', '');
                        if (id == '') {
                            id = 'give your folder a name';
                        }
                        result.push({ name: (_a = folder.name) !== null && _a !== void 0 ? _a : id, packageJson: packageJson, path: (0, path_1.join)((0, path_1.dirname)(wsp), folder.path) });
                    }
                }
                return result;
            }
        }
        catch {
            return [];
        }
    }
    // The below code only works for MacOs and crashes on Windows
    for (const ws of vscode_1.workspace.workspaceFolders) {
        const packageJson = (0, path_1.join)(ws.uri.path, 'package.json');
        if ((0, fs_1.existsSync)(packageJson)) {
            result.push({ name: ws.name, packageJson: packageJson, path: ws.uri.path });
        }
    }
    return result;
}
function getMonoRepoFolder(name, defaultFolder) {
    const found = wn_tree_provider_1.exState.projects.find((repo) => repo.name == name);
    if (!found) {
        return defaultFolder;
    }
    return found === null || found === void 0 ? void 0 : found.folder;
}
function getPackageJSONFilename(rootFolder) {
    return (0, path_1.join)(getLocalFolder(rootFolder), 'package.json');
}
function getLocalFolder(rootFolder) {
    switch (wn_tree_provider_1.exState.repoType) {
        case MonoRepoType.npm:
        case MonoRepoType.bun:
        case MonoRepoType.yarn:
        case MonoRepoType.lerna:
        case MonoRepoType.folder:
            return getMonoRepoFolder(wn_tree_provider_1.exState.workspace, rootFolder);
    }
    return rootFolder;
}
function getFolderBasedProjects(prj) {
    const projects = isFolderBasedMonoRepo(prj.folder);
    let result = [];
    let likelyFolderBasedMonoRepo = false;
    let exampleFolder = '';
    for (const project of projects) {
        const folderType = checkFolder(project.packageJson);
        if (folderType != FolderType.unknown) {
            result.push({ name: project.name, folder: project.path, isIonic: folderType == FolderType.isKnownWebProject });
        }
        if (folderType == FolderType.isKnownWebProject) {
            exampleFolder = project.path;
            likelyFolderBasedMonoRepo = true;
        }
    }
    let subFolderWarning = false;
    const rootFolderType = checkFolder((0, path_1.join)(prj.folder, 'package.json'));
    if (rootFolderType == FolderType.isKnownWebProject) {
        if (projects.length == 0 || prj.folder == projects[0].path) {
            // Sub folder is the root folder (eg ionic multi-app without a root)
        }
        else {
            // Its definitely an Ionic or Capacitor project in the root but we have sub folders that look like Ionic projects so throw error
            if (!subFolderWarning && exampleFolder != '') {
                (0, logging_1.writeWarning)(`This folder has Capacitor/Ionic dependencies but there are subfolders that do too which will be ignored (eg ${exampleFolder})`);
                subFolderWarning = true;
            }
            return [];
        }
    }
    result = result.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1));
    if (rootFolderType == FolderType.hasDependencies) {
        result.unshift({ name: 'root', folder: prj.folder, isIonic: false });
    }
    return result;
}
// Yarn outdated returns invalid json in a visual format. This fixes it and returns it in something like npm outdated
function fixYarnV1Outdated(data, packageManager) {
    if (packageManager !== node_commands_1.PackageManager.yarn) {
        return data;
    }
    const tmp = data.split('\n');
    if (tmp.length > 1) {
        return parseYarnFormat(tmp[1]);
    }
    return data;
}
function fixYarnOutdated(data, project) {
    /* npm outdated --json returns an object like this
    {
    "@angular/animations": {
      "wanted": "17.3.1",
      "latest": "17.3.1",
      "dependent": "cs-yarn4-test"
    },
    // yarn outdated --json returns an object like:
    [{"current":"17.3.1","latest":"17.3.2","name":"@angular/cli","severity":"patch","type":"devDependencies"},{"current":"7.8.1","latest":"7.8.2","name":"@ionic/angular","severity":"patch","type":"dependencies"},{"current":"7.3.0","latest":"7.3.1","name":"ionicons","severity":"patch","type":"dependencies"}]
    */
    if (data.startsWith(`Usage Error: Couldn't find a script named "outdated"`)) {
        project.setGroup('Extension', '', tip_1.TipType.WebNative, true);
        project.tip(new tip_1.Tip('Install yarn outdated plugin', '', tip_1.TipType.Idea).setQueuedAction(installYarnPlugin, project));
        return;
    }
    const items = JSON.parse(data);
    const result = {};
    for (const item of items) {
        const dep = {
            current: item.current,
            wanted: item.latest,
            latest: item.latest,
            dependent: '',
            location: '',
        };
        result[item.name] = dep;
    }
    return JSON.stringify(result);
}
async function installYarnPlugin(queueFunction, project) {
    var _a;
    const response = await vscode_1.window.showInformationMessage(`The Yarn plugin called "Outdated" is required to find the latest versions of dependencies. Install it?`, 'Yes', 'More Information');
    if (!response) {
        return;
    }
    if (response == 'More Information') {
        (0, utilities_1.openUri)('https://github.com/mskelton/yarn-plugin-outdated');
        return;
    }
    queueFunction();
    const url = ((_a = project.yarnVersion) === null || _a === void 0 ? void 0 : _a.startsWith('3'))
        ? `yarn plugin import https://go.mskelton.dev/yarn-outdated/v3`
        : `yarn plugin import https://go.mskelton.dev/yarn-outdated/v4`;
    const result = await (0, utilities_1.getRunOutput)(url, project.projectFolder());
    (0, logging_1.write)(result);
}
// Yarn list --json returns a NDJSON stream that needs to fixed
function fixModernYarnList(data) {
    const items = data.split('\n');
    if (items.length > 1) {
        //tmp[x].value = @angular-eslint/builder@npm:17.3.0
        //tmp[x].children.Version = 0.14.4
        const result = { dependencies: {} };
        for (const item of items) {
            if (item === '')
                break;
            const info = JSON.parse(item);
            const ldx = info.value.lastIndexOf('@');
            const name = info.value.substring(0, ldx);
            const dep = {
                version: info.children.Version,
                resolved: '',
            };
            result.dependencies[name] = dep;
        }
        return JSON.stringify(result);
    }
    return data;
}
function parseYarnFormat(data) {
    try {
        const out = JSON.parse(data);
        const result = {};
        if (out.data.body) {
            for (const item of out.data.body) {
                const dep = {
                    current: item[1],
                    wanted: item[2],
                    latest: item[3],
                    dependent: '',
                    location: '',
                };
                result[item[0]] = dep;
            }
        }
        return JSON.stringify(result);
    }
    catch {
        return data;
    }
}
var FolderType;
(function (FolderType) {
    FolderType[FolderType["hasDependencies"] = 0] = "hasDependencies";
    FolderType[FolderType["isKnownWebProject"] = 1] = "isKnownWebProject";
    FolderType[FolderType["unknown"] = 2] = "unknown";
})(FolderType || (FolderType = {}));
function checkFolder(filename) {
    var _a, _b;
    try {
        if (!(0, fs_1.existsSync)(filename)) {
            return FolderType.unknown;
        }
        const pck = JSON.parse((0, fs_1.readFileSync)(filename, 'utf8'));
        let isKnownWebProject = false;
        // Is it a web project or Capacitor Project
        const packages = [...web_configuration_1.webProjectPackages, '@capacitor/core', '@capacitor/ios', '@capacitor/android'];
        for (const project of packages) {
            if ((_a = pck.dependencies) === null || _a === void 0 ? void 0 : _a[project]) {
                isKnownWebProject = true;
                break;
            }
            if ((_b = pck.devDependencies) === null || _b === void 0 ? void 0 : _b[project]) {
                isKnownWebProject = true;
                break;
            }
        }
        return isKnownWebProject
            ? FolderType.isKnownWebProject
            : pck.dependencies || pck.devDependencies
                ? FolderType.hasDependencies
                : FolderType.unknown;
    }
    catch {
        return FolderType.unknown;
    }
}
//# sourceMappingURL=monorepo.js.map