'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExTreeProvider = exports.exState = void 0;
const project_1 = require("./project");
const context_variables_1 = require("./context-variables");
const monorepo_1 = require("./monorepo");
const node_commands_1 = require("./node-commands");
const vscode_1 = require("vscode");
const fs_1 = require("fs");
const path_1 = require("path");
const starter_1 = require("./starter");
exports.exState = {
    view: undefined,
    context: undefined,
    runStatusBar: undefined,
    openWebStatusBar: undefined,
    openEditorStatusBar: undefined,
    localUrl: undefined,
    externalUrl: undefined,
    skipAuth: false,
    projects: [],
    projectsView: undefined,
    repoType: monorepo_1.MonoRepoType.none,
    packageManager: node_commands_1.PackageManager.npm,
    workspace: undefined,
    outputIsFocused: false,
    channelFocus: false,
    hasNodeModules: undefined,
    nodeModulesFolder: undefined,
    hasPackageJson: undefined,
    hasNodeModulesNotified: undefined,
    syncDone: [],
    refreshDebugDevices: false,
    remoteLogging: false,
    runIOS: undefined,
    runAndroid: undefined,
    runWeb: undefined,
    nvm: undefined,
    flavors: undefined,
    rootFolder: undefined,
    webView: undefined,
    lastRun: undefined,
    projectRef: undefined,
    buildConfiguration: undefined,
    runConfiguration: undefined,
    servePort: 8100,
    project: undefined,
    debugged: false,
    dontOpenBrowser: false,
};
let folderInfoCache = undefined;
class ExTreeProvider {
    constructor(workspaceRoot, context) {
        this.workspaceRoot = workspaceRoot;
        this.context = context;
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getParent(element) {
        return undefined;
    }
    getTreeItem(element) {
        return element;
    }
    selectProject(project) {
        this.selectedProject = project;
        this.refresh();
    }
    async getChildren(element) {
        if (!this.workspaceRoot) {
            vscode_1.commands.executeCommand(context_variables_1.VSCommand.setContext, context_variables_1.Context.noProjectFound, true);
            return Promise.resolve([]);
        }
        vscode_1.commands.executeCommand(context_variables_1.VSCommand.setContext, context_variables_1.Context.noProjectFound, false);
        if (element) {
            if (element.whenExpanded) {
                return element.whenExpanded();
            }
            else {
                return Promise.resolve(element.children);
            }
        }
        else {
            let folderInfo = folderInfoCache;
            if (!folderInfo || folderInfo.folder != this.workspaceRoot || !folderInfo.packageJsonExists) {
                folderInfo = this.getFolderInfo(this.workspaceRoot);
                folderInfoCache = folderInfo;
            }
            if (folderInfo.packageJsonExists || folderInfo.folderBased) {
                const summary = await (0, project_1.reviewProject)(this.workspaceRoot, this.context, this.selectedProject);
                if (!summary)
                    return [];
                return summary.project.groups;
            }
            else {
                starter_1.StarterPanel.init(exports.exState.context.extensionUri, this.workspaceRoot, exports.exState.context);
                return Promise.resolve([]);
            }
        }
    }
    getFolderInfo(folder) {
        const packageJsonPath = (0, path_1.join)(this.workspaceRoot, 'package.json');
        const folders = (0, monorepo_1.isFolderBasedMonoRepo)(this.workspaceRoot);
        const packageJsonExists = this.pathExists(packageJsonPath);
        const folderBased = folders.length > 0 && !packageJsonExists;
        return {
            packageJsonExists,
            folderBased,
            folder,
        };
    }
    pathExists(p) {
        try {
            (0, fs_1.accessSync)(p);
        }
        catch (err) {
            return false;
        }
        return true;
    }
}
exports.ExTreeProvider = ExTreeProvider;
//# sourceMappingURL=wn-tree-provider.js.map