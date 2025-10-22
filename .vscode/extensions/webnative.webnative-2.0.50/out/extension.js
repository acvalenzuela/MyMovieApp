'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.extensionName = void 0;
exports.activate = activate;
const context_variables_1 = require("./context-variables");
const wn_tree_provider_1 = require("./wn-tree-provider");
const process_packages_1 = require("./process-packages");
const project_1 = require("./project");
const utilities_1 = require("./utilities");
const command_name_1 = require("./command-name");
const rules_package_upgrade_1 = require("./rules-package-upgrade");
const projects_provider_1 = require("./projects-provider");
const build_configuration_1 = require("./build-configuration");
const web_configuration_1 = require("./web-configuration");
const monorepo_1 = require("./monorepo");
const android_debug_bridge_1 = require("./android-debug-bridge");
const android_debug_provider_1 = require("./android-debug-provider");
const devserver_provider_1 = require("./devserver-provider");
const android_debug_1 = require("./android-debug");
const capacitor_platform_1 = require("./capacitor-platform");
const advanced_actions_1 = require("./advanced-actions");
const plugin_explorer_1 = require("./plugin-explorer");
const features_1 = require("./features");
const web_debug_1 = require("./web-debug");
const quick_fix_1 = require("./quick-fix");
const recommend_1 = require("./recommend");
const starter_1 = require("./starter");
const vscode_1 = require("vscode");
const fs_1 = require("fs");
const command_title_1 = require("./command-title");
const workspace_state_1 = require("./workspace-state");
const preview_1 = require("./preview");
const auto_run_clipboard_1 = require("./features/auto-run-clipboard");
const fix_issue_1 = require("./features/fix-issue");
const track_project_changes_1 = require("./features/track-project-changes");
exports.extensionName = 'WebNative';
async function activate(context) {
    const rootPath = vscode_1.workspace.workspaceFolders && vscode_1.workspace.workspaceFolders.length > 0
        ? vscode_1.workspace.workspaceFolders[0].uri.fsPath
        : undefined;
    // Ionic Tree View
    const ionicProvider = new wn_tree_provider_1.ExTreeProvider(rootPath, context);
    const view = vscode_1.window.createTreeView('wn-tree', { treeDataProvider: ionicProvider });
    // Quick Fixes
    context.subscriptions.push(vscode_1.languages.registerCodeActionsProvider({ scheme: 'file', language: 'html' }, new quick_fix_1.ImportQuickFixProvider(), {
        providedCodeActionKinds: quick_fix_1.ImportQuickFixProvider.providedCodeActionKinds,
    }));
    const diagnostics = vscode_1.languages.createDiagnosticCollection('webnative');
    context.subscriptions.push(diagnostics);
    // Project List Panel
    const projectsProvider = new projects_provider_1.ProjectsProvider(rootPath, context);
    const projectsView = vscode_1.window.createTreeView('webnative-zprojects', { treeDataProvider: projectsProvider });
    const statusBarBuild = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left, 1000);
    statusBarBuild.command = command_name_1.CommandName.Debug;
    statusBarBuild.text = `$(debug-alt)`;
    statusBarBuild.tooltip = 'Debug the current project';
    statusBarBuild.show();
    context.subscriptions.push(statusBarBuild);
    const statusBarRun = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left, 1000);
    statusBarRun.command = command_name_1.CommandName.RunForWeb;
    statusBarRun.text = `$(play)`;
    statusBarRun.tooltip = 'Run the current project';
    statusBarRun.show();
    context.subscriptions.push(statusBarRun);
    wn_tree_provider_1.exState.runStatusBar = statusBarRun;
    const statusBarOpenWeb = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left, 100);
    statusBarOpenWeb.command = command_name_1.CommandName.OpenWeb;
    statusBarOpenWeb.text = `$(globe)`;
    statusBarOpenWeb.tooltip = 'Open the current project in a browser';
    statusBarOpenWeb.hide();
    context.subscriptions.push(statusBarOpenWeb);
    wn_tree_provider_1.exState.openWebStatusBar = statusBarOpenWeb;
    vscode_1.commands.registerCommand(command_name_1.CommandName.OpenWeb, async () => {
        (0, utilities_1.openUri)(wn_tree_provider_1.exState.localUrl);
    });
    const statusBarOpenEditor = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left, 100);
    statusBarOpenEditor.command = command_name_1.CommandName.OpenEditor;
    statusBarOpenEditor.text = `$(search-new-editor)`;
    statusBarOpenEditor.tooltip = 'Open the current project in an editor window';
    statusBarOpenEditor.hide();
    context.subscriptions.push(statusBarOpenEditor);
    wn_tree_provider_1.exState.openEditorStatusBar = statusBarOpenEditor;
    vscode_1.commands.registerCommand(command_name_1.CommandName.OpenEditor, async () => {
        var _a;
        (0, preview_1.viewInEditor)((_a = wn_tree_provider_1.exState.localUrl) !== null && _a !== void 0 ? _a : 'https://webnative.dev', wn_tree_provider_1.exState.externalUrl, true, false, true, true);
    });
    // Dev Server Running Panel
    const devServerProvider = new devserver_provider_1.DevServerProvider(rootPath, context);
    context.subscriptions.push(vscode_1.window.registerWebviewViewProvider('webnative-devserver', devServerProvider, {
        webviewOptions: { retainContextWhenHidden: false },
    }));
    wn_tree_provider_1.exState.view = view;
    wn_tree_provider_1.exState.projectsView = projectsView;
    wn_tree_provider_1.exState.context = context;
    // if (rootPath == undefined) {
    //     // Show the start new project panel
    //     IonicStartPanel.init(context.extensionUri, this.workspaceRoot, context);
    // }
    wn_tree_provider_1.exState.shell = context.workspaceState.get(context_variables_1.Context.shell);
    const shellOverride = vscode_1.workspace.getConfiguration(workspace_state_1.WorkspaceSection).get('shellPath');
    if (shellOverride && shellOverride.length > 0) {
        wn_tree_provider_1.exState.shell = shellOverride;
    }
    (0, track_project_changes_1.trackProjectChange)();
    // On focusing with extension if clipboard has a command give option to run it
    (0, auto_run_clipboard_1.autoRunClipboard)();
    vscode_1.commands.registerCommand(command_name_1.CommandName.Refresh, () => {
        (0, process_packages_1.clearRefreshCache)(context);
        ionicProvider.refresh();
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.Add, async () => {
        if (features_1.Features.pluginExplorer) {
            plugin_explorer_1.PluginExplorerPanel.init(context.extensionUri, rootPath, context, ionicProvider);
        }
        else {
            await (0, project_1.installPackage)(context.extensionPath, rootPath);
            if (ionicProvider) {
                ionicProvider.refresh();
            }
        }
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.Stop, async (recommendation) => {
        recommendation.tip.data = context_variables_1.Context.stop;
        await (0, fix_issue_1.fixIssue)(undefined, context.extensionPath, ionicProvider, recommendation.tip);
        recommendation.setContext(undefined);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.OpenInXCode, async () => {
        await (0, fix_issue_1.findAndRun)(ionicProvider, rootPath, command_title_1.CommandTitle.OpenInXCode);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.OpenInAndroidStudio, async () => {
        await (0, fix_issue_1.findAndRun)(ionicProvider, rootPath, command_title_1.CommandTitle.OpenInAndroidStudio);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.RunForIOS, async () => {
        await (0, fix_issue_1.findAndRun)(ionicProvider, rootPath, command_title_1.CommandTitle.RunForIOS);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.RunForAndroid, async () => {
        await (0, fix_issue_1.findAndRun)(ionicProvider, rootPath, command_title_1.CommandTitle.RunForAndroid);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.RunForWeb, async () => {
        await (0, fix_issue_1.findAndRun)(ionicProvider, rootPath, command_title_1.CommandTitle.RunForWeb);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.ShowLogs, async () => {
        wn_tree_provider_1.exState.channelFocus = true;
        (0, utilities_1.channelShow)();
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.Sync, async () => {
        await (0, fix_issue_1.findAndRun)(ionicProvider, rootPath, command_title_1.CommandTitle.Sync);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.Upgrade, async (recommendation) => {
        await (0, rules_package_upgrade_1.packageUpgrade)(recommendation.tip.data, (0, monorepo_1.getLocalFolder)(rootPath));
        ionicProvider.refresh();
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.RefreshDebug, async () => {
        wn_tree_provider_1.exState.refreshDebugDevices = true;
        ionicProvider.refresh();
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.SelectAction, async (r) => {
        await (0, advanced_actions_1.advancedActions)(r.getData());
        ionicProvider.refresh();
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.LiveReload, async () => {
        (0, workspace_state_1.setSetting)(workspace_state_1.WorkspaceSetting.liveReload, true);
        vscode_1.commands.executeCommand(context_variables_1.VSCommand.setContext, context_variables_1.Context.liveReload, true);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.LiveReloadSelected, async () => {
        (0, workspace_state_1.setSetting)(workspace_state_1.WorkspaceSetting.liveReload, false);
        vscode_1.commands.executeCommand(context_variables_1.VSCommand.setContext, context_variables_1.Context.liveReload, false);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.WebOpenBrowser, async () => {
        (0, web_configuration_1.setWebConfig)(web_configuration_1.WebConfigSetting.browser);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.WebOpenBrowserSelected, async () => {
        (0, web_configuration_1.setWebConfig)(web_configuration_1.WebConfigSetting.none);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.WebEditor, async () => {
        (0, web_configuration_1.setWebConfig)(web_configuration_1.WebConfigSetting.editor);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.WebEditorSelected, async () => {
        (0, web_configuration_1.setWebConfig)(web_configuration_1.WebConfigSetting.editor);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.WebNexusBrowser, async () => {
        (0, web_configuration_1.setWebConfig)(web_configuration_1.WebConfigSetting.nexus);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.WebNexusBrowserSelected, async () => {
        (0, web_configuration_1.setWebConfig)(web_configuration_1.WebConfigSetting.nexus);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.BuildConfig, async (r) => {
        const config = await (0, build_configuration_1.buildConfiguration)(context.extensionPath, context, r.tip.actionArg(0));
        if (!config)
            return;
        if (config != 'default') {
            r.tip.addActionArg(`--configuration=${config}`);
        }
        wn_tree_provider_1.exState.buildConfiguration = config;
        (0, fix_issue_1.runAction)(r.tip, ionicProvider, rootPath);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.RunConfig, async (r) => {
        const config = await (0, build_configuration_1.runConfiguration)(context.extensionPath, context, r.tip.actionArg(0));
        if (!config)
            return;
        if (config != 'default') {
            r.tip.addActionArg(`--configuration=${config}`);
        }
        wn_tree_provider_1.exState.runConfiguration = config;
        (0, fix_issue_1.runAction)(r.tip, ionicProvider, rootPath);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.NewProject, async () => {
        starter_1.StarterPanel.init(wn_tree_provider_1.exState.context.extensionUri, this.workspaceRoot, wn_tree_provider_1.exState.context, true);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.PluginExplorer, async () => {
        await (0, project_1.reviewProject)(rootPath, context, context.workspaceState.get('SelectedProject'));
        plugin_explorer_1.PluginExplorerPanel.init(context.extensionUri, rootPath, context, ionicProvider);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.Open, async (recommendation) => {
        if ((0, fs_1.existsSync)(recommendation.tip.secondCommand)) {
            (0, utilities_1.openUri)(recommendation.tip.secondCommand);
        }
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.RunIOS, async (recommendation) => {
        (0, fix_issue_1.runAgain)(ionicProvider, rootPath);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.Rebuild, async (recommendation) => {
        await recommendation.tip.executeAction();
        ionicProvider.refresh();
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.Function, async (recommendation) => {
        await recommendation.tip.executeAction();
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.WebDebugConfig, async (recommendation) => {
        await (0, web_debug_1.webDebugSetting)();
        ionicProvider.refresh();
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.Fix, async (tip) => {
        await (0, fix_issue_1.fix)(tip, rootPath, ionicProvider, context);
    });
    // The project list panel needs refreshing
    vscode_1.commands.registerCommand(command_name_1.CommandName.ProjectsRefresh, async (project) => {
        projectsProvider.refresh(project);
    });
    // User selected a project from the list (monorepo)
    vscode_1.commands.registerCommand(command_name_1.CommandName.ProjectSelect, async (project) => {
        context.workspaceState.update('SelectedProject', project);
        ionicProvider.selectProject(project);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.Idea, async (t) => {
        if (!t)
            return;
        // If the user clicks the light bulb it is a Tip, if they click the item it is a recommendation
        const tip = t.tip ? t.tip : t;
        await (0, fix_issue_1.fix)(tip, rootPath, ionicProvider, context);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.Run, async (r) => {
        (0, fix_issue_1.runAction)(r.tip, ionicProvider, rootPath);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.Debug, async () => {
        (0, fix_issue_1.runAction)((0, recommend_1.debugOnWeb)(wn_tree_provider_1.exState.projectRef, 'Web'), ionicProvider, rootPath);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.Build, async () => {
        (0, fix_issue_1.runAction)((0, recommend_1.buildAction)(wn_tree_provider_1.exState.projectRef), ionicProvider, rootPath);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.SelectDevice, async (r) => {
        if (r.tip.actionArg(1) == capacitor_platform_1.CapacitorPlatform.android) {
            wn_tree_provider_1.exState.selectedAndroidDevice = undefined;
            wn_tree_provider_1.exState.selectedAndroidDeviceName = undefined;
        }
        else {
            wn_tree_provider_1.exState.selectedIOSDevice = undefined;
            wn_tree_provider_1.exState.selectedIOSDeviceName = undefined;
        }
        (0, fix_issue_1.runAction)(r.tip, ionicProvider, rootPath, command_name_1.CommandName.SelectDevice);
    });
    vscode_1.commands.registerCommand(command_name_1.CommandName.Link, async (tip) => {
        await (0, utilities_1.openUri)(tip.url);
    });
    context.subscriptions.push(vscode_1.debug.registerDebugConfigurationProvider(android_debug_1.AndroidDebugType, new android_debug_provider_1.AndroidDebugProvider()));
    context.subscriptions.push(vscode_1.debug.onDidTerminateDebugSession(android_debug_bridge_1.androidDebugUnforward));
    if (!wn_tree_provider_1.exState.runWeb) {
        const summary = await (0, project_1.reviewProject)(rootPath, context, context.workspaceState.get('SelectedProject'));
        if (summary === null || summary === void 0 ? void 0 : summary.project.isCapacitor) {
            (0, features_1.showTips)();
        }
    }
    // Ensures the Dev Server is Showing
    //qrView(undefined, undefined);
}
//# sourceMappingURL=extension.js.map