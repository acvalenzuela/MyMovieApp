"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoRunClipboard = autoRunClipboard;
const vscode_1 = require("vscode");
const terminal_1 = require("../terminal");
const wn_tree_provider_1 = require("../wn-tree-provider");
const utilities_1 = require("../utilities");
const integrations_builder_1 = require("../integrations-builder");
const monorepo_1 = require("../monorepo");
function autoRunClipboard() {
    vscode_1.window.onDidChangeWindowState(async (e) => {
        var _a;
        if (e.focused) {
            // Focused in this window
            const txt = await vscode_1.env.clipboard.readText();
            const autoRun = wn_tree_provider_1.exState.lastAutoRun !== txt;
            const looksLikeCommand = txt.startsWith('npm ') || txt.startsWith('npx ');
            // Builder command will be like:
            // npx @builder.io/dev-tools@latest code --url "xxx" --spaceId
            if (autoRun && looksLikeCommand && ((_a = wn_tree_provider_1.exState === null || wn_tree_provider_1.exState === void 0 ? void 0 : wn_tree_provider_1.exState.projectRef) === null || _a === void 0 ? void 0 : _a.repoType) == monorepo_1.MonoRepoType.none) {
                wn_tree_provider_1.exState.lastAutoRun = txt;
                if (txt.includes('--url') && txt.includes('npx @builder.io/dev-tools')) {
                    // Its a Figma design
                    const url = (0, utilities_1.extractBetween)(txt, '--url "', '"');
                    (0, integrations_builder_1.chat)(wn_tree_provider_1.exState.projectRef.projectFolder(), url, ' --spaceId');
                    return;
                }
                // For componment mapping the command will be like:
                // npx builder.io@latest figma generate --token <x> --spaceId <y>
                if (txt.includes('npx builder.io@latest figma generate')) {
                    const selection = await vscode_1.window.showInformationMessage(`Map these component(s)?`, 'Yes', 'No');
                    if (selection == 'Yes') {
                        (0, terminal_1.runInTerminal)(txt);
                    }
                    return;
                }
                // Ask to run the command
                const selection = await vscode_1.window.showInformationMessage(`Run "${txt}" in the terminal?`, 'Execute', 'Exit');
                if (selection == 'Execute') {
                    (0, terminal_1.runInTerminal)(txt);
                }
            }
        }
    });
}
//# sourceMappingURL=auto-run-clipboard.js.map