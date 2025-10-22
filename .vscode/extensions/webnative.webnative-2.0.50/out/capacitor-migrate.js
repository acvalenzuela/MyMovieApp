"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateCapacitor = migrateCapacitor;
exports.migrateCapacitor4 = migrateCapacitor4;
const fs_1 = require("fs");
const path_1 = require("path");
const analyzer_1 = require("./analyzer");
const logging_1 = require("./logging");
const node_commands_1 = require("./node-commands");
const project_1 = require("./project");
const utilities_1 = require("./utilities");
const capacitor_sync_1 = require("./capacitor-sync");
const command_name_1 = require("./command-name");
const wn_tree_provider_1 = require("./wn-tree-provider");
const node_commands_2 = require("./node-commands");
const utilities_2 = require("./utilities");
const capacitor_open_1 = require("./capacitor-open");
const capacitor_platform_1 = require("./capacitor-platform");
const peer_dependencies_1 = require("./peer-dependencies");
const advanced_actions_1 = require("./advanced-actions");
const vscode_1 = require("vscode");
const utils_strings_1 = require("./utils-strings");
async function migrateCapacitor(queueFunction, project, currentVersion, options) {
    const coreVersion = options.coreVersion;
    const versionTitle = options.versionTitle;
    const versionFull = options.versionFull;
    const changesLink = options.changesLink;
    // Android Studio Flamingo is Build #AI-222.4459.24.2221.9862592, built on March 31, 2023
    const openStudio = 'Open Android Studio';
    if ((0, analyzer_1.exists)('@capacitor/android')) {
        if (!checkAndroidStudio(options.androidStudioMin)) {
            const res = await vscode_1.window.showInformationMessage(`${options.androidStudioName} is the minimum version needed for Capacitor ${versionTitle} ${options.androidStudioReason}. Choose Android Studio > Check for Updates.`, openStudio, 'Continue...');
            if (res === openStudio) {
                await (0, utilities_1.run)(project.folder, await (0, capacitor_open_1.capacitorOpen)(project, capacitor_platform_1.CapacitorPlatform.android), undefined, [], undefined, undefined);
                return;
            }
            if (!res)
                return;
        }
        const version = await checkJDK(project);
        if (version < 17) {
            const result = await vscode_1.window.showInformationMessage(`Your version of Java is ${version} but version ${options.minJavaVersion} is the minimum required. Please check your JAVA_HOME path and ensure it is using JDK Version ${options.minJavaVersion}. You may need to restart VS Code after making this change.`, 'OK', 'Continue');
            if (result !== 'Continue') {
                return;
            }
        }
    }
    (0, logging_1.clearOutput)();
    (0, logging_1.showOutput)();
    queueFunction();
    let report;
    await (0, utilities_1.showProgress)(`Checking plugins in your project...`, async () => {
        await (0, project_1.inspectProject)(wn_tree_provider_1.exState.rootFolder, wn_tree_provider_1.exState.context, undefined);
        report = await (0, peer_dependencies_1.checkPeerDependencies)(project.folder, [{ name: '@capacitor/core', version: versionFull }], options.ignorePeerDependencies);
    });
    // Set of minimum versions for dependencies
    const minVersions = options.minPlugins;
    for (const minVersion of minVersions) {
        if ((0, analyzer_1.exists)(minVersion.dep) && (0, analyzer_1.isLess)(minVersion.dep, minVersion.version)) {
            (0, logging_1.write)(`${minVersion.dep} will be updated to ${minVersion.version}`);
            report.commands.push((0, node_commands_1.npmInstall)(`${minVersion.dep}@${minVersion.version}`, (0, node_commands_1.installForceArgument)(project)));
        }
    }
    const incompatible = [
        { name: 'phonegap-plugin-barcodescanner', reason: 'it requires android.enableJetifier=true in gradle.properties' },
    ];
    for (const plugin of incompatible) {
        if ((0, analyzer_1.exists)(plugin.name)) {
            (0, logging_1.writeError)(`${plugin.name} is incompatible with Capacitor ${coreVersion} because ${plugin.reason}`);
            report.incompatible.push(plugin.name);
        }
    }
    if (report.incompatible.length > 0) {
        const result = await vscode_1.window.showErrorMessage(`There ${(0, utilities_1.plural)('are', report.incompatible.length)} ${(0, utilities_1.pluralize)('plugin', report.incompatible.length)} in your project that ${(0, utilities_1.doDoes)(report.incompatible.length)} not work with Capacitor ${versionTitle}. Filing an issue with the author is recommended.`, `Continue`, 'Exit');
        if (result != 'Continue') {
            return;
        }
    }
    const result = await vscode_1.window.showInformationMessage(options.migrateInfo, `Migrate to v${versionTitle}`, 'Ignore');
    if (result == 'Ignore') {
        return command_name_1.ActionResult.Ignore;
    }
    if (!result) {
        return;
    }
    let message = '';
    let changesTitle = '';
    await (0, utilities_1.showProgress)(`Migrating to Capacitor ${versionTitle}...`, async () => {
        if (report.commands.length > 0) {
            (0, logging_1.writeWN)(`Upgrading plugins that were incompatible with Capacitor ${versionTitle}`);
            for (const command of report.commands) {
                (0, logging_1.write)(`> ${command}`);
                await project.run2(command, true);
            }
        }
        const cmd = (0, node_commands_1.npmInstall)(`@capacitor/cli@${coreVersion} ${(0, node_commands_1.saveDevArgument)(project)} ${(0, node_commands_1.installForceArgument)(project)}`);
        (0, logging_1.write)(`> ${cmd}`);
        await project.run2(cmd, true);
        const manager = getPackageManager(wn_tree_provider_1.exState.packageManager);
        try {
            const result = await (0, utilities_1.getRunOutput)(logCmd(`npx cap migrate --noprompt --packagemanager=${manager}`), project.projectFolder());
            (0, logging_1.write)(result);
            if (result.includes('[error] npm install failed. Try deleting node_modules')) {
                (0, logging_1.writeWN)('Attempting to reinstall node modules....');
                await project.run2(logCmd((0, advanced_actions_1.removeNodeModules)()));
                await project.run2(logCmd((0, node_commands_1.npmUpdate)()));
                (0, logging_1.writeWN)('Completed install. You should sync and test your project.');
            }
            // await project.run2(cmd2);
        }
        finally {
            (0, logging_1.writeWN)(`Capacitor ${versionTitle} Migration Completed.`);
            (0, logging_1.showOutput)();
            const problems = report.incompatible.length == 0
                ? ''
                : ` but there are ${report.incompatible.length} dependencies that still need to be updated`;
            message = `Migration to Capacitor ${versionTitle} is complete${problems}. You can also read about the changes in Capacitor ${versionTitle}.`;
            changesTitle = `Capacitor ${versionTitle} Changes`;
            for (const incompat of report.incompatible) {
                (0, logging_1.writeWarning)(`${incompat} is not compatible with Capacitor ${versionTitle}`);
            }
        }
    });
    vscode_1.window.showInformationMessage(message, changesTitle, 'OK').then((res) => {
        if (res == changesTitle) {
            (0, utilities_2.openUri)(changesLink);
        }
    });
}
function logCmd(cmd) {
    (0, logging_1.write)(`> ${cmd}`);
    return cmd;
}
async function checkJDK(project) {
    let jversion = '';
    try {
        jversion = await (0, utilities_1.getRunOutput)(`java -version`, project.folder);
        const version = (0, utils_strings_1.getStringFrom)(jversion, 'version "', '"');
        return parseInt(version.split('.')[0]);
    }
    catch (error) {
        (0, logging_1.writeError)(`Unable to find the version of java installed (${jversion}): ${error}`);
        return 0;
    }
}
function checkAndroidStudio(minVersion) {
    // This returns true if the installed version of Android Studio meets the minimum version
    try {
        const studioFile = `/Applications/Android Studio.app/Contents/Resources/product-info.json`;
        if ((0, fs_1.existsSync)(studioFile)) {
            const data = (0, fs_1.readFileSync)(studioFile, 'utf-8');
            const info = JSON.parse(data);
            const build = info.buildNumber;
            const v = build.split('.');
            const version = `${v[0]}.${v[1]}.${v[2]}`;
            return (0, analyzer_1.isVersionGreaterOrEqual)(version, minVersion);
        }
    }
    catch (error) {
        (0, logging_1.writeError)(`Unable to check Android Studio Version ${error}`);
        return true;
    }
    return true;
}
async function migrateCapacitor4(queueFunction, project, currentVersion) {
    const coreVersion = '^4.0.1';
    const pluginVersion = '^4.0.1';
    const daysLeft = daysUntil(new Date('11/01/2022'));
    let warning = `Google Play Store requires a minimum target of SDK 31 by 1st November 2022`;
    if (daysLeft > 0) {
        warning += ` (${daysLeft} days left)`;
    }
    const result = await vscode_1.window.showInformationMessage(`Capacitor 4 sets a deployment target of iOS 13 and Android 12 (SDK 32). ${warning}`, 'Migrate to v4', 'Ignore');
    if (result == 'Ignore') {
        return command_name_1.ActionResult.Ignore;
    }
    if (!result) {
        return;
    }
    queueFunction();
    await (0, utilities_1.showProgress)(`Migrating to Capacitor 4`, async () => {
        try {
            let replaceStorage = false;
            if ((0, analyzer_1.exists)('@capacitor/storage')) {
                await project.run2((0, node_commands_1.npmUninstall)(`@capacitor/storage --force`));
                replaceStorage = true;
            }
            if ((0, analyzer_1.exists)('@capacitor/cli')) {
                await project.run2((0, node_commands_1.npmInstall)(`@capacitor/cli@4 ${(0, node_commands_1.saveDevArgument)(project)} ${(0, node_commands_1.installForceArgument)(project)}`));
            }
            await project.run2(install(['@capacitor/core', '@capacitor/ios', '@capacitor/android', '@capacitor/cli'], [
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
                '@capacitor/google-maps',
                '@capacitor/haptics',
                '@capacitor/keyboard',
                '@capacitor/local-notifications',
                '@capacitor/motion',
                '@capacitor/network',
                '@capacitor/push-notifications',
                '@capacitor/screen-reader',
                '@capacitor/share',
                '@capacitor/splash-screen',
                '@capacitor/status-bar',
                '@capacitor/text-zoom',
                '@capacitor/toast',
            ], coreVersion, pluginVersion));
            if (replaceStorage) {
                await project.run2((0, node_commands_1.npmInstall)(`@capacitor/preferences@${pluginVersion}`));
                (0, logging_1.writeWN)('Migrated @capacitor/storage to @capacitor/preferences.');
            }
            if ((0, analyzer_1.exists)('@capacitor/ios')) {
                // Set deployment target to 13.0
                updateFile(project, (0, path_1.join)('ios', 'App', 'App.xcodeproj', 'project.pbxproj'), 'IPHONEOS_DEPLOYMENT_TARGET = ', ';', '13.0');
                // Update Podfile to 13.0
                updateFile(project, (0, path_1.join)('ios', 'App', 'Podfile'), `platform :ios, '`, `'`, '13.0');
                patchPodFile((0, path_1.join)(project.projectFolder(), 'ios', 'App', 'Podfile'));
                // Remove touchesBegan
                updateFile(project, (0, path_1.join)('ios', 'App', 'App', 'AppDelegate.swift'), `override func touchesBegan`, `}`);
                // Remove NSAppTransportSecurity
                removeKey((0, path_1.join)(project.projectFolder(), 'ios', 'App', 'App', 'info.plist'), 'NSAppTransportSecurity');
                // Remove USE_PUSH
                replacePush((0, path_1.join)(project.projectFolder(), 'ios', 'App', 'App.xcodeproj', 'project.pbxproj'));
                // Remove from App Delegate
                removeInFile((0, path_1.join)(project.projectFolder(), 'ios', 'App', 'App', 'AppDelegate.swift'), `#if USE_PUSH`, `#endif`);
            }
            if ((0, analyzer_1.exists)('@capacitor/android')) {
                // AndroidManifest.xml add attribute: <activity android:exported="true"
                updateAndroidManifest((0, path_1.join)(project.projectFolder(), 'android', 'app', 'src', 'main', 'AndroidManifest.xml'));
                // Update styles.xml for SplashScreen
                updateStyles((0, path_1.join)(project.projectFolder(), 'android', 'app', 'src', 'main', 'res', 'values', 'styles.xml'));
                // Update build.gradle
                updateBuildGradle((0, path_1.join)(project.projectFolder(), 'android', 'build.gradle'));
                updateAppBuildGradle((0, path_1.join)(project.projectFolder(), 'android', 'app', 'build.gradle'));
                // Update MainActivity.java
                updateMainActivity((0, path_1.join)(project.projectFolder(), 'android', 'app', 'src', 'main'));
                // Update gradle-wrapper.properties
                updateGradleWrapper((0, path_1.join)(project.projectFolder(), 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties'));
                // Update .gitIgnore
                updateGitIgnore((0, path_1.join)(project.projectFolder(), 'android', '.gitignore'), [
                    `# Generated Config files`,
                    `app/src/main/assets/capacitor.config.json`,
                    `app/src/main/assets/capacitor.plugins.json`,
                    `app/src/main/res/xml/config.xml`,
                ]);
                // Update .gitIgnore
                updateGitIgnore((0, path_1.join)(project.projectFolder(), 'ios', '.gitignore'), [
                    `# Generated Config files`,
                    `App/App/capacitor.config.json`,
                    `App/App/config.xml`,
                ]);
                // Variables gradle
                const variables = {
                    minSdkVersion: 22,
                    compileSdkVersion: 32,
                    targetSdkVersion: 32,
                    coreSplashScreenVersion: '1.0.0',
                    androidxWebkitVersion: '1.4.0',
                    androidxActivityVersion: '1.4.0',
                    androidxAppCompatVersion: '1.4.2',
                    androidxCoordinatorLayoutVersion: '1.2.0',
                    androidxCoreVersion: '1.8.0',
                    androidxFragmentVersion: '1.4.1',
                    junitVersion: '4.13.2',
                    androidxJunitVersion: '1.1.3',
                    androidxEspressoCoreVersion: '3.4.0',
                    cordovaAndroidVersion: '10.1.1',
                    androidxMaterialVersion: '1.6.1',
                    androidxBrowserVersion: '1.4.0',
                    firebaseMessagingVersion: '23.0.5',
                    playServicesLocationVersion: '20.0.0',
                    androidxExifInterfaceVersion: '1.3.3',
                };
                for (const variable of Object.keys(variables)) {
                    if (!updateFile(project, (0, path_1.join)('android', 'variables.gradle'), `${variable} = '`, `'`, variables[variable].toString(), true)) {
                        if (!updateFile(project, (0, path_1.join)('android', 'variables.gradle'), `${variable} = `, `\n`, addQuotes(variables[variable].toString()), true)) {
                            // Add variables if they are in the core list of required ones
                            if ([
                                'coreSplashScreenVersion',
                                'cordovaAndroidVersion',
                                'androidxCoordinatorLayoutVersion',
                                'androidxCoordinatorLayoutVersion',
                                'androidxFragmentVersion',
                                'androidxActivityVersion',
                            ].includes(variable)) {
                                updateVariablesGradle((0, path_1.join)(project.projectFolder(), 'android', 'variables.gradle'), variable, variables[variable].toString());
                            }
                        }
                    }
                }
            }
            // Ran Cap Sync
            await project.run2(await (0, capacitor_sync_1.capacitorSync)(project), true);
            (0, logging_1.writeWN)('Capacitor 4 Migration Completed.');
            writeBreakingChanges();
            (0, logging_1.showOutput)();
            const message = `Migration to Capacitor ${coreVersion} is complete. Run and test your app!`;
            vscode_1.window.showInformationMessage(message, 'OK');
        }
        catch (err) {
            (0, logging_1.writeError)(`Failed to migrate: ${err}`);
        }
    });
}
function getPackageManager(manager) {
    switch (manager) {
        case node_commands_2.PackageManager.npm:
            return 'npm';
        case node_commands_2.PackageManager.bun:
            return 'bun';
        case node_commands_2.PackageManager.pnpm:
            return 'pnpm';
        case node_commands_2.PackageManager.yarn:
            return 'yarn';
        default:
            (0, logging_1.writeError)(`Unknown package manager ${manager}`);
    }
}
function addQuotes(value) {
    if (value && value.includes('.')) {
        return `'${value}'`;
    }
    return value;
}
function writeBreakingChanges() {
    const breaking = [
        '@capacitor/storage',
        '@capacitor/camera',
        '@capacitor/push-notifications',
        '@capacitor/local-notifications',
    ];
    const broken = [];
    for (const lib of breaking) {
        if ((0, analyzer_1.exists)(lib)) {
            broken.push(lib);
        }
    }
    if (broken.length > 0) {
        (0, logging_1.writeWN)(`IMPORTANT: Review https://capacitorjs.com/docs/updating/4-0#plugins for breaking changes in these plugins that you use: ${broken.join(', ')}.`);
    }
    else {
        (0, logging_1.writeWN)('IMPORTANT: Review https://capacitorjs.com/docs/updating/4-0 for optional manual updates.');
    }
    if ((0, analyzer_1.exists)('@capacitor/android')) {
        (0, logging_1.writeWN)('Warning: The Android Gradle plugin was updated and it requires Java 11 to run (included with Android Studio). You may need to select this in Android Studio (Preferences > Build, Execution, Deployment > Build Tools > Gradle).');
    }
}
function updateVariablesGradle(filename, variable, value) {
    let txt = readFile(filename);
    if (!txt) {
        return;
    }
    txt = txt.replace('}', `    ${variable}='${value}'\n}`);
    (0, fs_1.writeFileSync)(filename, txt, 'utf-8');
    (0, logging_1.writeWN)(`Migrated variables.gradle by adding ${variable} = ${value}.`);
}
function updateAndroidManifest(filename) {
    const txt = readFile(filename);
    if (!txt) {
        return;
    }
    // AndroidManifest.xml add attribute: <activity android:exported="true"
    const activity = (0, utils_strings_1.getStringFrom)(txt, '<activity', '>');
    if (activity.includes('android:exported="')) {
        return;
    }
    const replaced = (0, utils_strings_1.setAllStringIn)(txt, '<activity', ' ', ' android:exported="true"');
    if (txt == replaced) {
        (0, logging_1.writeError)(`Unable to update Android Manifest. Missing <activity> tag`);
        return;
    }
    (0, fs_1.writeFileSync)(filename, replaced, 'utf-8');
    (0, logging_1.writeWN)(`Migrated AndroidManifest.xml by adding android:exported attribute to Activity.`);
}
function removeKey(filename, key) {
    const txt = readFile(filename);
    if (!txt) {
        return;
    }
    let lines = txt.split('\n');
    let removed = false;
    let removing = false;
    lines = lines.filter((line) => {
        if (removing && line.includes('</dict>')) {
            removing = false;
            return false;
        }
        if (line.includes(`<key>${key}</key`)) {
            removing = true;
            removed = true;
        }
        return !removing;
    });
    if (removed) {
        (0, fs_1.writeFileSync)(filename, lines.join('\n'), 'utf-8');
        (0, logging_1.writeWN)(`Migrated info.plist by removing  ${key} key.`);
    }
}
function updateMainActivity(path) {
    function findFilesInDir(startPath, filter) {
        let results = [];
        if (!(0, fs_1.existsSync)(startPath)) {
            return;
        }
        const files = (0, fs_1.readdirSync)(startPath);
        for (let i = 0; i < files.length; i++) {
            const filename = (0, path_1.join)(startPath, files[i]);
            const stat = (0, fs_1.lstatSync)(filename);
            if (stat.isDirectory()) {
                results = results.concat(findFilesInDir(filename, filter)); //recurse
            }
            else if (filename.toLowerCase().indexOf(filter) >= 0) {
                results.push(filename);
            }
        }
        return results;
    }
    const list = findFilesInDir(path, 'mainactivity.java');
    for (const file of list) {
        let data = readFile(file);
        if (data) {
            const bindex = data.indexOf('this.init(savedInstanceState');
            if (bindex !== -1) {
                const eindex = data.indexOf('}});', bindex) + 4;
                data = data.replace(data.substring(bindex, eindex), '');
                data = data.replace('// Initializes the Bridge', '');
            }
            const rindex = data.indexOf('registerPlugin');
            const superLine = 'super.onCreate(savedInstanceState);';
            if (rindex !== -1) {
                if (data.indexOf(superLine) < rindex) {
                    const linePadding = rindex - data.indexOf(superLine) - superLine.length - 1;
                    data = data.replace(`${superLine}\n${' '.repeat(linePadding)}`, '');
                    const eindex = data.lastIndexOf('.class);') + 8;
                    data = data.replace(data.substring(bindex, eindex), `${data.substring(bindex, eindex)}\n${' '.repeat(linePadding) + superLine.padStart(linePadding)}`);
                }
            }
            if (bindex == -1 && rindex == -1) {
                return;
            }
            (0, fs_1.writeFileSync)(file, data);
        }
    }
}
function updateGitIgnore(filename, lines) {
    const txt = readFile(filename);
    if (!txt) {
        return;
    }
    let replaced = txt;
    for (const line of lines) {
        if (!replaced.includes(line)) {
            replaced += line + '\n';
        }
    }
    if (replaced !== txt) {
        (0, fs_1.writeFileSync)(filename, replaced, 'utf-8');
        (0, logging_1.writeWN)(`Migrated .gitignore by adding generated config files.`);
    }
}
function patchPodFile(filename) {
    const txt = readFile(filename);
    if (!txt) {
        return;
    }
    let replaced = txt;
    if (!replaced.includes('pods_helpers')) {
        replaced = `require_relative '../../node_modules/@capacitor/ios/scripts/pods_helpers'\n\n` + replaced;
    }
    if (!replaced.includes('post_install')) {
        replaced += `\n\npost_install do |installer|\n  assertDeploymentTarget(installer)\nend\n`;
    }
    else {
        if (!replaced.includes('assertDeploymentTarget(installer)')) {
            replaced = replaced.replace(`post_install do |installer|`, `post_install do |installer|\n  assertDeploymentTarget(installer)\n`);
        }
    }
    if (replaced !== txt) {
        (0, fs_1.writeFileSync)(filename, replaced, 'utf-8');
        (0, logging_1.writeWN)(`Migrated Podfile by assertingDeploymentTarget.`);
    }
}
function removeInFile(filename, startLine, endLine) {
    const txt = readFile(filename);
    if (!txt) {
        return;
    }
    let changed = false;
    let lines = txt.split('\n');
    let removing = false;
    lines = lines.filter((line) => {
        if (line.includes(endLine)) {
            removing = false;
            return false;
        }
        if (line.includes(startLine)) {
            removing = true;
            changed = true;
        }
        return !removing;
    });
    if (changed) {
        (0, fs_1.writeFileSync)(filename, lines.join('\n'), 'utf-8');
        (0, logging_1.writeWN)(`Migrated ${filename} by removing ${startLine}.`);
    }
}
function replacePush(filename) {
    const txt = readFile(filename);
    if (!txt) {
        return;
    }
    let replaced = txt;
    replaced = replaced.replace('DEBUG USE_PUSH', 'DEBUG');
    replaced = replaced.replace('USE_PUSH', '""');
    if (replaced != txt) {
        (0, fs_1.writeFileSync)(filename, replaced, 'utf-8');
        (0, logging_1.writeWN)(`Migrated ${filename} by removing USE_PUSH.`);
    }
}
function updateGradleWrapper(filename) {
    const txt = readFile(filename);
    if (!txt) {
        return;
    }
    let replaced = txt;
    replaced = (0, utils_strings_1.setAllStringIn)(replaced, 'distributionUrl=', '\n', 
    // eslint-disable-next-line no-useless-escape
    `https\://services.gradle.org/distributions/gradle-7.4.2-bin.zip`);
    if (txt != replaced) {
        (0, fs_1.writeFileSync)(filename, replaced, 'utf-8');
        (0, logging_1.writeWN)(`Migrated gradle-wrapper.properties by updating gradle version from 7.0 to 7.4.2.`);
    }
}
function readFile(filename) {
    try {
        if (!(0, fs_1.existsSync)(filename)) {
            (0, logging_1.writeError)(`Unable to find ${filename}. Try updating it manually`);
            return;
        }
        return (0, fs_1.readFileSync)(filename, 'utf-8');
    }
    catch (err) {
        (0, logging_1.writeError)(`Unable to read ${filename}. Verify it is not already open. ${err}`);
    }
}
function updateAppBuildGradle(filename) {
    const txt = readFile(filename);
    if (!txt) {
        return;
    }
    let replaced = txt;
    function add(line) {
        if (!replaced.includes(line)) {
            replaced = replaced.replace('dependencies {', `dependencies {\n    ${line}`);
        }
    }
    add('implementation "androidx.coordinatorlayout:coordinatorlayout:$androidxCoordinatorLayoutVersion"');
    add('implementation "androidx.core:core-splashscreen:$coreSplashScreenVersion"');
    if (txt != replaced) {
        (0, fs_1.writeFileSync)(filename, replaced, 'utf-8');
        (0, logging_1.writeWN)(`Migrated ${filename}`);
    }
}
function updateStyles(filename) {
    const txt = readFile(filename);
    if (!txt) {
        return;
    }
    let replaced = txt;
    //if (exists('@capacitor/splash-screen')) {
    replaced = replaced.replace('<style name="AppTheme.NoActionBarLaunch" parent="AppTheme.NoActionBar">', '<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">');
    //}
    replaced = replaced.replace(`parent="Theme.AppCompat.NoActionBar"`, `parent="Theme.AppCompat.DayNight.NoActionBar"`);
    if (txt != replaced) {
        (0, fs_1.writeFileSync)(filename, replaced, 'utf-8');
        (0, logging_1.writeWN)(`Migrated ${filename} for Android 12 splash screen.`);
    }
}
function updateBuildGradle(filename) {
    // In build.gradle add dependencies:
    // classpath 'com.android.tools.build:gradle:7.2.1'
    // classpath 'com.google.gms:google-services:4.3.13'
    const txt = readFile(filename);
    if (!txt) {
        return;
    }
    const neededDeps = {
        'com.android.tools.build:gradle': '7.2.1',
        'com.google.gms:google-services': '4.3.13',
    };
    let replaced = txt;
    for (const dep of Object.keys(neededDeps)) {
        if (!replaced.includes(`classpath '${dep}`)) {
            replaced = txt.replace('dependencies {', `dependencies {\n        classpath '${dep}:${neededDeps[dep]}'`);
        }
        else {
            const current = (0, utils_strings_1.getStringFrom)(replaced, `classpath '${dep}:`, `'`);
            if ((0, analyzer_1.isVersionGreaterOrEqual)(neededDeps[dep], current)) {
                // Update
                replaced = (0, utils_strings_1.setAllStringIn)(replaced, `classpath '${dep}:`, `'`, neededDeps[dep]);
                (0, logging_1.writeWN)(`Migrated build.gradle set ${dep} = ${neededDeps[dep]}.`);
            }
        }
    }
    // Replace jcenter()
    const lines = replaced.split('\n');
    let inRepositories = false;
    let hasMavenCentral = false;
    let final = '';
    for (const line of lines) {
        if (line.includes('repositories {')) {
            inRepositories = true;
            hasMavenCentral = false;
        }
        else if (line.trim() == '}') {
            // Make sure we have mavenCentral()
            if (inRepositories && !hasMavenCentral) {
                final += '        mavenCentral()\n';
                (0, logging_1.writeWN)(`Migrated build.gradle added mavenCentral().`);
            }
            inRepositories = false;
        }
        if (inRepositories && line.trim() === 'mavenCentral()') {
            hasMavenCentral = true;
        }
        if (inRepositories && line.trim() === 'jcenter()') {
            // skip jCentral()
            (0, logging_1.writeWN)(`Migrated build.gradle removed jcenter().`);
        }
        else {
            final += line + '\n';
        }
    }
    if (txt !== final) {
        (0, fs_1.writeFileSync)(filename, final, 'utf-8');
        return;
    }
}
function updateFile(project, filename, textStart, textEnd, replacement, skipIfNotFound) {
    const path = (0, path_1.join)(project.projectFolder(), filename);
    const txt = readFile(path);
    if (!txt) {
        return;
    }
    if (txt.includes(textStart)) {
        let changed = false;
        if (replacement) {
            const replaced = (0, utils_strings_1.setAllStringIn)(txt, textStart, textEnd, replacement);
            if (replaced != txt) {
                (0, fs_1.writeFileSync)(path, replaced, { encoding: 'utf-8' });
                changed = true;
            }
        }
        else {
            // Replacing in code so we need to count the number of brackets to find the end of the function in swift
            const lines = txt.split('\n');
            let replaced = '';
            let keep = true;
            let brackets = 0;
            for (const line of lines) {
                if (line.includes(textStart)) {
                    keep = false;
                }
                if (!keep) {
                    brackets += (line.match(/{/g) || []).length;
                    brackets -= (line.match(/}/g) || []).length;
                    if (brackets == 0) {
                        keep = true;
                    }
                }
                else {
                    replaced += line + '\n';
                    changed = true;
                }
            }
            (0, fs_1.writeFileSync)(path, replaced, { encoding: 'utf-8' });
        }
        const message = replacement ? `${textStart} => ${replacement}` : '';
        if (changed) {
            (0, logging_1.writeWN)(`Migrated ${filename} ${message}.`);
        }
        return true;
    }
    else if (!skipIfNotFound) {
        (0, logging_1.writeError)(`Unable to find "${textStart}" in ${filename}. Try updating it manually`);
    }
    return false;
}
function install(libs, plugins, version, pluginVersion) {
    let result = '';
    for (const lib of libs) {
        if ((0, analyzer_1.exists)(lib)) {
            result += `${lib}@${version} `;
        }
    }
    for (const plugin of plugins) {
        if ((0, analyzer_1.exists)(plugin)) {
            result += `${plugin}@${pluginVersion} `;
        }
    }
    return (0, node_commands_1.npmInstall)(result.trim() + ' --force');
}
function daysUntil(date_1) {
    const date_2 = new Date();
    const difference = date_1.getTime() - date_2.getTime();
    return Math.ceil(difference / (1000 * 3600 * 24));
}
//# sourceMappingURL=capacitor-migrate.js.map