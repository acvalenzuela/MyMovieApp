"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCapacitorRules = checkCapacitorRules;
exports.capacitorRecommendations = capacitorRecommendations;
const analyzer_1 = require("./analyzer");
const rules_angular_toolkit_1 = require("./rules-angular-toolkit");
const tip_1 = require("./tip");
const utilities_1 = require("./utilities");
const capacitor_add_1 = require("./capacitor-add");
const capacitor_platform_1 = require("./capacitor-platform");
const node_commands_1 = require("./node-commands");
const command_name_1 = require("./command-name");
const monorepo_1 = require("./monorepo");
const capacitor_migrate_1 = require("./capacitor-migrate");
const rules_angular_json_1 = require("./rules-angular-json");
const rules_browserslist_1 = require("./rules-browserslist");
const wn_tree_provider_1 = require("./wn-tree-provider");
const capacitor_pwa_1 = require("./capacitor-pwa");
const logging_1 = require("./logging");
const vscode_1 = require("vscode");
const workspace_state_1 = require("./workspace-state");
const rules_angular_migrate_1 = require("./rules-angular-migrate");
const xcode_1 = require("./xcode");
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * Check rules for Capacitor projects
 * @param  {Project} project
 */
async function checkCapacitorRules(project, context) {
    project.tip((0, analyzer_1.checkMinVersion)('@capacitor/core', '2.2.0'));
    project.tip((0, analyzer_1.checkConsistentVersions)('@capacitor/core', '@capacitor/cli'));
    project.tip((0, analyzer_1.checkConsistentVersions)('@capacitor/core', '@capacitor/ios'));
    project.tip((0, analyzer_1.checkConsistentVersions)('@capacitor/core', '@capacitor/android'));
    if ((0, analyzer_1.exists)('@ionic/cli')) {
        project.tip((0, analyzer_1.checkMinVersion)('@ionic/cli', '6.0.0'));
    }
    if (!(0, analyzer_1.exists)('@capacitor/cli')) {
        // Capacitor CLI should be installed locally
        project.recommendAdd('@capacitor/cli', '@capacitor/cli', 'Install @capacitor/cli', 'The Capacitor CLI should be installed locally in your project', true);
    }
    // cordova-plugin-appsflyer-sdk doesn't build with Capacitor. Use appsflyer-capacitor-plugin instead
    // see https://github.com/AppsFlyerSDK/appsflyer-cordova-plugin#------%EF%B8%8F-note-for-capacitor-users--%EF%B8%8F------
    project.recommendReplace('cordova-plugin-appsflyer-sdk', 'cordova-plugin-appsflyer-sdk', `Replace with appsflyer-capacitor-plugin.`, `The plugin cordova-plugin-appsflyer-sdk should be replaced with appsflyer-capacitor-plugin.`, 'appsflyer-capacitor-plugin');
    project.recommendReplace('@ionic-enterprise/dialogs', '@ionic-enterprise/dialogs', `Replace with @capacitor/dialog due to official support`, `The plugin @ionic-enterprise/dialogs should be replaced with @capacitor/dialog as it is an officially supported Capacitor plugin`, '@capacitor/dialog');
    project.recommendReplace('@ionic-enterprise/app-rate', '@ionic-enterprise/app-rate', `Replace with capacitor-rate-app due to Capacitor support`, `The plugin @ionic-enterprise/app-rate should be replaced with capacitor-rate-app as designed to work with Capacitor`, 'capacitor-rate-app');
    project.recommendReplace('@ionic-enterprise/nativestorage', '@ionic-enterprise/nativestorage', `Replace with @ionic/storage due to support`, `The plugin @ionic-enterprise/nativestorage should be replaced with @ionic/storage. Consider @ionic-enterprise/secure-storage if encryption is required`, '@ionic/storage');
    project.recommendReplace('cordova-plugin-advanced-http', 'cordova-plugin-advanced-http', `Replace with @capacitor/core due to official support`, `The plugin cordova-plugin-advanced-http should be replaced with @capacitor/core. Capacitor now provides the equivalent native http functionality built in.`, '@capacitor/core');
    project.recommendRemove('@ionic-enterprise/promise', '@ionic-enterprise/promise', 'This plugin should no longer be required in projects.');
    project.recommendRemove('cordova-plugin-appminimize', 'cordova-plugin-appminimize', 'This plugin is not required and can be replaced with the minimizeApp method of @capacitor/app', undefined, 'https://capacitorjs.com/docs/apis/app#minimizeapp');
    project.recommendRemove('cordova-plugin-datepicker', 'cordova-plugin-datepicker', 'This plugin appears to have been abandoned in 2015. Consider using ion-datetime.');
    project.recommendRemove('@jcesarmobile/ssl-skip', '@jcesarmobile/ssl-skip', 'This plugin should only be used during development. Submitting an app with it included will cause it to be rejected.');
    if ((0, analyzer_1.exists)('cordova-plugin-file-transfer') && !(0, analyzer_1.exists)('cordova-plugin-whitelist')) {
        // Latest 1.7.1 of the file-transfer plugin requires whitelist in Capacitor projects. See: https://github.com/ionic-team/capacitor/issues/1199
        project.recommendAdd('cordova-plugin-whitelist', 'cordova-plugin-file-transfer', 'Install cordova-plugin-whitelist for compatibility', 'The plugin cordova-plugin-file-transfer has a dependency on cordova-plugin-whitelist when used with a Capacitor project', false);
    }
    if ((0, analyzer_1.exists)('@ionic-enterprise/auth') && (0, analyzer_1.isLessOrEqual)('onesignal-cordova-plugin', '5.0.2')) {
        project.recommendRemove('onesignal-cordova-plugin', 'onesignal-cordova-plugin', 'This plugin causes build errors on Android when used with Ionic Auth Connect. Upgrade to 5.0.3 or higher.', undefined, 'https://github.com/OneSignal/OneSignal-Cordova-SDK/issues/928');
    }
    if ((0, analyzer_1.exists)('@ionic/cordova-builders')) {
        // This is likely a leftover from a Cordova migration
        project.recommendRemove('@ionic/cordova-builders', '@ionic/cordova-builders', 'This package is only required for Cordova projects.');
    }
    if ((0, analyzer_1.isGreaterOrEqual)('@ionic/angular-toolkit', '6.0.0')) {
        (0, rules_angular_toolkit_1.checkMigrationAngularToolkit)(project);
    }
    if ((0, analyzer_1.exists)('@capacitor/ios')) {
        (0, utilities_1.tStart)('checkPrivacyManifest');
        await (0, xcode_1.checkPrivacyManifest)(project, context);
        (0, utilities_1.tEnd)('checkPrivacyManifest');
    }
    if ((0, analyzer_1.isGreaterOrEqual)('@angular/core', '12.0.0')) {
        (0, rules_angular_json_1.checkAngularJson)(project);
        if ((0, analyzer_1.exists)('@capacitor/android') || (0, analyzer_1.exists)('@capacitor/ios')) {
            (0, rules_browserslist_1.checkBrowsersList)(project);
        }
        if ((0, analyzer_1.isLess)('@ionic/cli', '7.2.0')) {
            project.tip((0, analyzer_1.checkMinVersion)('@ionic/cli', '7.2.0', 'to fix live reload support'));
        }
        if ((0, analyzer_1.isLess)('@angular/core', `${rules_angular_migrate_1.maxAngularVersion}.0.0`)) {
            const t = (0, rules_angular_migrate_1.angularMigrate)(project, rules_angular_migrate_1.maxAngularVersion);
            project.add(t);
        }
    }
    if ((0, analyzer_1.isLess)('@capacitor/android', '3.2.3')) {
        // Check minifyEnabled is false for release
        checkBuildGradleForMinifyInRelease(project);
    }
    if ((0, analyzer_1.isLess)('@capacitor/android', '3.0.0')) {
        project.tip(new tip_1.Tip(`Your app cannot be submitted to the Play Store after 1st November 2022`, undefined, tip_1.TipType.Error, undefined, undefined, undefined, undefined, 'https://capacitorjs.com/docs/updating/3-0').setTooltip(`Capacitor ${(0, analyzer_1.getPackageVersion)('@capacitor/core')} must be migrated to Capacitor 4 to meet Play Store requirements of minimum target of SDK 31. Migration to Capacitor 3 is required. Click for more information.`));
    }
    // Migration for 3.x, 4.0.0-beta, 4.0.0 to Capacitor 4.0.1+
    if ((0, analyzer_1.isLess)('@capacitor/core', '4.0.1') || (0, analyzer_1.startsWith)('@capacitor/core', '4.0.0')) {
        if (wn_tree_provider_1.exState.hasNodeModules && (0, analyzer_1.isGreaterOrEqual)('@capacitor/core', '3.0.0')) {
            // Recommend migration from 3 to 4
            project.tip(new tip_1.Tip('Migrate to Capacitor 4', '', tip_1.TipType.Capacitor)
                .setQueuedAction(capacitor_migrate_1.migrateCapacitor4, project, (0, analyzer_1.getPackageVersion)('@capacitor/core'))
                .canIgnore());
        }
    }
    suggestCapacitorMigration('4.0.0', '5.0.0', tip_1.TipType.Capacitor, project, {
        coreVersion: '5',
        versionTitle: '5',
        versionFull: '5.0.0',
        changesLink: 'https://capacitorjs.com/docs/updating/5-0',
        androidStudioMin: '222.4459.24',
        androidStudioName: 'Android Studio Flamingo (2022.2.1)',
        androidStudioReason: '(It comes with Java 17 and Gradle 8)',
        minJavaVersion: 17,
        migrateInfo: 'Capacitor 5 sets a deployment target of iOS 13 and Android 13 (SDK 33).',
        ignorePeerDependencies: ['@capacitor/'],
        minPlugins: [
            { dep: '@ionic-enterprise/identity-vault', version: '5.10.1' },
            { dep: '@ionic-enterprise/google-pay', version: '2.0.0' },
            { dep: '@ionic-enterprise/apple-pay', version: '2.0.0' },
            { dep: '@ionic-enterprise/zebra-scanner', version: '2.0.0' },
        ],
    });
    suggestCapacitorMigration('5.0.0', '6.0.0', tip_1.TipType.Capacitor, project, {
        coreVersion: '6.0.0',
        versionTitle: '6',
        versionFull: '6.0.0',
        changesLink: 'https://capacitorjs.com/docs/updating/6-0',
        androidStudioMin: '231.9392.1',
        androidStudioName: 'Android Studio Hedgehog (2023.1.1)',
        androidStudioReason: '(It comes with Gradle 8.2)',
        minJavaVersion: 17,
        migrateInfo: 'Capacitor 6 sets a deployment target of iOS 13 and Android 14 (SDK 34).',
        minPlugins: [
            { dep: '@ionic-enterprise/identity-vault', version: '5.10.1' },
            { dep: '@ionic-enterprise/google-pay', version: '2.0.0' },
            { dep: '@ionic-enterprise/apple-pay', version: '2.0.0' },
            { dep: '@ionic-enterprise/zebra-scanner', version: '2.0.0' },
        ],
        ignorePeerDependencies: [
            '@capacitor/action-sheet',
            '@capacitor/app',
            '@capacitor/app-launcher',
            '@capacitor/browser',
            '@capacitor/camera',
            '@capacitor/clipboard',
            '@capacitor/device',
            '@capacitor/dialog',
            '@capacitor/filesystem',
            '@capacitor/geolocation',
            '@capacitor/haptics',
            '@capacitor/keyboard',
            '@capacitor/local-notifications',
            '@capacitor/motion',
            '@capacitor/network',
            '@capacitor/preferences',
            '@capacitor/push-notifications',
            '@capacitor/screen-reader',
            '@capacitor/screen-orientation',
            '@capacitor/share',
            '@capacitor/splash-screen',
            '@capacitor/status-bar',
            '@capacitor/text-zoom',
            '@capacitor/toast',
        ],
    });
    suggestCapacitorMigration('6.0.0', '7.0.0', tip_1.TipType.Capacitor, project, {
        coreVersion: '7.0.1',
        versionTitle: '7',
        versionFull: '7.0.0',
        changesLink: 'https://capacitorjs.com/docs/updating/7-0',
        androidStudioMin: '231.9392.1',
        androidStudioName: 'Android Studio Ladybug (2024.2.1)',
        androidStudioReason: '(It comes with Gradle 8.7.2)',
        minJavaVersion: 21,
        migrateInfo: 'Capacitor 7 sets a deployment target of iOS 14 and Android 15 (SDK 35).',
        minPlugins: [
            { dep: '@ionic-enterprise/identity-vault', version: '5.10.1' },
            { dep: '@ionic-enterprise/google-pay', version: '2.0.0' },
            { dep: '@ionic-enterprise/apple-pay', version: '2.0.0' },
            { dep: '@ionic-enterprise/zebra-scanner', version: '2.0.0' },
        ],
        ignorePeerDependencies: [
            '@capacitor/action-sheet',
            '@capacitor/app',
            '@capacitor/app-launcher',
            '@capacitor/browser',
            '@capacitor/camera',
            '@capacitor/clipboard',
            '@capacitor/device',
            '@capacitor/dialog',
            '@capacitor/filesystem',
            '@capacitor/geolocation',
            '@capacitor/haptics',
            '@capacitor/keyboard',
            '@capacitor/local-notifications',
            '@capacitor/motion',
            '@capacitor/network',
            '@capacitor/preferences',
            '@capacitor/push-notifications',
            '@capacitor/screen-reader',
            '@capacitor/screen-orientation',
            '@capacitor/share',
            '@capacitor/splash-screen',
            '@capacitor/status-bar',
            '@capacitor/text-zoom',
            '@capacitor/toast',
        ],
    });
    if (!(0, analyzer_1.isGreaterOrEqual)('@ionic-enterprise/identity-vault', '5.1.0')) {
        project.tip((0, analyzer_1.checkMinVersion)('@ionic-enterprise/identity-vault', '5.1.0', 'as the current version is missing important security fixes.', 'https://ionic.io/docs/identity-vault'));
    }
    if ((0, analyzer_1.isLessOrEqual)('@ionic/angular-toolkit', '8.1.0') && (0, analyzer_1.isGreaterOrEqual)('@angular/core', '15.0.0')) {
        project.tip((0, analyzer_1.checkMinVersion)('@ionic/angular-toolkit', '8.1.0', 'as the current version is missing Angular 15 support.'));
    }
    if ((0, analyzer_1.isLessOrEqual)('@ionic/angular-toolkit', '11.0.1') && (0, analyzer_1.isGreaterOrEqual)('@angular/core', '17.0.0')) {
        project.tip((0, analyzer_1.checkMinVersion)('@ionic/angular-toolkit', '11.0.1', 'as the current version is missing Angular 17 standalone component support.'));
    }
}
function suggestCapacitorMigration(minCapacitorCore, maxCapacitorCore, type, project, migrateOptions) {
    if ((0, analyzer_1.isLess)('@capacitor/core', maxCapacitorCore)) {
        if (wn_tree_provider_1.exState.hasNodeModules && (0, analyzer_1.isGreaterOrEqual)('@capacitor/core', minCapacitorCore)) {
            project.tip(new tip_1.Tip(`Migrate to Capacitor ${migrateOptions.versionTitle}`, '', type)
                .setQueuedAction(capacitor_migrate_1.migrateCapacitor, project, (0, analyzer_1.getPackageVersion)('@capacitor/core'), migrateOptions)
                .canIgnore());
        }
    }
}
/**
 * These rules are shared by the Capacitor Migration which is why they return an array
 * @param  {Project} project
 * @param {bool} forMigration Whether the recommendations are for a migration of a Cordova project
 * @returns Tip
 */
