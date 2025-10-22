"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.integratePWA = integratePWA;
const vscode_1 = require("vscode");
const ignore_1 = require("./ignore");
const wn_tree_provider_1 = require("./wn-tree-provider");
const advanced_actions_1 = require("./advanced-actions");
const node_commands_1 = require("./node-commands");
async function integratePWA(queueFunction, project, tip) {
    const result = await vscode_1.window.showInformationMessage(`Progressive Web Application (PWA) Integration - This will add @angular/pwa to your project and make changes in your project to make it a PWA (manifest file, splash screen and icon resources).`, 'Apply Changes', 'Ignore');
    if (result == 'Ignore') {
        (0, ignore_1.ignore)(tip, wn_tree_provider_1.exState.context);
        return;
    }
    if (!result) {
        return;
    }
    queueFunction();
    await (0, advanced_actions_1.runCommands)([`${(0, node_commands_1.npx)(project)} ng add @angular/pwa --defaults --skip-confirmation true`], 'Adding @angular/pwa', project);
}
//# sourceMappingURL=capacitor-pwa.js.map