"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalSetting = exports.ExtensionSetting = exports.WorkspaceSetting = exports.WorkspaceSection = void 0;
exports.getSetting = getSetting;
exports.setSetting = setSetting;
exports.getExtSetting = getExtSetting;
exports.setExtSetting = setExtSetting;
exports.getGlobalSetting = getGlobalSetting;
exports.setGlobalSetting = setGlobalSetting;
const vscode_1 = require("vscode");
const wn_tree_provider_1 = require("./wn-tree-provider");
exports.WorkspaceSection = 'webnative';
var WorkspaceSetting;
(function (WorkspaceSetting) {
    WorkspaceSetting["liveReload"] = "liveReload";
    WorkspaceSetting["httpsForWeb"] = "httpsForWeb";
    WorkspaceSetting["pluginDrift"] = "pluginDrift";
    WorkspaceSetting["webAction"] = "webAction";
    WorkspaceSetting["logFilter"] = "logFilter";
    WorkspaceSetting["tips"] = "tipsShown";
    WorkspaceSetting["lastIPAddress"] = "lastIPAddress";
    WorkspaceSetting["debugBrowser"] = "debugBrowser";
    WorkspaceSetting["emulator"] = "emulator";
    WorkspaceSetting["cocoaPods"] = "cocoaPods2";
    WorkspaceSetting["recCheck"] = "recCheck";
    WorkspaceSetting["builderAuthenticated"] = "builderAuthenticated";
})(WorkspaceSetting || (exports.WorkspaceSetting = WorkspaceSetting = {}));
var ExtensionSetting;
(function (ExtensionSetting) {
    ExtensionSetting["internalAddress"] = "internalAddress";
    ExtensionSetting["javaHome"] = "javaHome";
    ExtensionSetting["manualNewProjects"] = "manualNewProjects";
    ExtensionSetting["packageManager"] = "packageManager";
})(ExtensionSetting || (exports.ExtensionSetting = ExtensionSetting = {}));
var GlobalSetting;
(function (GlobalSetting) {
    GlobalSetting["lastTipsShown"] = "lastTipsShown";
    GlobalSetting["projectsFolder"] = "projectsFolder";
    GlobalSetting["suggestNPMInstall"] = "suggestNPMInstall";
})(GlobalSetting || (exports.GlobalSetting = GlobalSetting = {}));
function getSetting(key) {
    return wn_tree_provider_1.exState.context.workspaceState.get(key);
}
async function setSetting(key, value) {
    await wn_tree_provider_1.exState.context.workspaceState.update(key, value);
}
function getExtSetting(key) {
    return vscode_1.workspace.getConfiguration(exports.WorkspaceSection).get(key);
}
function setExtSetting(key, value) {
    return vscode_1.workspace.getConfiguration(exports.WorkspaceSection).update(key, value);
}
function getGlobalSetting(key) {
    return wn_tree_provider_1.exState.context.globalState.get(key);
}
async function setGlobalSetting(key, value) {
    return await wn_tree_provider_1.exState.context.globalState.update(key, value);
}
//# sourceMappingURL=workspace-state.js.map