async function capacitorRecommendations(project, forMigration) {
    const tips = [];
    // This is used for recommendations that arent required for a migration from Cordova but are for Capacitor projects
    // Eg go from cordova-plugin-actionsheet to @capacitor/actionsheet
    function addOptional(tip) {
        if (!forMigration) {
            tips.push(tip);
        }
    }
    // If @nxtend/capacitor (old project for ~Angular 13) and no new project then suggest extension
    if (project.repoType == monorepo_1.MonoRepoType.nx &&
        !(0, analyzer_1.exists)('@nxext/capacitor') &&
        !(0, analyzer_1.exists)('@nxtend/capacitor') &&
        (0, analyzer_1.exists)('@nrwl/workspace')) {
        tips.push(new tip_1.Tip('Add Capacitor Extension for NX', '', tip_1.TipType.Capacitor, 'Add Capacitor Extension for NX?', [(0, node_commands_1.npmInstall)('@nxext/capacitor')], 'Add Capacitor NX', 'NX Support added for your project', 'https://nxext.dev/docs/capacitor/overview.html', 'Adding NX Support...')
            .showProgressDialog()
            .canIgnore());
    }
    // Capacitor Integrations
    if (!project.fileExists('capacitor.config.ts') &&
        !project.fileExists('capacitor.config.js') &&
        !project.fileExists('capacitor.config.json') &&
        !project.isCapacitorPlugin) {
        const local = project.repoType != monorepo_1.MonoRepoType.none ? command_name_1.InternalCommand.cwd : '';
        tips.push(new tip_1.Tip('Integrate Capacitor', '', tip_1.TipType.Capacitor2, 'Add the Capacitor integration to this project', [
            (0, node_commands_1.npmInstall)('@capacitor/core@latest', '--save', '-E'),
            (0, node_commands_1.npmInstall)('@capacitor/cli@latest', '-D', '-E'),
            (0, node_commands_1.npmInstall)(`@capacitor/app @capacitor/core @capacitor/haptics @capacitor/keyboard @capacitor/status-bar`),
            `${local}${(0, node_commands_1.npx)(project)} capacitor init "${project.name}" "${(0, utilities_1.asAppId)(project.name)}" --web-dir www`,
        ], 'Add Capacitor', 'Capacitor added to this project', 'https://capacitorjs.com/docs/cordova/migrating-from-cordova-to-capacitor', 'Adding Capacitor to the project...')
            .showProgressDialog()
            .canIgnore());
    }
    else {
        if (!project.hasCapacitorProject(capacitor_platform_1.CapacitorPlatform.android) && wn_tree_provider_1.exState.hasNodeModules) {
            tips.push(new tip_1.Tip('Add Android Project', '', tip_1.TipType.Android, 'Add Android support to your Capacitor project?', [(0, node_commands_1.npmInstall)('@capacitor/android' + atVersionOfCapCLI()), (0, capacitor_add_1.capacitorAdd)(project, capacitor_platform_1.CapacitorPlatform.android)], 'Add Android', 'Android support added to your project', undefined, 'Adding Native Android Project...')
                .showProgressDialog()
                .canIgnore());
        }
        if (!project.hasCapacitorProject(capacitor_platform_1.CapacitorPlatform.ios) && wn_tree_provider_1.exState.hasNodeModules) {
            tips.push(new tip_1.Tip('Add iOS Project', '', tip_1.TipType.Apple, 'Add iOS support to your Capacitor project?', [(0, node_commands_1.npmInstall)('@capacitor/ios' + atVersionOfCapCLI()), (0, capacitor_add_1.capacitorAdd)(project, capacitor_platform_1.CapacitorPlatform.ios)], 'Add iOS', 'iOS support added to your project', undefined, 'Adding Native iOS Project...')
                .showProgressDialog()
                .canIgnore());
        }
    }
    // Treat for Angular 17+ users
    if ((0, analyzer_1.exists)('@ionic/angular') && !(0, analyzer_1.exists)('@angular/service-worker') && (0, analyzer_1.isGreaterOrEqual)('@angular/core', '17.0.0')) {
        const pwaTip = new tip_1.Tip('Add PWA Integration', '', tip_1.TipType.Edit, 'Add @angular/pwa and integrate splash and icon resources');
        tips.push(pwaTip.setQueuedAction(capacitor_pwa_1.integratePWA, project, pwaTip).canRefreshAfter());
    }
    // List of incompatible plugins
    tips.push((0, analyzer_1.incompatiblePlugin)('cordova-plugin-admobpro', 'https://github.com/ionic-team/capacitor/issues/1101'));
    tips.push((0, analyzer_1.incompatiblePlugin)('cordova-plugin-braintree', 'https://github.com/ionic-team/capacitor/issues/1415'));
    tips.push((0, analyzer_1.incompatiblePlugin)('cordova-plugin-code-push', 'https://github.com/microsoft/code-push/issues/615'));
    tips.push((0, analyzer_1.incompatiblePlugin)('cordova-plugin-fcm', 'https://github.com/ionic-team/capacitor/issues/584'));
    tips.push((0, analyzer_1.incompatiblePlugin)('cordova-plugin-firebase', 'https://github.com/ionic-team/capacitor/issues/815'));
    tips.push((0, analyzer_1.notRequiredPlugin)('cordova-support-google-services'));
    tips.push((0, analyzer_1.incompatiblePlugin)('cordova-plugin-passbook'));
    tips.push((0, analyzer_1.incompatibleReplacementPlugin)('cordova-plugin-ionic-keyboard', '@capacitor/keyboard'));
    if ((0, analyzer_1.exists)('cordova-sqlite-storage') && (0, analyzer_1.exists)('@ionic-enterprise/secure-storage')) {
        project.recommendRemove('cordova-sqlite-storage', 'Conflict with Secure Storage', 'cordova-sqlite-storage cannot be used with Secure Storage (@ionic-enterprise/secure-storage) as it will cause compilation errors. cordova-sqlite-storage should be removed.');
    }
    tips.push((0, analyzer_1.incompatiblePlugin)('cordova-plugin-firebasex', 'https://github.com/dpa99c/cordova-plugin-firebasex/issues/610#issuecomment-810236545'));
    tips.push((0, analyzer_1.incompatiblePlugin)('cordova-plugin-music-controls', 'It causes build failures, skipped'));
    tips.push((0, analyzer_1.incompatiblePlugin)('cordova-plugin-qrscanner', 'https://github.com/ionic-team/capacitor/issues/1213'));
    tips.push((0, analyzer_1.incompatiblePlugin)('cordova-plugin-swrve', 'It relies on Cordova specific feature CDVViewController'));
    tips.push((0, analyzer_1.incompatiblePlugin)('cordova-plugin-ios-keychain', 'It is not compatible with Capacitor'));
    tips.push((0, analyzer_1.replacementPlugin)('cordova-plugin-googlemaps', '@capacitor/google-maps', 'It causes build failures on iOS but can be replaced with @capacitor/google-maps and will require code refactoring.', tip_1.TipType.Error));
    tips.push((0, analyzer_1.replacementPlugin)('capacitor-rate-app', '@capacitor-community/in-app-review', 'The capacitor-rate-app plugin has been deprecated in favor of @capacitor-community/in-app-review.', tip_1.TipType.Error));
    tips.push((0, analyzer_1.incompatiblePlugin)('newrelic-cordova-plugin', 'It relies on Cordova hooks. https://github.com/newrelic/newrelic-cordova-plugin/issues/15'));
    //tips.push(incompatiblePlugin('phonegap-plugin-push', 'It will not compile but can be replaced with the plugin cordova-plugin-push'));
    tips.push((0, analyzer_1.replacementPlugin)('phonegap-plugin-push', '@havesource/cordova-plugin-push', 'It will not compile but can be replaced with the plugin cordova-plugin-push'));
    tips.push((0, analyzer_1.incompatiblePlugin)('cordova-plugin-appsflyer-sdk', 'It will not compile but can be replaced with the plugin appsflyer-capacitor-plugin'));
    if ((0, utilities_1.isMac)() && (0, analyzer_1.exists)('@capacitor/ios')) {
        const cocoaPods = await getCocoaPodsVersion(project);
        const minVersion = '1.13.0';
        const badVersions = ['1.15.0', '1.15.1']; // This version has regressions with @capacitor/live-updates
        let needsUpdating = false;
        if (cocoaPods) {
            if (!(0, analyzer_1.isVersionGreaterOrEqual)(cocoaPods, minVersion)) {
                needsUpdating = true;
            }
            if (badVersions.includes(cocoaPods)) {
                needsUpdating = true;
            }
            if (needsUpdating) {
                project.add(new tip_1.Tip('Update Cocoapods', `Cocoapods requires updating.`, tip_1.TipType.Error).setQueuedAction(updateCocoaPods, cocoaPods, project, minVersion));
            }
        }
    }
    // Plugins that are not required
    tips.push((0, analyzer_1.notRequiredPlugin)('cordova-plugin-compat'));
    if (!(0, analyzer_1.exists)('cordova-plugin-file-transfer')) {
        // Note: If you still use cordova-plugin-file-transfer it requires the whitelist plugin (https://github.com/ionic-team/capacitor/issues/1199)
        tips.push((0, analyzer_1.notRequiredPlugin)('cordova-plugin-whitelist', 'The functionality is built into Capacitors configuration file'));
    }
    tips.push((0, analyzer_1.notRequiredPlugin)('cordova-plugin-crosswalk-webview', 'Capacitor doesn’t allow to change the webview'));
    tips.push((0, analyzer_1.notRequiredPlugin)('cordova-plugin-ionic-webview', 'An App store compliant Webview is built into Capacitor'));
    tips.push((0, analyzer_1.notRequiredPlugin)('cordova-plugin-wkwebview-engine', 'An App store compliant Webview is built into Capacitor'));
    tips.push((0, analyzer_1.notRequiredPlugin)('cordova-plugin-androidx', 'This was required for Cordova Android 10 support but is not required by Capacitor'));
    tips.push((0, analyzer_1.notRequiredPlugin)('cordova-android-support-gradle-release', 'Capacitor provides control to set library versions'));
    tips.push((0, analyzer_1.notRequiredPlugin)('cordova-plugin-add-swift-support', 'Swift is supported out-of-the-box with Capacitor'));
    tips.push((0, analyzer_1.notRequiredPlugin)('cordova-plugin-enable-multidex', 'Multidex is handled by Android Studio and does not require a plugin'));
    tips.push((0, analyzer_1.notRequiredPlugin)('cordova-support-android-plugin', 'This plugin is used to simplify Cordova plugin development and is not required for Capacitor'));
    tips.push((0, analyzer_1.notRequiredPlugin)('cordova-plugin-androidx-adapter', 'Android Studio patches plugins for AndroidX without requiring this plugin'));
    tips.push((0, analyzer_1.notRequiredPlugin)('cordova-custom-config', 'Configuration achieved through native projects'));
    tips.push((0, analyzer_1.notRequiredPlugin)('cordova-plugin-cocoapod-support', 'Pod dependencies supported in Capacitor'));
    tips.push((0, analyzer_1.notRequiredPlugin)('phonegap-plugin-multidex', 'Android Studio handles compilation'));
    // Plugins which have a minimum versions
    tips.push((0, analyzer_1.checkMinVersion)('cordova-plugin-inappbrowser', '5.0.0', 'to compile in a Capacitor project'));
    tips.push((0, analyzer_1.checkMinVersion)('cordova-plugin-camera', '6.0.0', 'to compile in a Capacitor project'));
    tips.push((0, analyzer_1.checkMinVersion)('cordova.plugins.diagnostic', '6.1.1', 'to compile in a Capacitor project'));
    tips.push((0, analyzer_1.checkMinVersion)('cordova-plugin-file-opener2', '2.1.1', 'to compile in a Capacitor project'));
    tips.push((0, analyzer_1.checkMinVersion)('cordova-plugin-statusbar', '3.0.0', 'to compile in a Capacitor project'));
    tips.push((0, analyzer_1.checkMinVersion)('branch-cordova-sdk', '4.0.0', 'Requires update. See: https://help.branch.io/developers-hub/docs/capacitor'));
    // Plugins to recommend replacement with a Capacitor equivalent
    tips.push((0, analyzer_1.incompatibleReplacementPlugin)('sentry-cordova', '@sentry/capacitor'));
    addOptional((0, analyzer_1.replacementPlugin)('cordova-plugin-actionsheet', '@capacitor/action-sheet', 'https://capacitorjs.com/docs/apis/action-sheet'));
    addOptional((0, analyzer_1.replacementPlugin)('cordova-plugin-camera', '@capacitor/camera', 'https://capacitorjs.com/docs/apis/camera'));
    addOptional((0, analyzer_1.replacementPlugin)('ionic-plugin-deeplinks', '@capacitor/app', 'https://capacitorjs.com/docs/guides/deep-links'));
    addOptional((0, analyzer_1.replacementPlugin)('cordova-plugin-customurlscheme', '@capacitor/app', 'https://capacitorjs.com/docs/guides/deep-links'));
    addOptional((0, analyzer_1.replacementPlugin)('@ionic-enterprise/clipboard', '@capacitor/clipboard', 'https://capacitorjs.com/docs/apis/clipboard'));
    addOptional((0, analyzer_1.replacementPlugin)('@ionic-enterprise/deeplinks', '@capacitor/app', 'https://capacitorjs.com/docs/guides/deep-links'));
    addOptional((0, analyzer_1.replacementPlugin)('@ionic-enterprise/statusbar', '@capacitor/status-bar', 'https://capacitorjs.com/docs/apis/status-bar'));
    addOptional((0, analyzer_1.replacementPlugin)('cordova-plugin-firebase', '@capacitor-community/fcm', 'https://github.com/capacitor-community/fcm'));
    addOptional((0, analyzer_1.replacementPlugin)('cordova-plugin-firebase-messaging', '@capacitor/push-notifications', 'https://capacitorjs.com/docs/apis/push-notifications'));
    addOptional((0, analyzer_1.replacementPlugin)('cordova-plugin-firebase-analytics', '@capacitor-community/firebase-analytics', 'https://github.com/capacitor-community/firebase-analytics'));
    addOptional((0, analyzer_1.replacementPlugin)('cordova-plugin-app-version', '@capacitor/app', 'https://capacitorjs.com/docs/apis/app'));
    addOptional((0, analyzer_1.replacementPlugin)('cordova-plugin-dialogs', '@capacitor/dialog', 'https://capacitorjs.com/docs/apis/dialog'));
    // cordova-plugin-advanced-http required cordova-plugin-file
    if (!(0, analyzer_1.exists)('cordova-plugin-advanced-http')) {
        addOptional((0, analyzer_1.replacementPlugin)('cordova-plugin-file', '@capacitor/filesystem', 'https://capacitorjs.com/docs/apis/filesystem'));
    }
    addOptional((0, analyzer_1.replacementPlugin)('cordova-plugin-file-transfer', '@capacitor/filesystem', 'https://capacitorjs.com/docs/apis/filesystem'));
    addOptional((0, analyzer_1.replacementPlugin)('cordova-plugin-datepicker', '@capacitor-community/date-picker', 'https://github.com/capacitor-community/date-picker'));
    addOptional((0, analyzer_1.replacementPlugin)('cordova-plugin-geolocation', '@capacitor/geolocation', 'https://capacitorjs.com/docs/apis/geolocation'));
    addOptional((0, analyzer_1.replacementPlugin)('cordova-sqlite-storage', '@capacitor-community/sqlite', 'https://github.com/capacitor-community/sqlite'));
    addOptional((0, analyzer_1.replacementPlugin)('cordova-plugin-safariviewcontroller', '@capacitor/browser', 'https://capacitorjs.com/docs/apis/browser'));
    addOptional((0, analyzer_1.replacementPlugin)('cordova-plugin-appavailability', '@capacitor/app', 'https://capacitorjs.com/docs/apis/app'));
    addOptional((0, analyzer_1.replacementPlugin)('cordova-plugin-network-information', '@capacitor/network', 'https://capacitorjs.com/docs/apis/network'));
    addOptional((0, analyzer_1.replacementPlugin)('cordova-plugin-device', '@capacitor/device', 'https://capacitorjs.com/docs/apis/device'));
    addOptional((0, analyzer_1.replacementPlugin)('cordova-plugin-ionic-keyboard', '@capacitor/keyboard', 'https://capacitorjs.com/docs/apis/keyboard'));
    addOptional((0, analyzer_1.replacementPlugin)('cordova-plugin-splashscreen', '@capacitor/splash-screen', 'https://capacitorjs.com/docs/apis/splash-screen'));
    addOptional((0, analyzer_1.replacementPlugin)('cordova-plugin-statusbar', '@capacitor/status-bar', 'https://capacitorjs.com/docs/apis/status-bar'));
    addOptional((0, analyzer_1.replacementPlugin)('phonegap-plugin-push', '@capacitor/push-notifications', 'https://capacitorjs.com/docs/apis/push-notifications'));
    return tips;
}
// Capacity Android 3.2.3 added proguard rules for Capacitor for release build
// Get users to upgrade if they turn on minifyEnabled to true
function checkBuildGradleForMinifyInRelease(project) {
    // Look in android/app/build.gradle for "minifyEnabled true"
    const filename = (0, path_1.join)(project.folder, 'android', 'app', 'build.gradle');
    if ((0, fs_1.existsSync)(filename)) {
        const txt = (0, fs_1.readFileSync)(filename, 'utf8');
        if (txt.includes('minifyEnabled true')) {
            project.add((0, analyzer_1.checkMinVersion)('@capacitor/android', '3.2.3', 'to ensure Android release builds work when minifyEnabled is true', 'https://developer.android.com/studio/build/shrink-code'));
        }
    }
}
function atVersionOfCapCLI() {
    const version = (0, analyzer_1.getPackageVersion)('@capacitor/cli');
    return version ? `@${version.version}` : '';
}
let podHasError = false;
async function getCocoaPodsVersion(project, avoidCache) {
    if (podHasError)
        return undefined;
    try {
        const cocoaPodsVersion = (0, workspace_state_1.getSetting)(workspace_state_1.WorkspaceSetting.cocoaPods);
        if (!avoidCache && cocoaPodsVersion) {
            return cocoaPodsVersion;
        }
        let data = await (0, utilities_1.getRunOutput)('pod --version', project.folder);
        data = data.replace('\n', '');
        (0, workspace_state_1.setSetting)(workspace_state_1.WorkspaceSetting.cocoaPods, data);
        return data;
    }
    catch (error) {
        podHasError = true;
        if (error === null || error === void 0 ? void 0 : error.includes('GemNotFoundException')) {
            return 'missing';
        }
        return undefined;
    }
}
async function updateCocoaPods(queueFunction, currentVersion, project, minVersion) {
    const msg = currentVersion == 'missing' ? 'Install' : 'Update';
    const txt = `${msg} Cocoapods`;
    const data = await (0, utilities_1.getRunOutput)('which pod', project.folder);
    let cmd = 'brew install cocoapods';
    if (!data.includes('homebrew')) {
        cmd = 'gem install cocoapods --user-install';
    }
    const res = await vscode_1.window.showInformationMessage(`XCode 15 will fail during build with some plugins. ${msg} Cocoapods using "${cmd}" to fix the issue?`, txt, 'Exit');
    if (!res || res != txt)
        return;
    queueFunction();
    (0, logging_1.showOutput)();
    (0, workspace_state_1.setSetting)(workspace_state_1.WorkspaceSetting.cocoaPods, undefined);
    await (0, utilities_1.showProgress)(`${msg} Cocoapods...`, async () => {
        (0, logging_1.write)(`> ${cmd}`);
        await project.run2(cmd, false);
        const v = await getCocoaPodsVersion(project, true);
        const msg = `Cocoapods Updated to ${v}. Be sure to "Sync" your project.`;
        (0, logging_1.writeWN)(msg);
        if ((0, analyzer_1.isVersionGreaterOrEqual)(v, minVersion)) {
            vscode_1.window.showInformationMessage(msg, 'OK');
        }
    });
}
//# sourceMappingURL=rules-capacitor.js.map