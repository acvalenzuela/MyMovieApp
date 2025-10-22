"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Features = void 0;
exports.showTips = showTips;
const vscode_1 = require("vscode");
const workspace_state_1 = require("./workspace-state");
const utilities_1 = require("./utilities");
// Feature Flags for experimental options
exports.Features = {
    debugAndroid: true, // Whether debugging for Android is turned on
    pluginExplorer: true, // Whether the plugin explorer is shown
    requireLogin: false, // Whether we require the user to be logged in via "ionic login"
};
function showTips() {
    const tips = (0, workspace_state_1.getGlobalSetting)(workspace_state_1.GlobalSetting.lastTipsShown);
    const shownAt = tips ? Date.parse(tips) : 0;
    const days = (new Date().getTime() - shownAt) / (1000 * 3600 * 24);
    if (days > 30) {
        vscode_1.window.showInformationMessage(`Tip: Press ${(0, utilities_1.alt)('D')} to debug your app and ${(0, utilities_1.alt)('R')} to run it!`, 'OK');
        (0, workspace_state_1.setGlobalSetting)(workspace_state_1.GlobalSetting.lastTipsShown, new Date().toISOString());
    }
}
//# sourceMappingURL=features.js.map