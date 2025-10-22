"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingSettings = LoggingSettings;
const vscode_1 = require("vscode");
const workspace_state_1 = require("./workspace-state");
async function LoggingSettings(queueFunction, project) {
    const items = selectedOptions();
    const result = await vscode_1.window.showQuickPick(items, {
        placeHolder: 'Select log types to report to the output window',
        canPickMany: true,
    });
    if (!result)
        return;
    queueFunction();
    const list = result.map((item) => item.value);
    const selections = [];
    for (const option of getOptions()) {
        if (!list.includes(option.value)) {
            selections.push(option.value);
        }
    }
    (0, workspace_state_1.setSetting)(workspace_state_1.WorkspaceSetting.logFilter, selections);
}
function selectedOptions() {
    const result = [];
    const filter = (0, workspace_state_1.getSetting)(workspace_state_1.WorkspaceSetting.logFilter);
    for (const option of getOptions()) {
        const choice = option;
        choice.picked = !filter || !filter.includes(option.value);
        if (option.separator) {
            result.push({ label: option.separator, kind: vscode_1.QuickPickItemKind.Separator });
        }
        result.push(choice);
    }
    return result;
}
function getOptions() {
    return [
        {
            label: 'Info logging',
            description: 'General info level logging',
            value: '',
            separator: 'Task Logging',
        },
        {
            label: 'Angular',
            description: 'Logging from the Angular CLI [ng]',
            value: '[ng]',
        },
        {
            label: 'Console Logging',
            description: 'Console.log, Console.warn or Console.error',
            value: 'console',
            separator: 'Nexus Browser Logging',
        },
        {
            label: 'Capacitor Calls',
            description: 'Calls to native capacitor plugin methods [capacitor]',
            value: '[capacitor]',
        },
        {
            label: 'Cordova Calls',
            description: 'Calls to native cordova plugin methods [cordova]',
            value: '[cordova]',
        },
        {
            label: 'Webpack Dev Server',
            description: 'Logging from web pack dev server [webpack-dev-server]',
            value: '[webpack-dev-server]',
        },
        {
            label: 'Verbose',
            description: 'Verbose level [verbose]',
            value: '[verbose]',
        },
        {
            label: 'Warning',
            description: 'Warning level [warn]',
            value: '[warn]',
        },
        {
            label: 'Error',
            description: 'Error level [error]',
            value: '[error]',
        },
    ];
}
//# sourceMappingURL=log-settings.js.map