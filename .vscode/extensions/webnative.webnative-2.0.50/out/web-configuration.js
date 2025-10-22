"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webProjectPackages = exports.WebConfigSetting = void 0;
exports.getWebConfiguration = getWebConfiguration;
exports.setWebConfig = setWebConfig;
const vscode_1 = require("vscode");
const workspace_state_1 = require("./workspace-state");
const context_variables_1 = require("./context-variables");
var WebConfigSetting;
(function (WebConfigSetting) {
    WebConfigSetting["nexus"] = "WebConfigNexusBrowser";
    WebConfigSetting["browser"] = "WebConfigWebBrowser";
    WebConfigSetting["editor"] = "WebConfigEditor";
    WebConfigSetting["none"] = "WebConfigNone";
})(WebConfigSetting || (exports.WebConfigSetting = WebConfigSetting = {}));
function getWebConfiguration() {
    const setting = (0, workspace_state_1.getSetting)(workspace_state_1.WorkspaceSetting.webAction);
    if (setting) {
        return setting;
    }
    else {
        return WebConfigSetting.nexus;
    }
}
async function setWebConfig(setting) {
    (0, workspace_state_1.setSetting)(workspace_state_1.WorkspaceSetting.webAction, setting);
    vscode_1.commands.executeCommand(context_variables_1.VSCommand.setContext, context_variables_1.Context.webConfig, setting);
}
exports.webProjectPackages = [
    '@ionic/vue',
    '@ionic/angular',
    '@ionic/react',
    '@angular/core',
    'react',
    'astro',
    'vue',
    'vite',
    'svelte',
];
//# sourceMappingURL=web-configuration.js.map