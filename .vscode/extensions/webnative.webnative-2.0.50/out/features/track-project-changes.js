"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackProjectChange = trackProjectChange;
const vscode_1 = require("vscode");
const wn_tree_provider_1 = require("../wn-tree-provider");
const imports_icons_1 = require("../imports-icons");
function trackProjectChange() {
    vscode_1.workspace.onDidSaveTextDocument((document) => {
        wn_tree_provider_1.exState.projectDirty = true;
        if (document.fileName.endsWith('.html')) {
            (0, imports_icons_1.autoFixOtherImports)(document);
        }
    });
    vscode_1.window.onDidChangeVisibleTextEditors((e) => {
        var _a, _b;
        let outputIsFocused = false;
        for (const d of e) {
            if (((_b = (_a = d === null || d === void 0 ? void 0 : d.document) === null || _a === void 0 ? void 0 : _a.uri) === null || _b === void 0 ? void 0 : _b.scheme) == 'output') {
                outputIsFocused = true;
            }
        }
        wn_tree_provider_1.exState.outputIsFocused = outputIsFocused;
    });
}
//# sourceMappingURL=track-project-changes.js.map