"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Project = void 0;
exports.installPackage = installPackage;
exports.reviewProject = reviewProject;
exports.inspectProject = inspectProject;
const recommendation_1 = require("./recommendation");
const tip_1 = require("./tip");
const analyzer_1 = require("./analyzer");
const tasks_1 = require("./tasks");
const wn_tree_provider_1 = require("./wn-tree-provider");
const context_variables_1 = require("./context-variables");
const recommend_1 = require("./recommend");
const ignore_1 = require("./ignore");
const command_name_1 = require("./command-name");
const rules_angular_migrate_1 = require("./rules-angular-migrate");
const monorepo_1 = require("./monorepo");
const capacitor_platform_1 = require("./capacitor-platform");
const node_commands_1 = require("./node-commands");
const utilities_1 = require("./utilities");
const capacitor_config_file_1 = require("./capacitor-config-file");
const vscode_1 = require("vscode");
const path_1 = require("path");
const fs_1 = require("fs");
const logging_1 = require("./logging");
const features_1 = require("./features");
const fix_issue_1 = require("./features/fix-issue");
const ionic_config_1 = require("./ionic-config");
class Project {
    constructor(_name) {
        this.type = undefined;
        this.groups = [];
        this.name = _name;
        this.isCapacitorPlugin = false;
    }
    getIgnored(context) {
        this.ignored = (0, ignore_1.getIgnored)(context);
    }
    getNodeModulesFolder() {
        var _a;
        let nmf = (0, path_1.join)(this.folder, 'node_modules');
        if (this.monoRepo && !((_a = this.monoRepo) === null || _a === void 0 ? void 0 : _a.nodeModulesAtRoot)) {
            nmf = (0, path_1.join)(this.monoRepo.folder, 'node_modules');
        }
        return nmf;
    }
    // Is the capacitor platform installed and does the project folder exists
    hasCapacitorProject(platform) {
        return (0, analyzer_1.exists)(`@capacitor/${platform}`) && (0, fs_1.existsSync)((0, path_1.join)(this.projectFolder(), platform));
    }
    hasACapacitorProject() {
        return this.hasCapacitorProject(capacitor_platform_1.CapacitorPlatform.ios) || this.hasCapacitorProject(capacitor_platform_1.CapacitorPlatform.android);
    }
    isYarnV1() {
        var _a;
        return (_a = this.yarnVersion) === null || _a === void 0 ? void 0 : _a.startsWith('1.');
    }
    /**
     * This is the path the selected project (for monorepos) or the root folder
     */
    projectFolder() {
        if (this.repoType == undefined) {
            return this.folder;
        }
        switch (this.repoType) {
            case monorepo_1.MonoRepoType.none:
                return this.folder;
            case monorepo_1.MonoRepoType.bun:
            case monorepo_1.MonoRepoType.npm:
            case monorepo_1.MonoRepoType.yarn:
            case monorepo_1.MonoRepoType.lerna:
            case monorepo_1.MonoRepoType.pnpm:
            case monorepo_1.MonoRepoType.folder:
                return this.monoRepo ? this.monoRepo.folder : this.folder;
            case monorepo_1.MonoRepoType.nx:
                return this.monoRepo ? this.monoRepo.folder : this.folder;
            default:
                return (0, path_1.join)(this.folder, this.monoRepo.folder);
        }
    }
    setSubGroup(title, type, message, contextValue, expanded) {
        const tip = new tip_1.Tip(title, undefined, undefined, undefined, undefined, 'Upgrade');
        const r = new recommendation_1.Recommendation(message, undefined, title, expanded ? vscode_1.TreeItemCollapsibleState.Expanded : vscode_1.TreeItemCollapsibleState.Collapsed, undefined, tip);
        r.children = [];
        this.group.children.push(r);
        this.subgroup = r;
        if (contextValue) {
            r.setContext(contextValue);
        }
        this.setIcon(type, r);
        return r;
    }
    setGroup(title, message, type, expanded, contextValue, overrideIcon) {
        // If the last group has no items in it then remove it (eg if there are no recommendations for a project)
        if (this.groups.length > 1 && this.groups[this.groups.length - 1].children.length == 0) {
            if (!this.groups[this.groups.length - 1].whenExpanded) {
                this.groups.pop();
            }
        }
        const r = new recommendation_1.Recommendation(message, '', title, expanded ? vscode_1.TreeItemCollapsibleState.Expanded : vscode_1.TreeItemCollapsibleState.Collapsed);
        if (contextValue) {
            r.setContext(contextValue);
        }
        r.children = [];
        r.setIcon('none');
        this.setIcon(tip_1.TipType.None, r);
        if (overrideIcon) {
            this.setIcon(type, r);
        }
        this.group = r;
        this.groups.push(this.group);
        return r;
    }
    note(title, message, url, tipType, description) {
        const tip = new tip_1.Tip(title, message, tipType, description, undefined, undefined, undefined, url);
        const r = new recommendation_1.Recommendation(description ? description : message, message, title, vscode_1.TreeItemCollapsibleState.None, {
            command: command_name_1.CommandName.Fix,
            title: 'Information',
            arguments: [tip],
        }, undefined);
        this.setIcon(tipType, r);
        this.group.children.push(r);
    }
    setIcon(tipType, r) {
        switch (tipType) {
            case tip_1.TipType.Error:
                r.setIcon('error');
                break;
            case tip_1.TipType.Warning:
                r.setIcon('warning');
                break;
            case tip_1.TipType.Idea:
                r.setIcon('lightbulb');
                break;
            case tip_1.TipType.Files:
                r.setIcon('files');
                break;
            case tip_1.TipType.Builder:
                r.setSingleIcon('logo-builder');
                break;
            case tip_1.TipType.Apple:
                r.setIcon('apple');
                break;
            case tip_1.TipType.Dependency:
                r.setIcon('dependency');
                break;
            case tip_1.TipType.Box:
                r.setIcon('box');
                break;
            case tip_1.TipType.Check:
                r.setIcon('checkbox');
                break;
            case tip_1.TipType.CheckMark:
                r.setIcon('checkmark');
                break;
            case tip_1.TipType.Media:
                r.setIcon('file-media');
                break;
            case tip_1.TipType.Cordova:
                r.setIcon('cordova');
                break;
            case tip_1.TipType.Experiment:
                r.setIcon('beaker');
                break;
            case tip_1.TipType.Capacitor:
                r.setIcon('capacitor');
                break;
            case tip_1.TipType.Capacitor2:
                r.setSingleIcon('logo-capacitor');
                break;
            case tip_1.TipType.React:
                r.setIcon('react');
                break;
            case tip_1.TipType.Vue:
                r.setIcon('vue');
                break;
            case tip_1.TipType.Angular:
                r.setIcon('angular');
                break;
            case tip_1.TipType.Ionic:
                r.setIcon('ionic');
                break;
            case tip_1.TipType.WebNative:
                r.setIcon('webnative');
                break;
            case tip_1.TipType.Android:
                r.setIcon('android');
                break;
            case tip_1.TipType.Comment:
                r.setIcon('comment');
                break;
            case tip_1.TipType.Settings:
                r.setIcon('settings-gear');
                break;
            case tip_1.TipType.Run:
                r.setIcon('run');
                break;
            case tip_1.TipType.Debug:
                r.setIcon('debug-alt-small');
                break;
            case tip_1.TipType.Link:
                r.setIcon('files');
                break;
            case tip_1.TipType.None:
                r.setIcon('none');
                break;
            case tip_1.TipType.Add:
                r.setIcon('add');
                break;
            case tip_1.TipType.Sync:
                r.setIcon('sync');
                break;
            case tip_1.TipType.Build:
                r.setIcon('build');
                break;
            case tip_1.TipType.Edit:
                r.setIcon('edit');
                break;
        }
    }
    isIgnored(tip) {
        if (!tip)
            return true;
        const txt = `${tip.message}+${tip.title}`;
        if (!this.ignored)
            return false;
        return this.ignored.includes(txt);
    }
    add(tip, id) {
        const r = this.asRecommendation(tip);
        if (!r)
            return;
        if (id) {
            r.id = id;
        }
        if (this.subgroup) {
            this.subgroup.children.push(r);
        }
        else {
            this.group.children.push(r);
        }
    }
    async run2(command, suppressOutput) {
        return await (0, utilities_1.run)(this.projectFolder(), command, undefined, [], [], undefined, undefined, undefined, suppressOutput);
    }
    async runAtRoot(command, suppressOutput) {
        (0, logging_1.write)(`> ${command}`);
        return await (0, utilities_1.run)(this.folder, command, undefined, [], [], undefined, undefined, undefined, suppressOutput);
    }
    asRecommendation(tip) {
        if (this.isIgnored(tip))
            return;
        let argsIsRecommendation = false;
        let cmd = {
            command: command_name_1.CommandName.Fix,
            title: 'Fix',
            arguments: [tip],
        };
        if ([tip_1.TipType.Run, tip_1.TipType.Sync, tip_1.TipType.Debug, tip_1.TipType.Build, tip_1.TipType.Edit].includes(tip.type) || tip.doRun) {
            cmd = {
                command: command_name_1.CommandName.Run,
                title: 'Run',
            };
            argsIsRecommendation = true;
        }
        if (tip.vsCommand) {
            cmd = {
                command: tip.vsCommand,
                title: tip.title,
                arguments: [tip],
            };
        }
        if (tip.type == tip_1.TipType.Link) {
            cmd = {
                command: command_name_1.CommandName.Link,
                title: 'Open',
                arguments: [tip],
            };
            tip.url = tip.description;
        }
        const tooltip = tip.tooltip ? tip.tooltip : tip.message;
        const r = new recommendation_1.Recommendation(tooltip, tip.message, tip.title, vscode_1.TreeItemCollapsibleState.None, cmd, tip, tip.url);
        this.setIcon(tip.type, r);
        if (argsIsRecommendation) {
            r.command.arguments = [r];
        }
        if (tip.animates) {
            if ((0, tasks_1.isRunning)(tip)) {
                r.animate();
            }
        }
        // Context values are used for the when condition for vscode commands (see ionic.open in package.json)
        if (tip.contextValue) {
            r.setContext(tip.contextValue);
        }
        return r;
    }
    addSubGroup(title, latestVersion) {
        let tip = undefined;
        if (title == 'angular') {
            // Option to upgrade with:
            // ng update @angular/cli@13 @angular/core@13 --allow-dirty
            if (!latestVersion) {
                return;
            }
            tip = (0, rules_angular_migrate_1.angularMigrate)(this, latestVersion);
        }
        else {
            tip = new tip_1.Tip('Upgrade All Packages', undefined, tip_1.TipType.Run, undefined, undefined, 'Upgrade');
        }
        const command = {
            command: command_name_1.CommandName.Idea,
            title: tip.title,
            arguments: [tip],
        };
        const r = new recommendation_1.Recommendation(tip.title, undefined, '@' + title, vscode_1.TreeItemCollapsibleState.Expanded, command, tip);
        r.children = [];
        if (title == 'angular') {
            r.setContext(context_variables_1.Context.lightbulb);
        }
        else {
            r.setContext(context_variables_1.Context.lightbulb);
            r.tip.setDynamicCommand(this.updatePackages, r).setDynamicTitle(this.updatePackagesTitle, r);
        }
        this.group.children.push(r);
        this.subgroup = r;
    }
    isModernYarn() {
        const result = !!this.yarnVersion;
        if (result && this.yarnVersion.startsWith('pnpm@')) {
            return false;
        }
        if (this.isYarnV1()) {
            return false;
        }
        if (!result && this.packageManager == node_commands_1.PackageManager.yarn) {
            return true;
        }
        return result;
    }
    async updatePackages(r) {
        let command = '';
        const addCmd = (0, node_commands_1.addCommand)();
        for (const child of r.children) {
            // Command will be npm install @capacitor/android@3.4.3 --save-exact
            if (child.tip.command.includes(addCmd)) {
                const npackage = child.tip.command
                    .replace(addCmd + ' ', '')
                    .replace(' --save-exact', '')
                    .replace(command_name_1.InternalCommand.cwd, '');
                if (command != '') {
                    command += ' ';
                }
                command += npackage.trim();
            }
        }
        return (0, node_commands_1.npmInstall)(command);
    }
    updatePackagesTitle(r) {
        let title = '';
        const addCmd = (0, node_commands_1.addCommand)();
        for (const child of r.children) {
            if (child.tip && child.tip.command.includes(addCmd)) {
                if (title != '') {
                    title += ', ';
                }
                title += child.tip.description;
            }
        }
        return `${r.children.length} Packages: ${title}`;
    }
    clearSubgroup() {
        this.subgroup = undefined;
    }
    recommendReplace(name, title, message, description, replacement) {
        if ((0, analyzer_1.exists)(name)) {
            this.add(new tip_1.Tip(title, message, tip_1.TipType.Warning, description, `${(0, node_commands_1.npmInstall)(replacement)} && ${(0, node_commands_1.npmUninstall)(name)}`, 'Replace', `Replaced ${name} with ${replacement}`)
                .setRelatedDependency(name)
                .canIgnore());
        }
    }
    recommendRemove(name, title, message, description, url) {
        if ((0, analyzer_1.exists)(name)) {
            this.add(new tip_1.Tip(title, message, tip_1.TipType.Warning, description, (0, node_commands_1.npmUninstall)(name), 'Uninstall', `Uninstalled ${name}`, url)
                .canIgnore()
                .setRelatedDependency(name));
        }
    }
    recommendAdd(name, title, message, description, devDependency) {
        const flags = devDependency ? (0, node_commands_1.saveDevArgument)(this) : undefined;
        this.add(new tip_1.Tip(title, message, tip_1.TipType.Warning, description, (0, node_commands_1.npmInstall)(name, flags), 'Install', `Installed ${name}`).setRelatedDependency(name));
    }
    deprecatedPlugin(name, message, url) {
        if ((0, analyzer_1.exists)(name)) {
            this.note(name, `This plugin is deprecated. ${message}`, url, tip_1.TipType.Warning, `The plugin ${name} is deprecated. ${message}`);
        }
    }
    upgrade(name, title, message, fromVersion, toVersion, type) {
        if ((0, analyzer_1.exists)(name)) {
            let extra = '';
            if (name == '@capacitor/core') {
                if ((0, analyzer_1.exists)('@capacitor/ios')) {
                    extra += ` @capacitor/ios@${toVersion}`;
                }
                if ((0, analyzer_1.exists)('@capacitor/android')) {
                    extra += ` @capacitor/android@${toVersion}`;
                }
            }
            this.add(new tip_1.Tip(title, message, type, `Upgrade ${name} from ${fromVersion} to ${toVersion}`, (0, node_commands_1.npmInstall)(`${name}@${toVersion}${extra}`), `Upgrade`, `${name} upgraded to ${toVersion}`, `https://www.npmjs.com/package/${name}`, `Upgrading ${name}`)
                .setSecondCommand(`Uninstall`, (0, node_commands_1.npmUninstall)(name))
                .setContextValue(context_variables_1.Context.upgrade)
                .setData({ name: name, version: fromVersion })
                .setTooltip(`${name} ${fromVersion}`));
        }
    }
    package(name, title, version, type) {
        if ((0, analyzer_1.exists)(name)) {
            this.add(new tip_1.Tip(title, version, type, `Uninstall ${name}`, (0, node_commands_1.npmUninstall)(name), `Uninstall`, `${name} Uninstalled`, `https://www.npmjs.com/package/${name}`, `Uninstalling ${name}`)
                .setContextValue(context_variables_1.Context.upgrade)
                .setData({ name: name, version: undefined })
                .setTooltip(`${name} ${version}`));
        }
    }
    checkNotExists(library, message) {
        if ((0, analyzer_1.exists)(library)) {
            this.add(new tip_1.Tip(library, message, tip_1.TipType.Error, undefined, (0, node_commands_1.npmUninstall)(library), 'Uninstall', `Uninstalled ${library}`).setRelatedDependency(library));
        }
    }
    tip(tip) {
        if (tip) {
            this.add(tip);
        }
    }
    tips(tips) {
        if (!tips)
            return;
        for (const tip of tips) {
            this.tip(tip);
        }
    }
    fileExists(filename) {
        return (0, fs_1.existsSync)((0, path_1.join)(this.projectFolder(), filename));
    }
    getDistFolder() {
        return (0, capacitor_config_file_1.getCapacitorConfigDistFolder)(this.projectFolder());
    }
}
exports.Project = Project;
function checkNodeVersion() {
    try {
        const v = process.version.split('.');
        const major = parseInt(v[0].substring(1));
        if (major < 13) {
            vscode_1.window.showErrorMessage(`This extension requires a minimum version of Node 14. ${process.version} is not supported.`, 'OK');
        }
    }
    catch {
        // Do nothing
    }
}
async function installPackage(extensionPath, folder) {
    const selected = await vscode_1.window.showInputBox({ placeHolder: 'Enter package name to install' });
    if (!selected)
        return;
    await (0, fix_issue_1.fixIssue)((0, node_commands_1.npmInstall)(selected), folder, undefined, new tip_1.Tip(`Install ${selected}`, undefined, tip_1.TipType.Run, undefined, undefined, `Installing ${selected}`, `Installed ${selected}`).showProgressDialog());
}
async function reviewProject(folder, context, selectedProject) {
    if (!folder)
        return undefined;
    const summary = await inspectProject(folder, context, selectedProject);
    if (!summary || !summary.project)
        return undefined;
    return summary;
}
async function inspectProject(folder, context, selectedProject) {
    var _a, _b;
    const startedOp = Date.now();
    vscode_1.commands.executeCommand(context_variables_1.VSCommand.setContext, context_variables_1.Context.inspectedProject, false);
    vscode_1.commands.executeCommand(context_variables_1.VSCommand.setContext, context_variables_1.Context.isLoggingIn, false);
    const project = new Project('My Project');
    project.folder = folder;
    project.packageManager = getPackageManager(folder, project.repoType);
    wn_tree_provider_1.exState.packageManager = project.packageManager;
    wn_tree_provider_1.exState.rootFolder = folder;
    wn_tree_provider_1.exState.projectRef = project;
    let packages = await (0, analyzer_1.load)(folder, project, context);
    wn_tree_provider_1.exState.view.title = project.name;
    project.type = project.isCapacitor ? 'Capacitor' : project.isCordova ? 'Cordova' : 'Other';
    if (!features_1.Features.requireLogin) {
        wn_tree_provider_1.exState.skipAuth = true;
    }
    vscode_1.commands.executeCommand(context_variables_1.VSCommand.setContext, context_variables_1.Context.isAnonymous, false);
    await (0, monorepo_1.checkForMonoRepo)(project, selectedProject, context);
    if ((_a = project.monoRepo) === null || _a === void 0 ? void 0 : _a.folder) {
        // Use the package manager from the monorepo project
        project.packageManager = getPackageManager(project.monoRepo.folder, project.repoType);
        wn_tree_provider_1.exState.packageManager = project.packageManager;
    }
    if ((_b = project.monoRepo) === null || _b === void 0 ? void 0 : _b.localPackageJson) {
        packages = await (0, analyzer_1.load)(project.monoRepo.folder, project, context);
    }
    guessFramework(project);
    checkNodeVersion();
    project.getIgnored(context);
    await (0, recommend_1.getRecommendations)(project, context, packages);
    vscode_1.commands.executeCommand(context_variables_1.VSCommand.setContext, context_variables_1.Context.inspectedProject, true);
    return { project, packages };
}
function guessFramework(project) {
    const config = (0, ionic_config_1.getIonicConfig)(project.projectFolder());
    project.frameworkType = config.type;
    if (project.frameworkType)
        return;
    if ((0, analyzer_1.exists)('@vue/cli-service')) {
        project.frameworkType = 'vue';
    }
    else if ((0, analyzer_1.exists)('@angular/core')) {
        project.frameworkType = 'angular';
    }
    else if ((0, analyzer_1.exists)('@angular/cli')) {
        project.frameworkType = 'angular-standalone';
    }
    else if ((0, analyzer_1.exists)('@ionic/angular')) {
        project.frameworkType = 'angular-standalone';
    }
    else if ((0, analyzer_1.exists)('react-scripts')) {
        project.frameworkType = 'react';
    }
    else if ((0, analyzer_1.exists)('vite') && !(0, analyzer_1.exists)('@remix-run/react')) {
        if ((0, analyzer_1.exists)('react')) {
            project.frameworkType = 'react-vite';
        }
        if ((0, analyzer_1.exists)('vue')) {
            project.frameworkType = 'vue-vite';
        }
    }
    if (!project.frameworkType) {
        // Project may not being using a known framework or its a regular node project  }
    }
}
function getPackageManager(folder, monoRepoType) {
    const yarnLock = (0, path_1.join)(folder, 'yarn.lock');
    const pnpmLock = (0, path_1.join)(folder, 'pnpm-lock.yaml');
    const bunLockb = (0, path_1.join)(folder, 'bun.lockb');
    const bunLock = (0, path_1.join)(folder, 'bun.lock');
    if ((0, fs_1.existsSync)(yarnLock)) {
        return node_commands_1.PackageManager.yarn;
    }
    else if ((0, fs_1.existsSync)(pnpmLock) || wn_tree_provider_1.exState.repoType == monorepo_1.MonoRepoType.pnpm) {
        return node_commands_1.PackageManager.pnpm;
    }
    else if ((0, fs_1.existsSync)(bunLockb)) {
        return node_commands_1.PackageManager.bun;
    }
    else if ((0, fs_1.existsSync)(bunLock)) {
        return node_commands_1.PackageManager.bun;
    }
    if (monoRepoType == monorepo_1.MonoRepoType.yarn) {
        const packageLock = (0, path_1.join)(folder, 'package-lock.json');
        if (!(0, fs_1.existsSync)(packageLock)) {
            // Its a yarn monorepo so use yarn as package manager
            return node_commands_1.PackageManager.yarn;
        }
    }
    if (monoRepoType == monorepo_1.MonoRepoType.bun) {
        const packageLock = (0, path_1.join)(folder, 'package-lock.json');
        if (!(0, fs_1.existsSync)(packageLock)) {
            // Its a bun monorepo so use bun as package manager
            return node_commands_1.PackageManager.bun;
        }
    }
    return node_commands_1.PackageManager.npm;
}
//# sourceMappingURL=project.js.map