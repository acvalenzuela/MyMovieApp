"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capacitorBuild = capacitorBuild;
const monorepo_1 = require("./monorepo");
const capacitor_platform_1 = require("./capacitor-platform");
const command_name_1 = require("./command-name");
const utilities_1 = require("./utilities");
const logging_1 = require("./logging");
const analyzer_1 = require("./analyzer");
const fs_1 = require("fs");
const capacitor_open_1 = require("./capacitor-open");
const node_commands_1 = require("./node-commands");
const child_process_1 = require("child_process");
const capacitor_config_file_1 = require("./capacitor-config-file");
const vscode_1 = require("vscode");
const utils_strings_1 = require("./utils-strings");
/**
 * Capacitor build command
 * @param  {Project} project
 */
async function capacitorBuild(queueFunction, project) {
    if (!(0, analyzer_1.isGreaterOrEqual)('@capacitor/cli', '4.4.0')) {
        await vscode_1.window.showErrorMessage('This option is only available in Capacitor version 4.4.0 and above.');
        return;
    }
    const picks = [];
    if ((0, analyzer_1.exists)('@capacitor/ios')) {
        picks.push('iOS Release Build (.ipa)');
    }
    if ((0, analyzer_1.exists)('@capacitor/android')) {
        picks.push('Android Debug Build (.apk)', 'Android Release Build (.aab)');
    }
    const selection = await vscode_1.window.showQuickPick(picks, { placeHolder: 'Create a build to target which format?' });
    if (!selection)
        return;
    const platform = selection.includes('ipa') ? capacitor_platform_1.CapacitorPlatform.ios : capacitor_platform_1.CapacitorPlatform.android;
    let args = '';
    if (selection.includes('apk')) {
        args += ' --androidreleasetype=APK';
    }
    if (selection.includes('aab')) {
        args += ' --androidreleasetype=AAB';
    }
    let settings = readKeyStoreSettings(project);
    settings = await verifySettings(project, platform, settings);
    if (!settings) {
        return;
    }
    try {
        queueFunction();
        const command = capBuildCommand(project, platform, args, settings);
        (0, logging_1.writeWN)(command);
        const results = { output: '', success: false };
        await (0, utilities_1.runWithProgress)(command, 'Preparing Release Build...', project.projectFolder(), results);
        if (results.success) {
            writeConfig(project, settings);
            const tmp = results.output.split('at: ');
            const folder = tmp[1].replace('\n', '');
            (0, child_process_1.exec)(`open "${folder}"`);
            openPortal(platform);
        }
    }
    catch (err) {
        (0, logging_1.writeError)(err);
    }
}
async function openPortal(platform) {
    const uri = platform == capacitor_platform_1.CapacitorPlatform.android ? 'https://play.google.com/console' : 'https://developer.apple.com/account';
    const selection = await vscode_1.window.showInformationMessage(`Do you want to open the ${platform == capacitor_platform_1.CapacitorPlatform.ios ? 'Apple Developer Portal?' : 'Google Play Console?'}`, 'Open', 'Exit');
    if (selection == 'Open') {
        (0, utilities_1.openUri)(uri);
    }
}
async function verifySettings(project, platform, settings) {
    if (platform == capacitor_platform_1.CapacitorPlatform.ios)
        return settings;
    if (!settings.keyStorePath) {
        const selection = await vscode_1.window.showInformationMessage('An Android Keystore file is required. You can create one in Android Studio (Build > Generate Signed Bundle).', 'Select Keystore File', 'Open Android Studio', 'Exit');
        if (!selection || selection == 'Exit') {
            return undefined;
        }
        if (selection == 'Open Android Studio') {
            await (0, utilities_1.runWithProgress)(await (0, capacitor_open_1.capacitorOpen)(project, platform), 'Opening Android Studio...', project.projectFolder());
            return undefined;
        }
        const path = await vscode_1.window.showOpenDialog({
            canSelectFolders: false,
            canSelectFiles: true,
            canSelectMany: false,
            title: 'Select the key store path',
        });
        if (!path)
            return undefined;
        settings.keyStorePath = path[0].fsPath;
    }
    if (!settings.keyStorePassword) {
        settings.keyStorePassword = await vscode_1.window.showInputBox({
            title: 'Key store password',
            placeHolder: 'Enter key store password',
            password: true,
            ignoreFocusOut: true,
        });
        if (!settings.keyStorePassword)
            return undefined;
    }
    if (!settings.keyAlias) {
        settings.keyAlias = await vscode_1.window.showInputBox({
            title: 'Key alias',
            placeHolder: 'Enter key alias',
            ignoreFocusOut: true,
        });
        if (!settings.keyAlias)
            return undefined;
    }
    if (!settings.keyPassword) {
        settings.keyPassword = await vscode_1.window.showInputBox({
            title: 'Key password',
            placeHolder: 'Enter key password',
            password: true,
            ignoreFocusOut: true,
        });
        if (!settings.keyPassword)
            return undefined;
    }
    if (!settings.signingType) {
        settings.signingType = 'apksigner';
    }
    return settings;
}
function capBuildCommand(project, platform, args, settings) {
    switch (project.repoType) {
        case monorepo_1.MonoRepoType.none:
            return capCLIBuild(platform, project, args, settings);
        case monorepo_1.MonoRepoType.folder:
        case monorepo_1.MonoRepoType.pnpm:
        case monorepo_1.MonoRepoType.yarn:
        case monorepo_1.MonoRepoType.lerna:
        case monorepo_1.MonoRepoType.bun:
        case monorepo_1.MonoRepoType.npm:
            return command_name_1.InternalCommand.cwd + capCLIBuild(platform, project, args, settings);
        case monorepo_1.MonoRepoType.nx:
            return nxBuild(project, platform, args);
        default:
            throw new Error('Unsupported Monorepo type');
    }
}
function capCLIBuild(platform, project, args, settings) {
    if (platform == capacitor_platform_1.CapacitorPlatform.android) {
        if (settings.keyAlias)
            args += ` --keystorealias="${settings.keyAlias}"`;
        if (settings.keyPassword)
            args += ` --keystorealiaspass="${settings.keyPassword}"`;
        if (settings.keyStorePassword)
            args += ` --keystorepass="${settings.keyStorePassword}"`;
        if (settings.keyStorePath)
            args += ` --keystorepath="${settings.keyStorePath}"`;
    }
    return `${(0, node_commands_1.npx)(project)} cap build ${platform}${args}`;
}
function nxBuild(project, platform, args) {
    return `${(0, node_commands_1.npx)(project)} nx run ${project.monoRepo.name}:build:${platform}${args}`;
}
function readKeyStoreSettings(project) {
    const result = {};
    const filename = (0, capacitor_config_file_1.getCapacitorConfigureFilename)(project.projectFolder());
    if (!filename) {
        return;
    }
    try {
        const data = (0, fs_1.readFileSync)(filename, 'utf-8');
        if (data.includes('CapacitorConfig = {')) {
            result.signingType = getValueFrom(data, 'signingType');
            if ((0, utils_strings_1.isEmpty)(result.signingType)) {
                result.signingType = 'apksigner';
            }
            result.keyStorePath = getValueFrom(data, 'keystorePath');
            result.keyAlias = getValueFrom(data, 'keystoreAlias');
            result.keyPassword = getValueFrom(data, 'keystoreAliasPassword');
            result.keyStorePassword = getValueFrom(data, 'keystorePassword');
        }
        return result;
    }
    catch (err) {
        (0, logging_1.writeError)(err);
        return;
    }
}
function getValueFrom(data, key) {
    let result = (0, utils_strings_1.getStringFrom)(data, `${key}: '`, `'`);
    if (!result) {
        result = (0, utils_strings_1.getStringFrom)(data, `${key}: "`, `"`);
    }
    return result;
}
function writeConfig(project, settings) {
    const filename = (0, capacitor_config_file_1.getCapacitorConfigureFilename)(project.projectFolder());
    if (!filename) {
        return;
    }
    let data = (0, fs_1.readFileSync)(filename, 'utf-8');
    if (!data.includes('buildOptions')) {
        data = data.replace('};', `,
    android: {
       buildOptions: {
          keystorePath: '',
          keystoreAlias: '',
          signingType: 'apksigner',
       }
    }
  };`);
    }
    if (!data.includes('signingType')) {
        data = data.replace('buildOptions: {', `buildOptions: {
          signingType: 'apksigner',`);
    }
    (0, fs_1.writeFileSync)(filename, data);
    (0, capacitor_config_file_1.writeCapacitorConfig)(project, [
        { key: 'keystorePath', value: settings.keyStorePath },
        { key: 'keystorePassword', value: settings.keyStorePassword },
        { key: 'keystoreAlias', value: settings.keyAlias },
        { key: 'keystoreAliasPassword', value: settings.keyPassword },
        { key: 'signingType', value: settings.signingType },
    ]);
}
//# sourceMappingURL=capacitor-build.js.map