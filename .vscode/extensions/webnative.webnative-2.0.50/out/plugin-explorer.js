"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginExplorerPanel = void 0;
const vscode_1 = require("vscode");
const utilities_1 = require("./utilities");
const fs_1 = require("fs");
const path_1 = require("path");
const node_commands_1 = require("./node-commands");
const utilities_2 = require("./utilities");
const project_1 = require("./project");
const wn_tree_provider_1 = require("./wn-tree-provider");
const logging_1 = require("./logging");
const peer_dependencies_1 = require("./peer-dependencies");
const analyzer_1 = require("./analyzer");
const capacitor_sync_1 = require("./capacitor-sync");
const rules_package_upgrade_1 = require("./rules-package-upgrade");
var MessageType;
(function (MessageType) {
    MessageType["getPlugins"] = "getPlugins";
    MessageType["getInstalledDeps"] = "getInstalledDeps";
    MessageType["install"] = "install";
    MessageType["getPlugin"] = "getPlugin";
    MessageType["uninstall"] = "uninstall";
    MessageType["chooseVersion"] = "choose-version";
    MessageType["init"] = "init";
})(MessageType || (MessageType = {}));
class PluginExplorerPanel {
    constructor(panel, extensionUri, path, context, provider) {
        this.disposables = [];
        this.panel = panel;
        this.path = path;
        this.provider = provider;
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.webview.html = this.getWebviewContent(this.panel.webview, extensionUri);
        this.setWebviewMessageListener(this.panel.webview, extensionUri, path, context);
        this.panel.webview.postMessage({ command: MessageType.init, capacitor: wn_tree_provider_1.exState.projectRef.isCapacitor });
    }
    static init(extensionUri, path, context, provider) {
        if (PluginExplorerPanel.currentPanel) {
            // If the webview panel already exists reveal it
            PluginExplorerPanel.currentPanel.provider = provider;
            PluginExplorerPanel.currentPanel.panel.reveal(vscode_1.ViewColumn.One);
        }
        else {
            // If a webview panel does not already exist create and show a new one
            const panel = vscode_1.window.createWebviewPanel(
            // Panel view type
            'pluginExplorer', 
            // Panel title
            'Packages', vscode_1.ViewColumn.One, {
                enableScripts: true,
                localResourceRoots: [
                    vscode_1.Uri.joinPath(extensionUri, 'out'),
                    vscode_1.Uri.joinPath(extensionUri, 'plugin-explorer', 'build'),
                ],
            });
            PluginExplorerPanel.currentPanel = new PluginExplorerPanel(panel, extensionUri, path, context, provider);
        }
    }
    dispose() {
        PluginExplorerPanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
    getWebviewContent(webview, extensionUri) {
        const stylesUri = getUri(webview, extensionUri, ['plugin-explorer', 'build', 'styles.css']);
        const runtimeUri = getUri(webview, extensionUri, ['plugin-explorer', 'build', 'runtime.js']);
        const polyfillsUri = getUri(webview, extensionUri, ['plugin-explorer', 'build', 'polyfills.js']);
        const scriptUri = getUri(webview, extensionUri, ['plugin-explorer', 'build', 'main.js']);
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
          <title>Plugins</title>
        </head>
        <body>
          <app-root></app-root>
          <script type="module" nonce="${nonce}" src="${runtimeUri}"></script>
          <script type="module" nonce="${nonce}" src="${polyfillsUri}"></script>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
    }
    setWebviewMessageListener(webview, extensionUri, path, context) {
        webview.onDidReceiveMessage(async (message) => {
            const command = message.command;
            const text = message.text;
            switch (command) {
                case MessageType.install: {
                    // Code that should run in response to the hello message command
                    this.install(text);
                    break;
                }
                case MessageType.uninstall: {
                    this.uninstall(text);
                    break;
                }
                case MessageType.chooseVersion: {
                    const changed = await this.chooseVersion(text, path);
                    webview.postMessage({ command, changed });
                    break;
                }
                case MessageType.getInstalledDeps: {
                    const list = await getInstalledDeps(path, context);
                    webview.postMessage({ command, list });
                    break;
                }
                case MessageType.getPlugin: {
                    const data = await getPluginInfo(text, path);
                    webview.postMessage({ command, data });
                    break;
                }
                case MessageType.getPlugins: {
                    const list = await getInstalledDeps(path, context);
                    webview.postMessage({ command: MessageType.getInstalledDeps, list });
                    const uri = await fetchPluginData(webview, extensionUri);
                    const assetsUri = getUri(webview, extensionUri, ['plugin-explorer', 'build', 'assets']).toString();
                    webview.postMessage({ command, uri: `${uri}`, assetsUri: assetsUri });
                    break;
                }
            }
        }, undefined, this.disposables);
    }
    async checkEnterpriseRegister(plugin) {
        if (wn_tree_provider_1.exState.packageManager !== node_commands_1.PackageManager.npm) {
            return;
        }
        if (!plugin.startsWith('@ionic-enterprise/')) {
            return;
        }
        if (this.hasProductKey()) {
            return;
        }
        const productKey = await vscode_1.window.showInputBox({
            title: 'Ionic Enterprise Product Key',
            placeHolder: 'Enter product key',
        });
        if (productKey == '') {
            return true;
        }
        if (!productKey)
            return false;
        const cmd = `npx ionic enterprise register --key=${productKey}`;
        return await (0, utilities_2.run)(this.path, cmd, undefined, [], [], undefined, undefined, undefined, false);
    }
    hasProductKey() {
        const npmrc = (0, path_1.join)(this.path, '.npmrc');
        if ((0, fs_1.existsSync)(npmrc)) {
            const data = (0, fs_1.readFileSync)(npmrc, 'utf-8');
            if (data.includes('@ionic-enterprise') && data.includes('_authToken')) {
                return true;
            }
        }
        return false;
    }
    async install(plugin) {
        const pluginVersion = await findBestVersion(plugin);
        if (!pluginVersion)
            return;
        if (pluginVersion.endsWith((0, analyzer_1.getPackageVersion)(plugin))) {
            // Already installed latest possible
            vscode_1.window.showInformationMessage(`Version ${(0, analyzer_1.getPackageVersion)(plugin)} of ${plugin} is already installed.`, 'OK');
            return;
        }
        const cmd = (0, node_commands_1.npmInstall)(pluginVersion);
        const result = await this.checkEnterpriseRegister(plugin);
        if (result == false)
            return;
        this.dispose();
        await (0, utilities_1.showProgress)(`Installing ${plugin}`, async () => {
            (0, logging_1.write)(`> ${cmd}`);
            await (0, utilities_2.run)(this.path, cmd, undefined, [], [], undefined, undefined, undefined, false);
            await (0, utilities_2.run)(this.path, await (0, capacitor_sync_1.capacitorSync)(wn_tree_provider_1.exState.projectRef), undefined, [], [], undefined, undefined, undefined, false);
            this.provider.refresh();
            vscode_1.window.showInformationMessage(`${plugin} was installed.`, 'OK');
        });
    }
    async chooseVersion(plugin, folder) {
        const updated = await (0, rules_package_upgrade_1.packageUpgrade)({ name: plugin, version: '' }, folder);
        this.provider.refresh();
        return updated;
    }
    async uninstall(plugin) {
        this.dispose();
        const cmd = (0, node_commands_1.npmUninstall)(plugin);
        await (0, utilities_1.showProgress)(`Uninstalling ${plugin}`, async () => {
            (0, logging_1.clearOutput)();
            (0, logging_1.write)(`> ${cmd}`);
            await (0, utilities_2.run)(this.path, cmd, undefined, [], [], undefined, undefined, undefined, false);
            this.provider.refresh();
            vscode_1.window.showInformationMessage(`${plugin} was removed.`, 'OK');
        });
    }
}
exports.PluginExplorerPanel = PluginExplorerPanel;
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
async function getInstalledDeps(path, context) {
    const summary = await (0, project_1.inspectProject)(path, context, undefined);
    const dependencies = [];
    const capacitor = wn_tree_provider_1.exState.projectRef.isCapacitor;
    const libraries = [];
    if (capacitor) {
        for (const libType of ['Capacitor Plugin', 'Plugin']) {
            for (const library of Object.keys(summary.packages).sort()) {
                const pkg = summary.packages[library];
                if (pkg.depType == libType) {
                    libraries.push(library);
                }
            }
        }
    }
    else {
        for (const library of Object.keys(summary.packages).sort()) {
            libraries.push(library);
        }
    }
    for (const library of libraries) {
        const pkg = summary.packages[library];
        dependencies.push({ name: library, version: pkg.version, latest: pkg.latest });
    }
    return dependencies;
}
async function fetchPluginData(webview, extensionUri) {
    const path = (0, path_1.join)(extensionUri.fsPath, 'plugin-explorer', 'build', 'plugins.json');
    // Download plugin data again if we havent before or its been 24 hours
    if (!(0, fs_1.existsSync)(path) || ageInHours(path) > 12) {
        //const url = `https://capacitorjs.com/directory/plugin-data-raw.json`;
        const json = (await (0, utilities_1.httpRequest)('GET', 'capacitorjs.com', '/directory/plugin-data-raw.json'));
        (0, fs_1.writeFileSync)(path, JSON.stringify(json));
    }
    return getUri(webview, extensionUri, ['plugin-explorer', 'build', 'plugins.json']);
}
async function getPluginInfo(name, path) {
    var _a, _b, _c, _d;
    // The UI is searching for a particular plugin or dependency.
    // As not all packages are indexed and may not even be a plugin we search and return info
    if (!name)
        return undefined;
    try {
        const p = JSON.parse(await (0, utilities_1.getRunOutput)(`npm view ${name} --json`, path, undefined, true));
        //const p: any = await httpRequest('GET', `registry.npmjs.org`, `/${name}`);
        if (!p.name) {
            console.error(`getPluginInfo(${name}}) ${p}`);
            return undefined;
        }
        const gh = ((_a = p.repository) === null || _a === void 0 ? void 0 : _a.url) ? await getGHInfo(p.repository.url) : undefined;
        const data = {
            name: p.name,
            version: p.version,
            success: [],
            fails: [],
            versions: [],
            description: p.description,
            author: p.author,
            bugs: (_b = p.bugs) === null || _b === void 0 ? void 0 : _b.url,
            image: (_c = gh === null || gh === void 0 ? void 0 : gh.owner) === null || _c === void 0 ? void 0 : _c.avatar_url,
            stars: gh === null || gh === void 0 ? void 0 : gh.stargazers_count,
            fork: gh === null || gh === void 0 ? void 0 : gh.fork,
            updated: gh === null || gh === void 0 ? void 0 : gh.updated_at,
            published: p.time.modified,
            keywords: p.keywords,
            repo: cleanRepo((_d = p.repository) === null || _d === void 0 ? void 0 : _d.url),
            license: p.license,
        };
        console.log(`Found npm package ${name}`, p);
        return data;
    }
    catch (error) {
        console.error(`getPluginInfo(${name})`, error);
        return undefined;
    }
}
function cleanRepo(url) {
    if (url) {
        return url
            .replace('git+', '')
            .replace('ssh://git@', '')
            .replace('.git', '')
            .replace('git://github.com/', 'https://github.com/');
    }
}
async function getGHInfo(repo) {
    try {
        if (!repo)
            return undefined;
        const part = repo
            .replace('https://github.com/', '')
            .replace('.git', '')
            .replace('ssh://git@', '')
            .replace('git+', '')
            .replace('git://github.com/', '');
        console.log(`getGHInfo api.github.com/repos/${part}`);
        const gh = await (0, utilities_1.httpRequest)('GET', `api.github.com`, `/repos/${part}`);
        console.log(gh);
        return gh;
    }
    catch (error) {
        console.error(error);
        return undefined;
    }
}
function ageInHours(path) {
    const info = (0, fs_1.statSync)(path);
    const d = new Date(info.mtime);
    const n = new Date();
    return (n.getTime() - d.getTime()) / 3600000;
}
async function findBestVersion(plugin) {
    let v = 'latest';
    await (0, utilities_1.showProgress)(`Finding the best version of ${plugin} that works with your project`, async () => {
        v = await (0, peer_dependencies_1.findCompatibleVersion2)({ name: plugin, conflict: undefined });
    });
    if (v == 'latest') {
        const res = await vscode_1.window.showInformationMessage(`${plugin} is not compatible with your project.`, 'Install Anyway');
        if (!res)
            return;
    }
    return v ? `${plugin}@${v}` : plugin;
}
//# sourceMappingURL=plugin-explorer.js.map