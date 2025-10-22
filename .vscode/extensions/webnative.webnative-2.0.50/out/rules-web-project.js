"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webProject = webProject;
const analyzer_1 = require("./analyzer");
const command_name_1 = require("./command-name");
const monorepo_1 = require("./monorepo");
const node_commands_1 = require("./node-commands");
const tip_1 = require("./tip");
const utilities_1 = require("./utilities");
const rules_capacitor_plugins_1 = require("./rules-capacitor-plugins");
const fs_1 = require("fs");
const path_1 = require("path");
const rules_angular_json_1 = require("./rules-angular-json");
const advanced_actions_1 = require("./advanced-actions");
const vscode_1 = require("vscode");
const ignore_1 = require("./ignore");
const wn_tree_provider_1 = require("./wn-tree-provider");
/**
 * Web projects are not using Capacitor or Cordova
 * @param  {Project} project
 */
function webProject(project) {
    if (project.isCapacitorPlugin) {
        (0, rules_capacitor_plugins_1.checkCapacitorPluginMigration)(project);
    }
    if (!project.isCapacitorPlugin) {
        project.tip(new tip_1.Tip('Integrate Capacitor', '', tip_1.TipType.Capacitor2, 'Integrate Capacitor with this project to make it native mobile?', undefined, 'Add Capacitor', 'Capacitor added to this project')
            .showProgressDialog()
            .setQueuedAction(async (queueFunction) => {
            queueFunction();
            await integrateCapacitor(project);
        }));
    }
}
async function integrateCapacitor(project) {
    const task = `Integrate Capacitor`;
    const result = await vscode_1.window.showInformationMessage(`Integrate Capacitor with this project to make it native mobile?`, task, 'About', 'Ignore');
    if (result === 'About') {
        (0, utilities_1.openUri)('https://capacitorjs.com');
        return;
    }
    if (result === 'Ignore') {
        (0, ignore_1.ignore)(new tip_1.Tip(task, ''), wn_tree_provider_1.exState.context);
        return;
    }
    if (result !== task) {
        return;
    }
    let outFolder = 'www';
    if ((0, analyzer_1.exists)('@ionic/angular') || (0, analyzer_1.exists)('ionicons')) {
        // Likely www
    }
    else {
        outFolder = 'dist';
    }
    // If there is a build folder and not a www folder then...
    if (!(0, fs_1.existsSync)((0, path_1.join)(project.projectFolder(), 'www'))) {
        if ((0, fs_1.existsSync)((0, path_1.join)(project.projectFolder(), 'build')) || (0, analyzer_1.exists)('react')) {
            outFolder = 'build'; // use build folder (usually react)
        }
        else if ((0, analyzer_1.exists)('@angular/core')) {
            outFolder = guessOutputFolder(project);
        }
        else if ((0, fs_1.existsSync)((0, path_1.join)(project.projectFolder(), 'dist')) || (0, analyzer_1.exists)('vue')) {
            outFolder = 'dist'; /// use dist folder (usually vue)
        }
    }
    const pre = project.repoType != monorepo_1.MonoRepoType.none ? command_name_1.InternalCommand.cwd : '';
    await (0, advanced_actions_1.runCommands)([
        (0, node_commands_1.npmInstall)(`@capacitor/core`),
        (0, node_commands_1.npmInstall)(`@capacitor/cli`),
        (0, node_commands_1.npmInstall)(`@capacitor/app @capacitor/haptics @capacitor/keyboard @capacitor/status-bar`),
        `${pre}${(0, node_commands_1.npx)(project)} capacitor init "${project.name}" "${(0, utilities_1.asAppId)(project.name)}" --web-dir ${outFolder}`,
        command_name_1.InternalCommand.ionicInit,
    ], 'Integrating Capacitor', project);
}
// Read the output folder from angular.json
function guessOutputFolder(project) {
    try {
        const angular = (0, rules_angular_json_1.readAngularJson)(project);
        for (const projectName of Object.keys(angular.projects)) {
            const outputPath = angular.projects[projectName].architect.build.options.outputPath;
            if (outputPath) {
                // It might be browser folder
                const browser = (0, path_1.join)(project.projectFolder(), outputPath, 'browser');
                return (0, fs_1.existsSync)(browser) ? browser : outputPath;
            }
        }
    }
    catch {
        return 'dist';
    }
}
//# sourceMappingURL=rules-web-project.js.map