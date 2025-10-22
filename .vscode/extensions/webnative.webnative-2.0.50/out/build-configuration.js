"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBuildConfigurationName = getBuildConfigurationName;
exports.getBuildConfigurationArgs = getBuildConfigurationArgs;
exports.getRunConfigurationArgs = getRunConfigurationArgs;
exports.runConfiguration = runConfiguration;
exports.buildConfiguration = buildConfiguration;
const wn_tree_provider_1 = require("./wn-tree-provider");
const analyzer_1 = require("./analyzer");
const vscode_1 = require("vscode");
const fs_1 = require("fs");
const path_1 = require("path");
function getBuildConfigurationName() {
    if (!wn_tree_provider_1.exState.buildConfiguration || wn_tree_provider_1.exState.buildConfiguration == 'default') {
        return '';
    }
    else {
        return `(${wn_tree_provider_1.exState.buildConfiguration})`;
    }
}
function getBuildConfigurationArgs(isDebugging) {
    return getConfigurationArgs(wn_tree_provider_1.exState.buildConfiguration, isDebugging);
}
function getRunConfigurationArgs(isDebugging) {
    return getConfigurationArgs(wn_tree_provider_1.exState.runConfiguration, isDebugging);
}
function getConfigurationArgs(config, isDebugging) {
    if (isDebugging == true) {
        // If we are debugging and its an Angular project without a selected build config
        // then choose "development" so that source maps work
        if (config == 'production') {
            config = 'development'; // Assume we have this configuration
        }
    }
    if (!config || config == 'default') {
        return '';
    }
    else {
        if ((0, analyzer_1.exists)('vue') || (0, analyzer_1.exists)('react')) {
            return ` --mode=${config}`;
        }
        else {
            return ` --configuration=${config}`;
        }
    }
}
async function runConfiguration(folder, context, project) {
    return configuration(folder, context, project, 'run');
}
async function buildConfiguration(folder, context, project) {
    return configuration(folder, context, project, 'build');
}
async function configuration(folder, context, project, title) {
    let configs = [];
    const filename = (0, path_1.join)(project.projectFolder(), 'angular.json');
    if ((0, fs_1.existsSync)(filename)) {
        configs = getAngularBuildConfigs(filename);
    }
    if ((0, analyzer_1.exists)('vue') || (0, analyzer_1.exists)('react')) {
        configs = getConfigs(project);
        if (!configs.includes('development')) {
            configs.push('development');
        }
        if (!configs.includes('production')) {
            configs.push('production');
        }
    }
    if (configs.length == 0) {
        vscode_1.window.showInformationMessage(`No ${title} configurations found in this project`);
        return;
    }
    configs.unshift('default');
    const selection = await vscode_1.window.showQuickPick(configs, { placeHolder: `Select a ${title} configuration to use` });
    return selection;
}
function getConfigs(project) {
    const list = (0, fs_1.readdirSync)(project.projectFolder(), 'utf8');
    const envFiles = list.filter((file) => file.startsWith('.env.'));
    return envFiles.map((f) => f.replace('.env.', ''));
}
function getAngularBuildConfigs(filename) {
    try {
        const result = [];
        const angular = JSON.parse((0, fs_1.readFileSync)(filename, 'utf8'));
        for (const config of Object.keys(angular.projects.app.architect.build.configurations)) {
            result.push(config);
        }
        return result;
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=build-configuration.js.map