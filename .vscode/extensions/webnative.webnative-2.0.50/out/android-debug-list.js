"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAndroidWebViewList = getAndroidWebViewList;
const vscode_1 = require("vscode");
const android_debug_1 = require("./android-debug");
const android_debug_bridge_1 = require("./android-debug-bridge");
const command_name_1 = require("./command-name");
const wn_tree_provider_1 = require("./wn-tree-provider");
const recommendation_1 = require("./recommendation");
const tip_1 = require("./tip");
async function getAndroidWebViewList(hasCapacitorAndroid, wwwFolder, projectFolder) {
    if (wn_tree_provider_1.exState.refreshDebugDevices) {
        wn_tree_provider_1.exState.refreshDebugDevices = false;
    }
    if (!hasCapacitorAndroid) {
        return [];
    }
    const result = [];
    const devices = await (0, android_debug_bridge_1.findDevices)();
    for (const device of devices) {
        const webviews = await (0, android_debug_bridge_1.findWebViews)(device);
        for (const webview of webviews) {
            const r = new recommendation_1.Recommendation(`Debug ${webview.packageName} ${webview.versionName} on running Android device ${device.product}`, `(${device.product})`, `${webview.packageName}`, vscode_1.TreeItemCollapsibleState.None, getCommand(), undefined);
            r.setIcon('debug');
            r.tip = new tip_1.Tip(undefined, undefined, tip_1.TipType.Run)
                .setQueuedAction(debug, device, webview, wwwFolder, projectFolder)
                .doNotWait();
            r.command.arguments = [r];
            result.push(r);
        }
        if (webviews.length == 0) {
            const r = new recommendation_1.Recommendation('test', 'No Web View', device.product, vscode_1.TreeItemCollapsibleState.None, getCommand(), undefined);
            r.setIcon('android');
            result.push(r);
        }
    }
    return result;
}
async function debug(queueFunction, device, webview, wwwfolder, projectFolder) {
    queueFunction();
    (0, android_debug_1.debugAndroid)(webview.packageName, wwwfolder, projectFolder);
    return;
}
function getCommand() {
    return {
        command: command_name_1.CommandName.Function,
        title: 'Open',
    };
}
//# sourceMappingURL=android-debug-list.js.map