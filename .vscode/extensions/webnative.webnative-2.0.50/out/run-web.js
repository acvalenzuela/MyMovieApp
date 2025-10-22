"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serve = serve;
exports.selectExternalIPAddress = selectExternalIPAddress;
const fs_1 = require("fs");
const os_1 = require("os");
const build_configuration_1 = require("./build-configuration");
const command_name_1 = require("./command-name");
const wn_tree_provider_1 = require("./wn-tree-provider");
const live_reload_1 = require("./live-reload");
const monorepo_1 = require("./monorepo");
const node_commands_1 = require("./node-commands");
const live_reload_2 = require("./live-reload");
const workspace_state_1 = require("./workspace-state");
const web_configuration_1 = require("./web-configuration");
const vscode_1 = require("vscode");
const logging_1 = require("./logging");
const http_1 = require("http");
const path_1 = require("path");
const preview_1 = require("./preview");
const analyzer_1 = require("./analyzer");
/**
 * Create the ionic serve command
 * @param  {boolean} isNative Whether we are serving iOS or Android (for live reload)
 * @returns string
 */
async function serve(project, dontOpenBrowser, isDebugging, isNative) {
    wn_tree_provider_1.exState.lastRun = undefined;
    switch (project.repoType) {
        case monorepo_1.MonoRepoType.none:
            return runServe(project, dontOpenBrowser, isDebugging, isNative);
        case monorepo_1.MonoRepoType.nx:
            return nxServe(project);
        case monorepo_1.MonoRepoType.bun:
        case monorepo_1.MonoRepoType.npm:
        case monorepo_1.MonoRepoType.yarn:
        case monorepo_1.MonoRepoType.lerna:
        case monorepo_1.MonoRepoType.pnpm:
        case monorepo_1.MonoRepoType.folder:
            return command_name_1.InternalCommand.cwd + (await runServe(project, dontOpenBrowser, isDebugging));
        default:
            throw new Error('Unsupported Monorepo type');
    }
}
async function runServe(project, dontOpenBrowser, isDebugging, isNative) {
    const preop = (0, node_commands_1.preflightNPMCheck)(project);
    const httpsForWeb = (0, workspace_state_1.getSetting)(workspace_state_1.WorkspaceSetting.httpsForWeb);
    const webConfig = (0, web_configuration_1.getWebConfiguration)();
    let externalIP = !(0, workspace_state_1.getExtSetting)(workspace_state_1.ExtensionSetting.internalAddress);
    let defaultPort = vscode_1.workspace.getConfiguration(workspace_state_1.WorkspaceSection).get('defaultPort');
    if ((0, analyzer_1.exists)('next')) {
        // Disable options for nextjs apps
        externalIP = undefined;
        defaultPort = undefined;
    }
    if (webConfig.includes(web_configuration_1.WebConfigSetting.editor) && !isNative) {
        const value = vscode_1.workspace.getConfiguration(workspace_state_1.WorkspaceSection).get('openPreviewLocation');
        wn_tree_provider_1.exState.webView = (0, preview_1.viewInEditor)('about:blank', undefined, value === 'tab');
    }
    let serveFlags = '';
    wn_tree_provider_1.exState.dontOpenBrowser = dontOpenBrowser;
    if (project.frameworkType === 'angular-standalone') {
        if ([web_configuration_1.WebConfigSetting.editor, web_configuration_1.WebConfigSetting.nexus, web_configuration_1.WebConfigSetting.none].includes(webConfig) ||
            dontOpenBrowser) {
            serveFlags += ' --no-open';
        }
        else {
            serveFlags += ' --open';
        }
    }
    if (externalIP) {
        serveFlags += ` ${await externalArg(isNative)}`;
    }
    if (defaultPort) {
        const port = await findNextPort(defaultPort, externalIP ? '0.0.0.0' : undefined);
        serveFlags += ` --port=${port}`;
        wn_tree_provider_1.exState.servePort = port;
    }
    if (wn_tree_provider_1.exState.project) {
        serveFlags += ` --project=${wn_tree_provider_1.exState.project}`;
    }
    serveFlags += (0, build_configuration_1.getRunConfigurationArgs)(isDebugging);
    if (httpsForWeb) {
        serveFlags += ' --ssl';
        if (!(0, fs_1.existsSync)((0, live_reload_1.certPath)('crt'))) {
            (0, live_reload_2.liveReloadSSL)(project);
            return '';
        }
        serveFlags += ` --ssl-cert='${(0, live_reload_1.certPath)('crt')}'`;
        serveFlags += ` --ssl-key='${(0, live_reload_1.certPath)('key')}'`;
    }
    // if (liveReload) {
    //   serveFlags += ` --live-reload`;
    // }
    return `${preop}${(0, node_commands_1.npx)(project)} ${serveCmd(project)}${serveFlags}`;
}
function serveCmd(project) {
    switch (project.frameworkType) {
        case 'angular':
        case 'angular-standalone':
            return 'ng serve';
        case 'vue-vite':
        case 'react-vite':
            return 'vite';
        case 'react':
            return 'react-scripts start';
        case 'vue':
            return 'vue-cli-service serve';
        default: {
            const cmd = guessServeCommand(project) + ' -- ';
            if (cmd) {
                return cmd;
            }
            (0, logging_1.writeError)(`serve command is not know for this project type`);
        }
    }
}
function guessServeCommand(project) {
    var _a, _b, _c;
    const filename = (0, path_1.join)(project.projectFolder(), 'package.json');
    if ((0, fs_1.existsSync)(filename)) {
        const packageFile = JSON.parse((0, fs_1.readFileSync)(filename, 'utf8'));
        if (packageFile.scripts['ionic:serve']) {
            return (0, node_commands_1.npmRun)('ionic:serve');
        }
        else if ((_a = packageFile.scripts) === null || _a === void 0 ? void 0 : _a.serve) {
            return (0, node_commands_1.npmRun)('serve');
        }
        else if ((_b = packageFile.scripts) === null || _b === void 0 ? void 0 : _b.dev) {
            return (0, node_commands_1.npmRun)('dev');
        }
        else if ((_c = packageFile.scripts) === null || _c === void 0 ? void 0 : _c.start) {
            return (0, node_commands_1.npmRun)('start');
        }
    }
    return undefined;
}
async function findNextPort(port, host) {
    let availablePort = port;
    while (await isPortInUse(availablePort, host)) {
        (0, logging_1.write)(`Port ${availablePort} is in use.`);
        availablePort++;
    }
    return availablePort;
}
async function isPortInUse(port, host) {
    return new Promise((resolve) => {
        const server = (0, http_1.createServer)();
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                // Port is currently in use
                resolve(true);
            }
            else {
                // Other error occurred
                resolve(false);
            }
        });
        server.once('listening', () => {
            // Close the server if listening doesn't fail
            server.close();
            resolve(false);
        });
        server.listen(port, host);
    });
}
async function externalArg(isNative) {
    const liveReload = (0, workspace_state_1.getSetting)(workspace_state_1.WorkspaceSetting.liveReload);
    if (liveReload && isNative) {
        const host = await selectExternalIPAddress();
        return `--host=${host}`;
    }
    else {
        // Angular prefers --host=[ip]
        if (!(0, analyzer_1.exists)('@angular/core')) {
            return '--host';
        }
        else {
            return '--host=0.0.0.0';
        }
    }
    return `--host=${bestAddress()}`;
}
function bestAddress() {
    const list = getAddresses();
    return list.length == 1 ? list[0] : '0.0.0.0';
}
function nxServe(project) {
    let serveFlags = '';
    const externalIP = !(0, workspace_state_1.getExtSetting)(workspace_state_1.ExtensionSetting.internalAddress);
    if (externalIP) {
        serveFlags += ` --host=${bestAddress()}`;
    }
    return `${(0, node_commands_1.npx)(project)} nx serve ${project.monoRepo.name}${serveFlags}`;
}
async function selectExternalIPAddress() {
    const liveReload = (0, workspace_state_1.getSetting)(workspace_state_1.WorkspaceSetting.liveReload);
    const externalIP = !(0, workspace_state_1.getExtSetting)(workspace_state_1.ExtensionSetting.internalAddress);
    if (!externalIP && !liveReload) {
        return;
    }
    const list = getAddresses();
    if (list.length <= 1) {
        return list[0];
    }
    const lastIPAddress = (0, workspace_state_1.getSetting)(workspace_state_1.WorkspaceSetting.lastIPAddress);
    for (const address of list) {
        if (address == lastIPAddress) {
            return lastIPAddress;
        }
    }
    const selected = await vscode_1.window.showQuickPick(list, {
        placeHolder: 'Select the external network address to use',
    });
    if (selected) {
        (0, workspace_state_1.setSetting)(workspace_state_1.WorkspaceSetting.lastIPAddress, selected);
    }
    return selected;
}
function getAddresses() {
    const nets = (0, os_1.networkInterfaces)();
    const result = [];
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            // Skip over link-local addresses (same as Ionic CLI)
            if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254')) {
                result.push(net.address);
            }
        }
    }
    return result;
}
//# sourceMappingURL=run-web.js.map