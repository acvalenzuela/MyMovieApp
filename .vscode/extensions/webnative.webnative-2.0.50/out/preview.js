"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.viewInEditor = viewInEditor;
exports.getDebugBrowserName = getDebugBrowserName;
exports.debugBrowser = debugBrowser;
const path_1 = require("path");
const vscode_1 = require("vscode");
const wn_tree_provider_1 = require("./wn-tree-provider");
const workspace_state_1 = require("./workspace-state");
const utilities_1 = require("./utilities");
const tasks_1 = require("./tasks");
const webview_debug_1 = require("./webview-debug");
const integrations_builder_1 = require("./integrations-builder");
var MessageType;
(function (MessageType) {
    MessageType["setMobile"] = "setMobile";
    MessageType["setWeb"] = "setWeb";
    MessageType["device"] = "device";
    MessageType["qr"] = "qr";
    MessageType["stopSpinner"] = "stopSpinner";
})(MessageType || (MessageType = {}));
function iconFor(name) {
    return {
        light: vscode_1.Uri.file((0, path_1.join)(__filename, '..', '..', 'resources', 'light', name + '.svg')),
        dark: vscode_1.Uri.file((0, path_1.join)(__filename, '..', '..', 'resources', 'dark', name + '.svg')),
    };
}
const devices = [
    { name: 'Web', width: 0, height: 0, type: 'web', icon: '$(globe)' },
    { name: 'Mobile Responsive', width: 0, height: 0, type: 'mobile' },
    { name: 'iPhone SE', width: 375, height: 667, type: 'ios' },
    { name: 'iPhone XR', width: 414, height: 896, type: 'ios' },
    { name: 'iPhone 12 Pro', width: 390, height: 844, type: 'ios' },
    { name: 'iPad Air', width: 820, height: 1180, type: 'ios' },
    { name: 'iPad Mini', width: 768, height: 1024, type: 'ios' },
    { name: 'Pixel 3', width: 393, height: 786, type: 'android' },
    { name: 'Pixel 5', width: 393, height: 851, type: 'android' },
    { name: 'Samsung Galaxy S8+', width: 360, height: 740, type: 'android' },
    { name: 'Samsung Galaxy S20 Ultra', width: 412, height: 915, type: 'android' },
    { name: 'Samsung Galaxy Tab S4', width: 712, height: 1138, type: 'android' },
];
let lastUrl = '';
let lastExternalUrl = undefined;
const id = `w${Math.random()}`;
function viewInEditor(url, externalUrl, active, existingPanel, stopSpinner, overrideAsWeb) {
    const panel = existingPanel
        ? wn_tree_provider_1.exState.webView
        : vscode_1.window.createWebviewPanel('viewApp', 'Preview', active ? vscode_1.ViewColumn.Active : vscode_1.ViewColumn.Beside, {
            enableScripts: true,
            retainContextWhenHidden: true,
        });
    // Allows QR Codes to be displayed
    const onDiskPath = vscode_1.Uri.file((0, path_1.join)(wn_tree_provider_1.exState.context.extensionPath, 'resources', 'qrious.min.js'));
    const qrSrc = panel.webview.asWebviewUri(onDiskPath);
    lastUrl = url;
    if (externalUrl) {
        lastExternalUrl = externalUrl;
    }
    const extensionUri = wn_tree_provider_1.exState.context.extensionUri;
    panel.webview.html = url ? getWebviewContent(panel.webview, extensionUri, qrSrc.toString()) : '';
    panel.iconPath = iconFor('globe');
    if (!existingPanel) {
        vscode_1.commands.executeCommand('workbench.action.closeSidebar');
    }
    let device = (0, workspace_state_1.getSetting)(workspace_state_1.WorkspaceSetting.emulator);
    if (overrideAsWeb) {
        device = devices[0];
    }
    if (!device) {
        device = devices[0];
    }
    const assetsUri = getUri(panel.webview, extensionUri, ['preview', 'build', 'assets']).toString();
    if (device) {
        panel.title = device.name;
        const hasChat = (0, integrations_builder_1.hasBuilder)();
        panel.webview.postMessage({ command: MessageType.device, device, baseUrl: url, id, assetsUri: assetsUri, hasChat });
    }
    if (existingPanel || stopSpinner) {
        panel.webview.postMessage({ command: MessageType.stopSpinner });
    }
    if (panel.initialized)
        return panel;
    panel.initialized = true;
    panel.webview.onDidReceiveMessage(async (message) => {
        console.log(message);
        for (const device of devices) {
            if (message.command == device.name) {
                (0, workspace_state_1.setSetting)(workspace_state_1.WorkspaceSetting.emulator, device);
                panel.title = device.name;
                panel.webview.postMessage({ command: MessageType.device, device });
                return;
            }
        }
        if (message.command == 'browser') {
            (0, utilities_1.openUri)(lastUrl);
            return;
        }
        if (message.command == 'chat') {
            await (0, integrations_builder_1.chat)(wn_tree_provider_1.exState.projectRef.projectFolder());
            return;
        }
        if (message.command == 'qr') {
            const item = (0, webview_debug_1.nexusURL)(lastUrl, lastExternalUrl);
            panel.webview.postMessage({ command: MessageType.qr, item });
            return;
        }
        if (message.command == 'add') {
            console.log('add');
            viewInEditor(lastUrl, lastExternalUrl, true, false, true);
            return;
        }
        const device = await selectMockDevice();
        if (!device) {
            return;
        }
        (0, workspace_state_1.setSetting)(workspace_state_1.WorkspaceSetting.emulator, device);
        panel.title = device.name;
        panel.webview.postMessage({ command: MessageType.device, device });
    });
    return panel;
}
function getDebugBrowserName() {
    const browser = getDebugBrowserSetting();
    if (browser == 'pwa-msedge')
        return 'Microsoft Edge';
    if (browser == 'chrome')
        return 'Google Chrome';
    return browser;
}
function getDebugBrowserSetting() {
    let browserType = (0, workspace_state_1.getSetting)(workspace_state_1.WorkspaceSetting.debugBrowser);
    if (!browserType) {
        browserType = 'chrome';
    }
    return browserType;
}
async function debugBrowser(url, stopWebServerAfter) {
    try {
        const launchConfig = {
            type: getDebugBrowserSetting(),
            name: 'Debug Web',
            request: 'launch',
            url: url,
            webRoot: '${workspaceFolder}',
            skipFiles: (0, utilities_1.debugSkipFiles)(),
        };
        vscode_1.debug.onDidTerminateDebugSession(async (e) => {
            if (stopWebServerAfter) {
                // This stops the dev server
                await (0, tasks_1.cancelLastOperation)();
                // Switch back to Ionic View
                wn_tree_provider_1.exState.view.reveal(undefined, { focus: true });
            }
        });
        await vscode_1.debug.startDebugging(undefined, launchConfig);
    }
    catch {
        //
    }
}
async function selectMockDevice() {
    const last = (0, workspace_state_1.getSetting)(workspace_state_1.WorkspaceSetting.emulator);
    const picks = devices.map((device) => {
        let name = device.icon ? `${device.icon} ` : '$(device-mobile) ';
        name += device.width == 0 ? device.name : `${device.name} (${device.width} x ${device.height})`;
        if (device.name == (last === null || last === void 0 ? void 0 : last.name)) {
            name += ' $(check)';
        }
        return name;
    });
    const newWindow = '$(add) New Window';
    picks.push({ label: '', kind: vscode_1.QuickPickItemKind.Separator });
    picks.push(newWindow);
    const newBrowser = `$(globe) Open in Browser`;
    picks.push(newBrowser);
    const selected = await vscode_1.window.showQuickPick(picks, { placeHolder: 'Select Emulated Device' });
    if (!selected)
        return;
    if (selected == newWindow) {
        viewInEditor(lastUrl, undefined, true, false, true);
        return;
    }
    if (selected == newBrowser) {
        (0, utilities_1.openUri)(lastUrl);
        return;
    }
    return devices.find((device) => selected.includes(device.name));
}
function getWebviewContent(webview, extensionUri, qrSrc) {
    const stylesUri = getUri(webview, extensionUri, ['preview', 'build', 'styles.css']);
    const runtimeUri = getUri(webview, extensionUri, ['preview', 'build', 'runtime.js']);
    const polyfillsUri = getUri(webview, extensionUri, ['preview', 'build', 'polyfills.js']);
    const scriptUri = getUri(webview, extensionUri, ['preview', 'build', 'main.js']);
    const nonce = getNonce();
    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    return /*html*/ `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <!--<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">-->
        <link rel="stylesheet" type="text/css" href="${stylesUri}">
        <titlePreview</title>
      </head>
      <script src="${qrSrc}"></script>
      <body>
        <app-root></app-root>
        <script type="module" nonce="${nonce}" src="${runtimeUri}"></script>
        <script type="module" nonce="${nonce}" src="${polyfillsUri}"></script>
        <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
      </body>
    </html>
  `;
}
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
function getUri(webview, extensionUri, pathList) {
    return webview.asWebviewUri(vscode_1.Uri.joinPath(extensionUri, ...pathList));
}
//# sourceMappingURL=preview.js.map