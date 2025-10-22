"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevServerProvider = void 0;
const vscode_1 = require("vscode");
const command_name_1 = require("./command-name");
const webview_debug_1 = require("./webview-debug");
class DevServerProvider {
    constructor(workspaceRoot, context) {
        this.workspaceRoot = workspaceRoot;
        this.context = context;
        this.registered = false;
    }
    resolveWebviewView(webviewView, context, token) {
        if (this.registered)
            return;
        this.registered = true;
        vscode_1.commands.registerCommand(command_name_1.CommandName.ViewDevServer, (externalUrl, localUrl) => {
            const shortUrl = (0, webview_debug_1.qrWebView)(webviewView.webview, externalUrl, localUrl);
            //webviewView.description = shortUrl;
            webviewView.show(true);
            // const value: string = workspace.getConfiguration(WorkspaceSection).get('√');
            // if (value !== 'no' && !exState.dontOpenBrowser) {
            //   openUri(localUrl);
            // }
        });
        vscode_1.commands.registerCommand(command_name_1.CommandName.HideDevServer, () => {
            // THERE IS NO API TO HIDE/COLLAPSE A VIEW
            const shortUrl = (0, webview_debug_1.qrWebView)(webviewView.webview, undefined, undefined);
            //webviewView.show(true);
        });
    }
}
exports.DevServerProvider = DevServerProvider;
//# sourceMappingURL=devserver-provider.js.map