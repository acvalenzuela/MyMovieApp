"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsProvider = void 0;
const vscode_1 = require("vscode");
const command_name_1 = require("./command-name");
const wn_tree_provider_1 = require("./wn-tree-provider");
const recommendation_1 = require("./recommendation");
const utilities_1 = require("./utilities");
class ProjectsProvider {
    constructor(workspaceRoot, context) {
        this.workspaceRoot = workspaceRoot;
        this.context = context;
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh(project) {
        wn_tree_provider_1.exState.workspace = project;
        this.selectedProject = project;
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        return Promise.resolve(this.projectList());
    }
    projectList() {
        const list = [];
        for (const project of wn_tree_provider_1.exState.projects) {
            const cmd = {
                command: command_name_1.CommandName.ProjectSelect,
                title: 'Open',
                arguments: [project.name],
            };
            const r = new recommendation_1.Recommendation(project.folder, undefined, this.niceName(project.name), vscode_1.TreeItemCollapsibleState.None, cmd);
            const icon = project.name == this.selectedProject ? 'circle-filled' : 'none';
            r.setIcon(icon);
            list.push(r);
        }
        return list;
    }
    niceName(name) {
        return (0, utilities_1.toTitleCase)(name.replace(/-/g, ' '));
    }
}
exports.ProjectsProvider = ProjectsProvider;
//# sourceMappingURL=projects-provider.js.map