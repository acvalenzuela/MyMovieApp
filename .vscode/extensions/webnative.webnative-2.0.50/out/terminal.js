"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInTerminal = runInTerminal;
const vscode_1 = require("vscode");
const extension_1 = require("./extension");
function runInTerminal(cmd) {
    let terminal = vscode_1.window.terminals.find((t) => t.name == extension_1.extensionName);
    if (!terminal) {
        terminal = vscode_1.window.createTerminal(extension_1.extensionName);
    }
    // Send command to the terminal
    terminal.show(); // Make sure the terminal is visible
    terminal.sendText(cmd);
}
//# sourceMappingURL=terminal.js.map