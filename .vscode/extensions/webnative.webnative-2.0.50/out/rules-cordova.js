"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCordovaRules = checkCordovaRules;
exports.checkCordovaPlugins = checkCordovaPlugins;
const fs_1 = require("fs");
const analyzer_1 = require("./analyzer");
const monorepo_1 = require("./monorepo");
const node_commands_1 = require("./node-commands");
const tip_1 = require("./tip");
const utilities_1 = require("./utilities");
const ionic_export_1 = require("./ionic-export");
const wn_tree_provider_1 = require("./wn-tree-provider");
/**
 * Check rules for Cordova projects
 * @param  {Project} project
 */
function checkCordovaRules(project) {
    project.tip((0, analyzer_1.warnMinVersion)('cordova-android', '10.0.1', 'to be able to target Android SDK v30 which is required for all submissions to the Play Store'));
    project.tip((0, analyzer_1.warnMinVersion)('cordova-ios', '6.1.0'));
    if ((0, analyzer_1.isGreaterOrEqual)('cordova-android', '10.0.0')) {
        project.checkNotExists('cordova-plugin-whitelist', 'should be removed as its functionality is now built into Cordova');
        project.checkNotExists('phonegap-plugin-multidex', 'is not compatible with cordova-android 10+');
        project.checkNotExists('cordova-plugin-androidx', 'is not required when using cordova-android 10+');
        project.checkNotExists('cordova-plugin-androidx-adapter', 'is not required when using cordova-android 10+');
        project.checkNotExists('phonegap-plugin-push', 'is deprecated and does not support Android X. Migrate to using cordova-plugin-push');
        project.tip((0, analyzer_1.checkMinVersion)('cordova-plugin-inappbrowser', '5.0.0', 'to support Android 10+'));
        project.tip((0, analyzer_1.checkMinVersion)('cordova-plugin-ionic-webview', '5.0.0', 'to support Android 10+'));
        project.tip((0, analyzer_1.checkMinVersion)('scandit-cordova-datacapture-barcode', '6.9.1', 'to support Android 10+'));
        project.tip((0, analyzer_1.checkMinVersion)('cordova-plugin-ionic', '5.5.0', 'to support Android 10+'));
        project.tip((0, analyzer_1.checkCordovaAndroidPreference)(project, 'AndroidXEnabled', true));
        if ((0, analyzer_1.exists)('cordova-plugin-push') || (0, analyzer_1.exists)('@havesource/cordova-plugin-push')) {
            project.tip((0, analyzer_1.checkCordovaAndroidPreference)(project, 'GradlePluginGoogleServicesEnabled', true));
            project.tip((0, analyzer_1.checkCordovaAndroidPreferenceMinimum)('GradlePluginGoogleServicesVersion', '4.3.8'));
        }
    }
    else {
        project.checkNotExists('cordova-plugin-whitelist', 'is deprecated and no longer required with cordova-android v10+');
    }
    if (project.isCapacitor) {
        // Has both cordova and capacitor
        project.add(new tip_1.Tip('Remove Cordova', 'Remnants of Cordova are present in package.json', tip_1.TipType.Error, `Your project is based on Capacitor but has remnants of cordova in the package.json file.`, undefined, 'Fix package.json').setAfterClickAction('Fix package.json', fixPackageJson, project));
    }
    if (!project.isCapacitor) {
        project.add(new tip_1.Tip('Export', '', tip_1.TipType.Media)
            .setQueuedAction(ionic_export_1.ionicExport, project, wn_tree_provider_1.exState.context)
            .setTooltip('Export a markdown file with all project dependencies and plugins'));
    }
    if ((0, analyzer_1.isGreaterOrEqual)('@ionic/angular-toolkit', '6.0.0')) {
        // In v6 Cordova projects require @ionic/cordova-builders
        if (!(0, analyzer_1.exists)('@ionic/cordova-builders') && !project.isCapacitor) {
            project.recommendAdd('@ionic/cordova-builders', '@ionic/cordova-builders', 'Install @ionic/cordova-builders for compatibility', 'The package @ionic/cordova-builders is required when @ionic/angular-toolkit is version 6 and higher.', true);
        }
    }
    project.recommendReplace('phonegap-plugin-push', 'phonegap-plugin-push', `Replace with cordova-plugin-push due to deprecation`, `The plugin phonegap-plugin-push should be replaced with cordova-plugin-push as phonegap-plugin-push was deprecated in 2017`, '@havesource/cordova-plugin-push');
    if ((0, analyzer_1.exists)('cordova-plugin-customurlscheme') && (0, analyzer_1.exists)('ionic-plugin-deeplinks')) {
        project.recommendRemove('cordova-plugin-customurlscheme', 'cordova-plugin-customurlscheme', 'Remove as the functionality is part of ionic-plugin-deeplinks which is already installed.');
    }
    if ((0, analyzer_1.exists)('@ionic-enterprise/identity-vault')) {
        // Make sure Swift is 4.2 or 5 when using identity vault
        project.tip((0, analyzer_1.checkCordovaIosPreference)('UseSwiftLanguageVersion', [4.2, 5], 4.2));
        if (!(0, analyzer_1.isGreaterOrEqual)('@ionic-enterprise/identity-vault', '5.0.0')) {
            project.tip((0, analyzer_1.checkMinVersion)('@ionic-enterprise/identity-vault', '5.0.0', 'Update to v5 as it contains significant security fixes and broader support for Android security features', 'https://ionic.io/docs/identity-vault'));
        }
        else {
            if (!(0, analyzer_1.isGreaterOrEqual)('@ionic-enterprise/identity-vault', '5.1.0')) {
                project.tip((0, analyzer_1.checkMinVersion)('@ionic-enterprise/identity-vault', '5.1.0', 'as the current version is missing important security fixes.', 'https://ionic.io/docs/identity-vault'));
            }
        }
    }
    if ((0, analyzer_1.exists)('cordova-support-google-services') && (0, analyzer_1.isGreaterOrEqual)('cordova-android', '9.0.0')) {
        project.recommendRemove('cordova-support-google-services', 'cordova-support-google-services', 'Remove as the functionality is built into cordova-android 9+. See: https://github.com/chemerisuk/cordova-support-google-services');
    }
}
async function fixPackageJson(project) {
    // Remove cordova section
    const filename = (0, monorepo_1.getPackageJSONFilename)(project.projectFolder());
    if ((0, fs_1.existsSync)(filename)) {
        const json = (0, fs_1.readFileSync)(filename, 'utf8');
        const data = JSON.parse(json);
        delete data.cordova;
        const updated = JSON.stringify(data, undefined, 2);
        (0, fs_1.writeFileSync)(filename, updated);
    }
    if ((0, analyzer_1.exists)('cordova-ios')) {
        await (0, utilities_1.getRunOutput)((0, node_commands_1.npmUninstall)('cordova-ios'), project.folder);
    }
    if ((0, analyzer_1.exists)('cordova-android')) {
        await (0, utilities_1.getRunOutput)((0, node_commands_1.npmUninstall)('cordova-android'), project.folder);
    }
}
function checkCordovaPlugins(packages, project) {
    if (Object.keys(packages).length == 0)
        return;
    // These are plugins that are required for Cordova projects but not Capacitor
    const ignorePlugins = ['cordova-plugin-add-swift-support', 'cordova-plugin-ionic-webview'];
    const missing = [];
    for (const library of Object.keys(packages)) {
        if (packages[library].depType == 'Plugin') {
            for (const dependentPlugin of packages[library].plugin.dependentPlugins) {
                if (!(0, analyzer_1.exists)(dependentPlugin) &&
                    !ignorePlugins.includes(dependentPlugin) &&
                    !missing.includes(dependentPlugin)) {
                    missing.push(dependentPlugin);
                    project.add(new tip_1.Tip(dependentPlugin, `Missing dependency`, tip_1.TipType.Warning, `The plugin ${library} has a dependency on ${dependentPlugin} but it is missing from your project. It should be installed.`, (0, node_commands_1.npmInstall)(dependentPlugin), `Install`));
                }
            }
        }
    }
}
//# sourceMappingURL=rules-cordova.js.map