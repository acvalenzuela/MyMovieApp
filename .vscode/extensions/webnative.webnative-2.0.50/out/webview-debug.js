"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qrView = qrView;
exports.nexusURL = nexusURL;
exports.qrWebView = qrWebView;
exports.troubleshootPlugins = troubleshootPlugins;
const vscode_1 = require("vscode");
const context_variables_1 = require("./context-variables");
const command_name_1 = require("./command-name");
const wn_tree_provider_1 = require("./wn-tree-provider");
const path_1 = require("path");
const preview_1 = require("./preview");
const utilities_1 = require("./utilities");
const logging_1 = require("./logging");
const project_1 = require("./project");
const workspace_state_1 = require("./workspace-state");
const semver_1 = require("semver");
function qrView(externalUrl, localUrl) {
    vscode_1.commands.executeCommand(context_variables_1.VSCommand.setContext, context_variables_1.Context.isDevServing, true);
    setTimeout(() => {
        vscode_1.commands.executeCommand(command_name_1.CommandName.ViewDevServer, externalUrl, localUrl);
    }, 250);
}
function nexusURL(url, externalUrl) {
    if (externalUrl) {
        url = externalUrl;
    }
    const shortUrl = url ? url === null || url === void 0 ? void 0 : url.replace('https://', '').replace('http://', '') : undefined;
    return {
        title: shortUrl,
        url: wn_tree_provider_1.exState.projectRef.isCapacitor ? `https://webnative.app/` + encodeURIComponent(shortUrl) : url,
    };
}
function qrWebView(webview, externalUrl, localUrl) {
    const onDiskPath = vscode_1.Uri.file((0, path_1.join)(wn_tree_provider_1.exState.context.extensionPath, 'resources', 'qrious.min.js'));
    const qrSrc = webview.asWebviewUri(onDiskPath);
    webview.options = { enableScripts: true };
    if ((0, workspace_state_1.getSetting)(workspace_state_1.WorkspaceSetting.pluginDrift) !== 'shown') {
        troubleshootPlugins();
    }
    const id = `${Math.random()}`;
    let title = '';
    if (!externalUrl) {
        webview.html = localUrl
            ? getWebviewQR(`<a href="${localUrl}">${localUrl}</a>`, localUrl, '', id)
            : getWebviewInitial();
    }
    else {
        const item = nexusURL(externalUrl, undefined);
        title = item.title;
        webview.html = getWebviewQR(item.title, item.url, `${qrSrc}`, id);
    }
    webview.onDidReceiveMessage(async (data) => {
        if (data.from !== id)
            return;
        switch (data.message) {
            case 'troubleshoot':
                troubleshootPlugins();
                break;
            case 'editor':
                (0, preview_1.viewInEditor)(localUrl, externalUrl, true, false, true, true);
                break;
            case 'debug':
                (0, preview_1.debugBrowser)(externalUrl, false);
                break;
            case 'logs':
                vscode_1.commands.executeCommand(command_name_1.CommandName.ShowLogs);
                break;
            case 'browser':
                (0, utilities_1.openUri)(localUrl);
                break;
            case 'restart':
                vscode_1.commands.executeCommand(command_name_1.CommandName.RunForWeb);
                setTimeout(() => {
                    vscode_1.commands.executeCommand(command_name_1.CommandName.RunForWeb);
                }, 1500);
                break;
            case 'start':
            case 'stop':
                vscode_1.commands.executeCommand(command_name_1.CommandName.RunForWeb);
                //stop(panel);
                break;
            default:
                vscode_1.window.showInformationMessage(data.message);
        }
    });
    return title;
}
async function troubleshootPlugins() {
    try {
        // Download https://nexusbrowser.com/assets/app-data.json which is the list of plugins included in nexus browser app
        const data = (await (0, utilities_1.httpRequest)('GET', 'webnative.app', '/assets/app-data.json'));
        const versions = {};
        // These plugins wont matter if they are not in the Nexus Browser
        const unimportant = ['cordova-plugin-ionic'];
        for (const plugin of data.plugins) {
            versions[plugin.name] = plugin.version;
        }
        let problems = 0;
        let problem = '';
        const pluginList = [];
        const summary = await (0, project_1.inspectProject)(wn_tree_provider_1.exState.rootFolder, wn_tree_provider_1.exState.context, undefined);
        for (const libType of ['Capacitor Plugin', 'Plugin']) {
            for (const library of Object.keys(summary.packages).sort()) {
                const pkg = summary.packages[library];
                if (pkg.depType == libType) {
                    if (versions[library]) {
                        if (versions[library] != pkg.version) {
                            const projectv = (0, semver_1.coerce)(pkg.version);
                            const browserv = (0, semver_1.coerce)(versions[library]);
                            if (projectv.major != browserv.major) {
                                (0, logging_1.writeWarning)(`Your project has v${pkg.version} of ${library} but Nexus Browser has v${versions[library]}`);
                            }
                            else {
                                (0, logging_1.write)(`[info] Your project has v${pkg.version} of ${library} but Nexus Browser has v${versions[library]}`);
                            }
                        }
                    }
                    else if (!unimportant.includes(library)) {
                        pluginList.push(library);
                        problem = library;
                        problems++;
                    }
                }
            }
        }
        if (problems == 1) {
            vscode_1.window.showWarningMessage(`Your project uses the plugin ${problem} which is not in the Nexus Browser app, so you may have issues related to its functionality.`, 'Dismiss');
        }
        else if (problems > 0) {
            (0, logging_1.writeWarning)(`Your project has these plugins: ${pluginList.join(', ')} but Nexus Browser does not. You can suggest adding these here: https://github.com/ionic-team/vscode-ionic/issues/91`);
            vscode_1.window.showWarningMessage(`Your project has ${problems} plugins that are not in the Nexus Browser app, so you may have issues related to functionality that relies on those plugins.`, 'Dismiss');
        }
    }
    catch (err) {
        (0, logging_1.writeError)(err);
    }
    finally {
        (0, workspace_state_1.setSetting)(workspace_state_1.WorkspaceSetting.pluginDrift, 'shown');
    }
}
function getWebviewQR(shortUrl, externalUrl, qrSrc, id) {
    return (`
	<!DOCTYPE html>
	<html>
	<script src="${qrSrc}"></script>
	<script>
	  const vscode = acquireVsCodeApi();
	  function action(msg) {
		  vscode.postMessage({ message: msg, from: "${id}"});
		}
	</script>
	<style>
	.container {
  padding-top: 10px;
	  width: 100%;    
	  display: flex;
	  flex-direction: column;
	}
	p { 
	  text-align: center;
	  line-height: 1.8;
	}
	i { 
	  opacity: 0.5; 
	  font-style: normal; }
	.row {
	  width: 100%;//280px;
	  margin-right: 20px;
	  text-align: center; 
	}
  .tooltip .tooltiptext {
     visibility: hidden;
     min-width: 180px;
     min-height: 20px;
     background-color: var(--vscode-editor-background);
     color: var(--vscode-button-foreground);
     text-align: center;
     padding: 1rem;
     border-radius: 6px;
     line-height: 150%;
     position: absolute;
     top: 0px;
     margin-left: -45px;
     z-index: 1;
  }

  .tooltip:hover .tooltiptext {
     visibility: visible;
  } 

	a {
	  cursor: pointer;
	}
	</style>
	<body>
	  <div class="container">
		 <div class="row tooltip">
     ` +
        (qrSrc !== ''
            ? `
       <span class="tooltiptext">Scan to view in a mobile browser</span>
      <canvas alt="Scan to view in a mobile browser" id="qr" (onClick)></canvas>
     `
            : ``) +
        `</div>
      <div class="row">
      <i>${shortUrl}</i>
      <p>Open in a <a onclick="action('browser')">Browser</a> or <a onclick="action('editor')">Editor</a><br/>
      <a onclick="action('stop')">Stop</a> or <a onclick="action('restart')">Restart</a> the dev server<br/>
      <a onclick="action('logs')">Show Logs</a>
      </p>			
		 </div>
	  </div>    
	  <script>
	  const qr = new QRious({
		background: 'transparent',
		foreground: '#888',
		element: document.getElementById('qr'),
		size: 150,
		value: '${externalUrl}'
	  });
	  </script>
	</body>
	</html>
	`);
}
function getWebviewInitial() {
    return ``;
}
//# sourceMappingURL=webview-debug.js.map