"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StarterPanel = void 0;
const vscode_1 = require("vscode");
const utilities_1 = require("./utilities");
const logging_1 = require("./logging");
const os_1 = require("os");
const workspace_state_1 = require("./workspace-state");
const path_1 = require("path");
const fs_1 = require("fs");
const capacitor_platform_1 = require("./capacitor-platform");
const node_commands_1 = require("./node-commands");
const starter_templates_1 = require("./starter-templates");
const vscode_recommendation_1 = require("./vscode-recommendation");
var MessageType;
(function (MessageType) {
    MessageType["getTemplates"] = "getTemplates";
    MessageType["getProjectsFolder"] = "getProjectsFolder";
    MessageType["createProject"] = "createProject";
    MessageType["chooseFolder"] = "chooseFolder";
    MessageType["creatingProject"] = "creatingProject";
    MessageType["openUrl"] = "openUrl";
})(MessageType || (MessageType = {}));
class StarterPanel {
    constructor(panel, extensionUri, path, context) {
        this.disposables = [];
        if (!path) {
            path = extensionUri.fsPath;
        }
        this.panel = panel;
        this.path = path;
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.webview.html = this.getWebviewContent(this.panel.webview, extensionUri);
        this.setWebviewMessageListener(this.panel.webview, extensionUri, path, context);
    }
    static init(extensionUri, path, context, force) {
        const manualNewProjects = (0, workspace_state_1.getExtSetting)(workspace_state_1.ExtensionSetting.manualNewProjects);
        if (manualNewProjects && !force)
            return;
        if (StarterPanel.currentPanel) {
            // If the webview panel already exists reveal it
            StarterPanel.currentPanel.panel.reveal(vscode_1.ViewColumn.One);
        }
        else {
            // If a webview panel does not already exist create and show a new one
            const panel = vscode_1.window.createWebviewPanel(
            // Panel view type
            'ionicStart', 
            // Panel title
            'New', vscode_1.ViewColumn.One, {
                enableScripts: true,
                localResourceRoots: [vscode_1.Uri.joinPath(extensionUri, 'out'), vscode_1.Uri.joinPath(extensionUri, 'starter', 'build')],
            });
            StarterPanel.currentPanel = new StarterPanel(panel, extensionUri, path, context);
        }
    }
    dispose() {
        StarterPanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
    getWebviewContent(webview, extensionUri) {
        const stylesUri = getUri(webview, extensionUri, ['starter', 'build', 'styles.css']);
        const runtimeUri = getUri(webview, extensionUri, ['starter', 'build', 'runtime.js']);
        const polyfillsUri = getUri(webview, extensionUri, ['starter', 'build', 'polyfills.js']);
        const scriptUri = getUri(webview, extensionUri, ['starter', 'build', 'main.js']);
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
          <title>New Project</title>
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
            switch (command) {
                case MessageType.getTemplates: {
                    const templates = starter_templates_1.starterTemplates;
                    const assetsUri = getUri(webview, extensionUri, ['starter', 'build', 'assets']).toString();
                    const packageManagers = await (0, node_commands_1.getPackageManagers)();
                    webview.postMessage({
                        command,
                        templates,
                        assetsUri,
                        frameworks: starter_templates_1.frameworks,
                        targets: starter_templates_1.targets,
                        packageManagers: packageManagers,
                    });
                    break;
                }
                case MessageType.openUrl: {
                    (0, utilities_1.openUri)(message.text);
                    break;
                }
                case MessageType.getProjectsFolder: {
                    webview.postMessage({ command, folder: getProjectsFolder() });
                    break;
                }
                case MessageType.chooseFolder: {
                    const paths = await vscode_1.window.showOpenDialog({
                        defaultUri: (0, utilities_1.isWindows)() ? undefined : vscode_1.Uri.parse(getProjectsFolder()),
                        canSelectFolders: true,
                        canSelectFiles: false,
                        canSelectMany: false,
                    });
                    if (paths && paths.length > 0) {
                        let pth = paths[0].path;
                        if ((0, utilities_1.isWindows)() && pth.startsWith('/')) {
                            pth = pth.replace('/', '');
                        }
                        setProjectsFolder(pth);
                        webview.postMessage({ command, folder: paths[0].path });
                    }
                    break;
                }
                case MessageType.createProject: {
                    createProject(JSON.parse(message.text), webview, this);
                    break;
                }
            }
        }, undefined, this.disposables);
    }
}
exports.StarterPanel = StarterPanel;
function workspaceFolder() {
    if (!vscode_1.workspace.workspaceFolders) {
        return undefined;
    }
    if (vscode_1.workspace.workspaceFolders.length == 0) {
        return undefined;
    }
    return vscode_1.workspace.workspaceFolders[0].uri.fsPath;
}
function folderEmpty(folder) {
    try {
        const files = (0, fs_1.readdirSync)(folder);
        if (!files)
            return true;
        return files.length == 0;
    }
    catch {
        return true;
    }
}
function getProjectsFolder() {
    const projectsFolder = (0, workspace_state_1.getGlobalSetting)(workspace_state_1.GlobalSetting.projectsFolder);
    if (workspaceFolder() && folderEmpty(workspaceFolder())) {
        return workspaceFolder(); // Use the users opened folder if it is empty
    }
    if (!projectsFolder) {
        return (0, utilities_1.isWindows)() ? winHomeDir() : (0, os_1.homedir)();
    }
    return projectsFolder;
}
function winHomeDir() {
    return (0, path_1.join)(process.env.USERPROFILE, 'Documents');
}
function setProjectsFolder(folder) {
    (0, workspace_state_1.setGlobalSetting)(workspace_state_1.GlobalSetting.projectsFolder, folder);
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
function getProjectName(name) {
    name = name.toLocaleLowerCase().replace(/ /g, '-');
    return name.replace(/[^a-zA-Z0-9- ]/g, '');
}
function getPackageId(name) {
    let packageId = name.replace(/ /g, '.').replace(/-/g, '.');
    if (!packageId.includes('.')) {
        packageId = `ionic.${packageId}`;
    }
    const parts = packageId.split('.');
    for (const part of parts) {
        if (!isNaN(part)) {
            packageId = packageId.replace(part, `v${part}`);
        }
    }
    return packageId.trim();
}
function getCommands(project, options, commands) {
    const isIonic = ['angular-standalone', 'angular', 'react', 'vue'].includes(project.type);
    if (isIonic)
        return getIonicTemplateCommands(project, options);
    if (project.type == 'plugin') {
        return getCapacitorPluginCommands(project, options);
    }
    commands.push('#' + options.folder);
    return commands.map((c) => {
        let r = (0, utilities_1.replaceAll)(c, '$(project-name)', options.name);
        r = (0, utilities_1.replaceAll)(r, '$(package-id)', options.packageId);
        return r;
    });
}
function getCapacitorPluginCommands(project, options) {
    const nmt = (0, utilities_1.replaceAll)((0, utilities_1.toTitleCase)((0, utilities_1.replaceAll)(options.name, '-', ' ')), ' ', '');
    const nm = (0, utilities_1.replaceAll)(options.name, ' ', '').toLowerCase();
    const nmp = (0, utilities_1.replaceAll)(nm, '-', '.');
    return [
        `npx @capacitor/create-plugin "${nm}" --name "${nm}" --package-id "com.mycompany.${nmp}" --class-name "${nmt}" --author "me" --license MIT --repo https://github.com --description "${nmt} Capacitor Plugin"`,
    ];
}
function getIonicTemplateCommands(project, options) {
    const cmds = [];
    cmds.push(`npm create ionic@beta "${options.name}" -- ${project.template} --type ${project.type} --no-git --capacitor --package-id ${options.packageId}`);
    cmds.push('#' + options.folder);
    // Cap Init
    if (project.targets.includes(capacitor_platform_1.CapacitorPlatform.android) || project.targets.includes(capacitor_platform_1.CapacitorPlatform.ios)) {
        cmds.push((0, node_commands_1.npmInstall)(`@capacitor/core`));
        cmds.push((0, node_commands_1.npmInstall)(`@capacitor/cli`));
        cmds.push((0, node_commands_1.npmInstall)(`@capacitor/app @capacitor/haptics @capacitor/keyboard @capacitor/status-bar`));
    }
    // Create Platforms
    if (project.targets.includes(capacitor_platform_1.CapacitorPlatform.android)) {
        cmds.push((0, node_commands_1.npmInstall)('@capacitor/android'));
        cmds.push('npx cap add android');
    }
    if (project.targets.includes(capacitor_platform_1.CapacitorPlatform.ios)) {
        cmds.push((0, node_commands_1.npmInstall)('@capacitor/ios'));
        cmds.push('npx cap add ios');
    }
    if (options.noGit) {
        cmds.push('git init');
    }
    return cmds;
}
async function createProject(project, webview, panel) {
    const name = getProjectName(project.name);
    const packageId = getPackageId(name);
    const noGit = !(0, utilities_1.isWindows)();
    const folder = (0, path_1.join)(getProjectsFolder(), name);
    const templates = starter_templates_1.starterTemplates;
    const template = templates.find((t) => t.name == project.template && t.type == project.type);
    if (!template) {
        vscode_1.window.showErrorMessage(`Cannot find template ${project.template} of type ${project.type}`, 'OK');
        return;
    }
    const projectOptions = { noGit, folder, packageId, name };
    const cmds = getCommands(project, projectOptions, template.commands);
    if ((0, fs_1.existsSync)(folder)) {
        // Folder already exists
        vscode_1.window.showInformationMessage(`The folder "${folder}" already exists. Please choose a unique name.`, 'OK');
        return;
    }
    webview.postMessage({ command: MessageType.creatingProject });
    try {
        if (!(await runCommands(cmds))) {
            return;
        }
        const folderPathParsed = (0, utilities_1.isWindows)() ? folder : folder.split(`\\`).join(`/`);
        (0, vscode_recommendation_1.recommendWebNativeExtension)(folderPathParsed);
        // Updated Uri.parse to Uri.file
        const folderUri = vscode_1.Uri.file(folderPathParsed);
        vscode_1.commands.executeCommand(`vscode.openFolder`, folderUri);
    }
    finally {
        panel.dispose();
    }
}
async function runCommands(cmds) {
    let folder = getProjectsFolder();
    for (const cmd of cmds) {
        if (cmd.startsWith('#')) {
            folder = cmd.replace('#', '');
            (0, logging_1.writeWN)(`Folder changed to ${folder}`);
        }
        else {
            (0, logging_1.writeWN)(cmd);
            try {
                await (0, utilities_1.run)(folder, cmd, undefined, [], undefined, undefined);
            }
            catch (e) {
                (0, logging_1.writeError)(e);
                (0, logging_1.showOutput)();
                return false;
            }
        }
    }
    return true;
}
//# sourceMappingURL=starter.js.map