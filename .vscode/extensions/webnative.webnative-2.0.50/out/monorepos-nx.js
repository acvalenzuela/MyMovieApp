"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNXProjects = getNXProjects;
const path_1 = require("path");
const logging_1 = require("./logging");
const wn_tree_provider_1 = require("./wn-tree-provider");
const strip_json_comments_1 = require("./strip-json-comments");
const fs_1 = require("fs");
let nxProjectFolder = undefined;
/**
 * NX creates a workspace.json file containing the list of projects
 * This function returns it as a list
 * @param  {Project} project
 * @returns Array
 */
async function getNXProjects(project) {
    var _a;
    // Do we return the list of projects we've already cached
    if (((_a = wn_tree_provider_1.exState.projects) === null || _a === void 0 ? void 0 : _a.length) > 0 && nxProjectFolder == project.folder) {
        return wn_tree_provider_1.exState.projects;
    }
    const filename = (0, path_1.join)(project.folder, 'workspace.json');
    let result = [];
    if ((0, fs_1.existsSync)(filename)) {
        result = getNXProjectFromWorkspaceJson(filename);
    }
    else {
        result = await getNXProjectsFromNX(project);
        if (result.length == 0) {
            result = getNXProjectsByFolder(project);
        }
    }
    nxProjectFolder = project.folder;
    return result;
}
// npx nx print-affected --type=app --all
async function getNXProjectsFromNX(project) {
    try {
        const result = [];
        const projects = listProjects(project.folder);
        for (const prj of projects) {
            try {
                const txt = (0, fs_1.readFileSync)(prj, 'utf-8');
                const p = JSON.parse((0, strip_json_comments_1.stripJsonComments)(txt));
                if (p.name && p.projectType == 'application') {
                    result.push({ name: p.name, folder: (0, path_1.dirname)(prj) });
                }
            }
            catch (err) {
                (0, logging_1.writeError)(`Error in project ${prj}: ${err}`);
            }
        }
        return result;
    }
    catch (error) {
        console.error(error);
        return [];
    }
}
function listProjects(folder) {
    const result = [];
    const files = (0, fs_1.readdirSync)(folder, { withFileTypes: true });
    for (const file of files) {
        const skip = file.name == 'node_modules' || file.name.startsWith('.') || file.name.endsWith('.ts');
        if (!skip) {
            if (file.isDirectory()) {
                for (const prj of listProjects((0, path_1.join)(folder, file.name))) {
                    result.push(prj);
                }
            }
            else if (file.name.toLowerCase() == 'project.json') {
                result.push((0, path_1.join)(folder, file.name));
            }
        }
    }
    return result;
}
function getNXProjectFromWorkspaceJson(filename) {
    const result = [];
    const txt = (0, fs_1.readFileSync)(filename, 'utf-8');
    const projects = JSON.parse(txt).projects;
    for (const prj of Object.keys(projects)) {
        let folder = projects[prj];
        if (folder === null || folder === void 0 ? void 0 : folder.root) {
            // NX project can be a folder or an object with a root property specifying the folder
            folder = folder.root;
        }
        result.push({ name: prj, folder: folder });
    }
    return result;
}
function getNXProjectsByFolder(project) {
    const result = [];
    // workspace.json is optional. Just iterate through apps folder
    const folder = (0, path_1.join)(project.folder, 'apps');
    if ((0, fs_1.existsSync)(folder)) {
        const list = (0, fs_1.readdirSync)(folder, { withFileTypes: true });
        for (const item of list) {
            if (item.isDirectory && !item.name.startsWith('.')) {
                result.push({ name: item.name, folder: (0, path_1.join)(folder, item.name) });
            }
        }
        return result;
    }
}
//# sourceMappingURL=monorepos-nx.js.map