"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendations = getRecommendations;
exports.debugOnWeb = debugOnWeb;
exports.buildAction = buildAction;
const analyzer_1 = require("./analyzer");
const capacitor_configure_1 = require("./capacitor-configure");
const build_1 = require("./build");
const run_web_1 = require("./run-web");
const splash_icon_1 = require("./splash-icon");
const tip_1 = require("./tip");
const rules_capacitor_migration_1 = require("./rules-capacitor-migration");
const process_packages_1 = require("./process-packages");
const capacitor_run_1 = require("./capacitor-run");
const rules_capacitor_1 = require("./rules-capacitor");
const rules_cordova_1 = require("./rules-cordova");
const rules_web_project_1 = require("./rules-web-project");
const rules_packages_1 = require("./rules-packages");
const rules_deprecated_plugins_1 = require("./rules-deprecated-plugins");
const capacitor_sync_1 = require("./capacitor-sync");
const capacitor_open_1 = require("./capacitor-open");
const capacitor_platform_1 = require("./capacitor-platform");
const scripts_1 = require("./scripts");
const context_variables_1 = require("./context-variables");
const wn_tree_provider_1 = require("./wn-tree-provider");
const android_debug_list_1 = require("./android-debug-list");
const preview_1 = require("./preview");
const rules_ionic_native_1 = require("./rules-ionic-native");
const utilities_1 = require("./utilities");
const log_server_1 = require("./log-server");
const build_configuration_1 = require("./build-configuration");
const live_reload_1 = require("./live-reload");
const node_commands_1 = require("./node-commands");
const capacitor_build_1 = require("./capacitor-build");
const workspace_state_1 = require("./workspace-state");
const update_minor_1 = require("./update-minor");
const audit_1 = require("./audit");
const analyze_size_1 = require("./analyze-size");
const ionic_export_1 = require("./ionic-export");
const angular_generate_1 = require("./angular-generate");
const log_settings_1 = require("./log-settings");
const logging_1 = require("./logging");
const tasks_1 = require("./tasks");
const command_name_1 = require("./command-name");
const command_title_1 = require("./command-title");
const vscode_1 = require("vscode");
const integrations_builder_1 = require("./integrations-builder");
const web_configuration_1 = require("./web-configuration");
const vscode_recommendation_1 = require("./vscode-recommendation");
function hasWebPackages() {
    for (const pkg of web_configuration_1.webProjectPackages) {
        if ((0, analyzer_1.exists)(pkg)) {
            return true;
        }
    }
    return false;
}
async function getRecommendations(project, context, packages) {
    var _a, _b;
    (0, utilities_1.tStart)('getRecommendations');
    const isWebProjectOnly = !(0, analyzer_1.exists)('@capacitor/core') && hasWebPackages();
    if (project.isCapacitor || isWebProjectOnly) {
        if (isWebProjectOnly) {
            project
                .setGroup('Project', 'Project Actions', tip_1.TipType.WebNative, true)
                .setData(project)
                .setContext(context_variables_1.Context.selectAction);
        }
        else {
            project.setGroup('Run', `Press ${(0, utilities_1.alt)('R')} to run the last chosen platform or Web.`, tip_1.TipType.WebNative, true);
        }
        if (project.isCapacitor) {
            (0, vscode_recommendation_1.checkRecommendedExtensions)(project.projectFolder());
        }
        const hasCapIos = project.hasCapacitorProject(capacitor_platform_1.CapacitorPlatform.ios);
        const hasCapAndroid = project.hasCapacitorProject(capacitor_platform_1.CapacitorPlatform.android);
        const title = isWebProjectOnly ? 'Run' : command_title_1.CommandTitle.RunForWeb;
        const runWeb = new tip_1.Tip(title, '', tip_1.TipType.Run, 'Serve', undefined, 'Running', // Status Bar Text
        `Project Served`)
            .setDynamicCommand(run_web_1.serve, project, false)
            .requestIPSelection()
            .setData(project.name)
            .setContextValue(context_variables_1.Context.webConfig)
            .setFeatures([tip_1.TipFeature.welcome])
            .setRunStatus((status) => {
            wn_tree_provider_1.exState.runStatusBar.text = status == tip_1.RunStatus.Running ? '$(debug-stop)' : '$(play)';
            wn_tree_provider_1.exState.openEditorStatusBar.hide();
            wn_tree_provider_1.exState.openWebStatusBar.hide();
        })
            .setRunPoints([
            { title: 'Building...', text: 'Generating browser application bundles' },
            { title: 'Serving', text: 'Development server running' },
        ])
            .canStop()
            .willNotBlock()
            .setVSCommand(command_name_1.CommandName.RunForWeb)
            .canAnimate()
            .setTooltip(`Run a development server and open using the default web browser (${(0, utilities_1.alt)('R')})`);
        project.add(runWeb, command_title_1.CommandTitle.RunForWeb);
        wn_tree_provider_1.exState.runWeb = runWeb;
        const runPoints = [
            { text: 'Copying web assets', title: 'Copying...' },
            { text: 'ng run app:build', title: 'Building Web...' },
            { text: 'capacitor run', title: 'Syncing...' },
            { text: '✔ update ios', title: 'Building Native...' },
            { text: '✔ update android', title: 'Building Native...' },
            { text: 'Running Gradle build', title: 'Deploying...' },
            { text: 'Running xcodebuild', title: 'Deploying...' },
            { text: 'App deployed', title: 'Waiting for Code Changes', refresh: true },
        ];
        if (hasCapAndroid) {
            const runAndroid = new tip_1.Tip(command_title_1.CommandTitle.RunForAndroid, (_a = wn_tree_provider_1.exState.selectedAndroidDeviceName) !== null && _a !== void 0 ? _a : '', tip_1.TipType.Run, 'Run', undefined, 'Running', 'Project is running')
                .requestDeviceSelection()
                .requestIPSelection()
                .setDynamicCommand(capacitor_run_1.capacitorRun, project, capacitor_platform_1.CapacitorPlatform.android)
                .setSecondCommand('Getting Devices', (0, capacitor_run_1.capacitorDevicesCommand)(capacitor_platform_1.CapacitorPlatform.android, project))
                .setData(project.projectFolder())
                .setRunPoints(runPoints)
                .canStop()
                .willNotBlock()
                .canAnimate()
                .canRefreshAfter()
                .setVSCommand(command_name_1.CommandName.RunForAndroid)
                .setSyncOnSuccess(capacitor_platform_1.CapacitorPlatform.android)
                .setContextValue(context_variables_1.Context.selectDevice);
            project.add(runAndroid);
            wn_tree_provider_1.exState.runAndroid = runAndroid;
        }
        if (hasCapIos) {
            const runIos = new tip_1.Tip(command_title_1.CommandTitle.RunForIOS, (_b = wn_tree_provider_1.exState.selectedIOSDeviceName) !== null && _b !== void 0 ? _b : '', tip_1.TipType.Run, 'Run', undefined, 'Running', 'Project is running')
                .requestDeviceSelection()
                .requestIPSelection()
                .setDynamicCommand(capacitor_run_1.capacitorRun, project, capacitor_platform_1.CapacitorPlatform.ios)
                .setSecondCommand('Getting Devices', (0, capacitor_run_1.capacitorDevicesCommand)(capacitor_platform_1.CapacitorPlatform.ios, project))
                .setData(project.projectFolder())
                .setRunPoints(runPoints)
                .canStop()
                .willNotBlock()
                .canAnimate()
                .canRefreshAfter()
                .setVSCommand(command_name_1.CommandName.RunForIOS)
                .setSyncOnSuccess(capacitor_platform_1.CapacitorPlatform.ios)
                .setContextValue(context_variables_1.Context.selectDevice);
            project.add(runIos);
            wn_tree_provider_1.exState.runIOS = runIos;
        }
        if (isWebProjectOnly) {
            project.add(debugOnWeb(project, 'Debug'));
        }
        else {
            const r = project.setGroup('Debug', `Running Ionic applications you can debug (${(0, utilities_1.alt)('D')})`, tip_1.TipType.WebNative, wn_tree_provider_1.exState.refreshDebugDevices || isWebProjectOnly, context_variables_1.Context.refreshDebug);
            r.whenExpanded = async () => {
                return [
                    project.asRecommendation(debugOnWeb(project, 'Web')),
                    ...(await (0, android_debug_list_1.getAndroidWebViewList)(hasCapAndroid, project.getDistFolder(), project.projectFolder())),
                ];
            };
        }
        if (!isWebProjectOnly) {
            project
                .setGroup('Project', 'Capacitor Features', tip_1.TipType.Capacitor, true)
                .setData(project)
                .setContext(context_variables_1.Context.selectAction);
        }
        (0, angular_generate_1.addAngularGenerateAction)(project);
        project.add(buildAction(project));
        if (hasCapIos || hasCapAndroid) {
            project.add(new tip_1.Tip(command_title_1.CommandTitle.Sync, '', tip_1.TipType.Sync, 'Capacitor Sync', undefined, 'Syncing', undefined)
                .setDynamicCommand(capacitor_sync_1.capacitorSync, project)
                .canStop()
                .canAnimate()
                .setVSCommand(command_name_1.CommandName.Sync)
                .setTooltip('Capacitor Sync copies the web app build assets to the native projects and updates native plugins and dependencies.'));
        }
        if (hasCapIos) {
            project.add(new tip_1.Tip(command_title_1.CommandTitle.OpenInXCode, '', tip_1.TipType.Edit, 'Opening Project in Xcode', undefined, 'Open Project in Xcode')
                .showProgressDialog()
                .setVSCommand(command_name_1.CommandName.OpenInXCode)
                .setDynamicCommand(capacitor_open_1.capacitorOpen, project, capacitor_platform_1.CapacitorPlatform.ios)
                .setTooltip('Opens the native iOS project in XCode'));
        }
        if (hasCapAndroid) {
            project.add(new tip_1.Tip(command_title_1.CommandTitle.OpenInAndroidStudio, '', tip_1.TipType.Edit, 'Opening Project in Android Studio', undefined, 'Open Android Studio')
                .showProgressDialog()
                .setVSCommand(command_name_1.CommandName.OpenInAndroidStudio)
                .setDynamicCommand(capacitor_open_1.capacitorOpen, project, capacitor_platform_1.CapacitorPlatform.android)
                .setTooltip('Opens the native Android project in Android Studio'));
        }
        if (hasCapAndroid || hasCapIos) {
            // cap build was added in v4.4.0
            if ((0, analyzer_1.isGreaterOrEqual)('@capacitor/core', '4.4.0')) {
                project.add(new tip_1.Tip('Prepare Release', '', tip_1.TipType.Build, 'Capacitor Build', undefined, 'Preparing Release Build', undefined)
                    .setQueuedAction(capacitor_build_1.capacitorBuild, project)
                    .canAnimate()
                    .setTooltip('Prepares native binaries suitable for uploading to the App Store or Play Store.'));
            }
        }
    }
    // Script Running
    (0, scripts_1.addScripts)(project, isWebProjectOnly);
    if (project.isCapacitor || project.hasACapacitorProject()) {
        // Capacitor Configure Features
        project.setGroup(`Configuration`, 'Configurations for native project. Changes made apply to both the iOS and Android projects', tip_1.TipType.Capacitor, false);
        await (0, capacitor_configure_1.reviewCapacitorConfig)(project, context);
        // Splash Screen and Icon Features
        (0, splash_icon_1.addSplashAndIconFeatures)(project);
        // Not needed: only shows Android permissions and features used
        //reviewPluginProperties(packages, project);
        project.add(new tip_1.Tip('Check for Minor Updates', '', tip_1.TipType.Dependency)
            .setQueuedAction(update_minor_1.updateMinorDependencies, project, packages)
            .setTooltip('Find minor updates for project dependencies'));
        if (project.packageManager == node_commands_1.PackageManager.npm) {
            project.add(new tip_1.Tip('Security Audit', '', tip_1.TipType.Files)
                .setQueuedAction(audit_1.audit, project)
                .setTooltip('Analyze dependencies using npm audit for security vulnerabilities'));
        }
        project.add(new tip_1.Tip('Statistics', '', tip_1.TipType.Files)
            .setQueuedAction(analyze_size_1.analyzeSize, project)
            .setTooltip('Analyze the built project assets and Javascript bundles'));
        project.add(new tip_1.Tip('Export', '', tip_1.TipType.Media)
            .setQueuedAction(ionic_export_1.ionicExport, project, wn_tree_provider_1.exState.context)
            .setTooltip('Export a markdown file with all project dependencies and plugins'));
    }
    project.setGroup(`Recommendations`, `The following recommendations were made by analyzing the package.json file of your ${project.type} app.`, tip_1.TipType.Idea, true);
    // General Rules around node modules (eg Jquery)
    (0, rules_packages_1.checkPackages)(project);
    // Deprecated removals
    for (const deprecated of (0, analyzer_1.deprecatedPackages)(packages)) {
        project.recommendRemove(deprecated.name, deprecated.name, `${deprecated.name} is deprecated: ${deprecated.message}`);
    }
    (0, rules_packages_1.checkRemoteDependencies)(project);
    // Deprecated plugins
    (0, rules_deprecated_plugins_1.checkDeprecatedPlugins)(project);
    if (project.isCordova) {
        (0, rules_cordova_1.checkCordovaRules)(project);
        if (!project.isCapacitor) {
            await (0, rules_capacitor_migration_1.capacitorMigrationChecks)(packages, project);
        }
    }
    (0, utilities_1.tEnd)('getRecommendations');
    if (project.isCapacitor) {
        (0, utilities_1.tStart)('checkCapacitorRules');
        await (0, rules_capacitor_1.checkCapacitorRules)(project, context);
        (0, utilities_1.tEnd)('checkCapacitorRules');
        (0, utilities_1.tStart)('capacitorRecommendations');
        (0, rules_ionic_native_1.checkIonicNativePackages)(packages, project);
        (0, rules_cordova_1.checkCordovaPlugins)(packages, project);
        project.tips(await (0, rules_capacitor_1.capacitorRecommendations)(project, false));
        (0, utilities_1.tEnd)('capacitorRecommendations');
    }
    (0, utilities_1.tStart)('reviewPackages');
    if (!project.isCapacitor && !project.isCordova) {
        // The project is not using Cordova or Capacitor
        (0, rules_web_project_1.webProject)(project);
    }
    // Builder
    const bTask = (0, integrations_builder_1.builderDevelopAuth)();
    if ((0, integrations_builder_1.hasBuilder)()) {
        project.setGroup(`Builder`, `These tasks are available for Builder.io`, tip_1.TipType.Builder, true, undefined, true);
        project.tips(bTask);
        project.tips((0, integrations_builder_1.checkBuilderIntegration)());
        project.add((0, integrations_builder_1.builderDevelopInteractive)());
        project.add((0, integrations_builder_1.builderDevelopPrompt)(project));
        project.add((0, integrations_builder_1.builderSettingsRules)(project));
        project.add((0, integrations_builder_1.builderOpen)());
    }
    else {
        project.tips(bTask);
    }
    // Package Upgrade Features
    (0, process_packages_1.reviewPackages)(packages, project);
    project.setGroup(`Advanced`, 'Advanced Options', tip_1.TipType.Settings, false);
    if (project.isCapacitor) {
        // if (exists('@capacitor/ios') || exists('@capacitor/android')) {
        //   project.add(liveReload());
        // }
        project.add(useHttps(project));
        //project.add(remoteLogging(project));
        project.add(new tip_1.Tip('Logging', undefined, tip_1.TipType.Settings, undefined)
            .setTooltip('Settings for logging displayed in the output window')
            .setQueuedAction(log_settings_1.LoggingSettings, project));
    }
    project.add(new tip_1.Tip('Settings', '', tip_1.TipType.Settings).setQueuedAction(settings));
    project.add(new tip_1.Tip('Show Logs', '', tip_1.TipType.Files).setQueuedAction(showLogs));
    (0, utilities_1.tEnd)('reviewPackages');
}
async function showLogs(queueFunction) {
    queueFunction();
    await vscode_1.commands.executeCommand(command_name_1.CommandName.ShowLogs);
}
async function settings(queueFunction) {
    queueFunction();
    await vscode_1.commands.executeCommand('workbench.action.openSettings', '@ext:webnative.webnative');
}
function debugOnWeb(project, title) {
    return new tip_1.Tip(title, `(${(0, preview_1.getDebugBrowserName)()})`, tip_1.TipType.Debug, 'Serve', undefined, 'Debugging', `Project Served`)
        .setDynamicCommand(run_web_1.serve, project, true, true)
        .setFeatures([tip_1.TipFeature.debugOnWeb])
        .setRunPoints([
        { title: 'Building...', text: 'Generating browser application bundles' },
        { title: 'Serving', text: 'Development server running' },
    ])
        .canStop()
        .setContextValue(context_variables_1.Context.webDebugConfig)
        .setVSCommand(command_name_1.CommandName.Debug)
        .willNotBlock()
        .canAnimate()
        .setTooltip(`Debug using ${(0, preview_1.getDebugBrowserName)()}. (${(0, utilities_1.alt)('D')})`);
}
function buildAction(project) {
    const buildConfig = (0, build_configuration_1.getBuildConfigurationName)();
    const sourceMaps = buildConfig !== 'production';
    const options = { sourceMaps };
    return new tip_1.Tip('Build', (0, build_configuration_1.getBuildConfigurationName)(), tip_1.TipType.Build, 'Build', undefined, 'Building', undefined)
        .setDynamicCommand(build_1.build, project, options)
        .setContextValue(context_variables_1.Context.buildConfig)
        .canStop()
        .canAnimate()
        .setVSCommand(command_name_1.CommandName.Build)
        .setTooltip('Builds the web project (and copies to native platforms)');
}
function liveReload() {
    const liveReload = (0, workspace_state_1.getSetting)(workspace_state_1.WorkspaceSetting.liveReload);
    return new tip_1.Tip('Live Reload', undefined, liveReload ? tip_1.TipType.Check : tip_1.TipType.Box, undefined)
        .setTooltip('Live reload will refresh the app whenever source code is changed.')
        .setQueuedAction(toggleLiveReload, liveReload)
        .canRefreshAfter();
}
function useHttps(project) {
    if (!(0, analyzer_1.exists)('@angular/core'))
        return;
    const useHttps = (0, workspace_state_1.getSetting)(workspace_state_1.WorkspaceSetting.httpsForWeb);
    return new tip_1.Tip('Use HTTPS', undefined, useHttps ? tip_1.TipType.Check : tip_1.TipType.Box, undefined)
        .setTooltip('Use HTTPS when running with web or Live Reload.')
        .setQueuedAction(toggleHttps, useHttps, project)
        .canRefreshAfter();
}
async function toggleRemoteLogging(project, current) {
    if (await (0, log_server_1.startStopLogServer)(project.folder)) {
        wn_tree_provider_1.exState.remoteLogging = !current;
    }
    await (0, tasks_1.cancelLastOperation)();
    return Promise.resolve();
}
async function toggleLiveReload(queueFunction, current) {
    queueFunction();
    await (0, workspace_state_1.setSetting)(workspace_state_1.WorkspaceSetting.liveReload, !current);
}
async function toggleHttps(queueFunction, current, project) {
    queueFunction();
    await (0, workspace_state_1.setSetting)(workspace_state_1.WorkspaceSetting.httpsForWeb, !current);
    if (!current) {
        await (0, utilities_1.showProgress)('Enabling HTTPS', async () => {
            (0, logging_1.writeWN)('Installing @jcesarmobile/ssl-skip');
            await (0, utilities_1.getRunOutput)((0, node_commands_1.npmInstall)('@jcesarmobile/ssl-skip'), project.folder);
            await (0, live_reload_1.liveReloadSSL)(project);
        });
    }
    else {
        await (0, utilities_1.showProgress)('Disabling HTTPS', async () => {
            (0, logging_1.writeWN)('Uninstalling @jcesarmobile/ssl-skip');
            await (0, utilities_1.getRunOutput)((0, node_commands_1.npmUninstall)('@jcesarmobile/ssl-skip'), project.folder);
        });
    }
    await (0, tasks_1.cancelLastOperation)();
}
//# sourceMappingURL=recommend.js.map