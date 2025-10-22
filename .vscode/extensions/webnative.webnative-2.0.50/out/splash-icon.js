"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetType = void 0;
exports.addSplashAndIconFeatures = addSplashAndIconFeatures;
const utilities_1 = require("./utilities");
const logging_1 = require("./logging");
const tip_1 = require("./tip");
const analyzer_1 = require("./analyzer");
const capacitor_platform_1 = require("./capacitor-platform");
const node_commands_1 = require("./node-commands");
const context_variables_1 = require("./context-variables");
const path_1 = require("path");
const vscode_1 = require("vscode");
const fs_1 = require("fs");
var AssetType;
(function (AssetType) {
    AssetType["splash"] = "splash.png";
    AssetType["splashDark"] = "splash-dark.png";
    AssetType["icon"] = "icon.png";
    AssetType["adaptiveForeground"] = "icon-foreground.png";
    AssetType["adaptiveBackground"] = "icon-background.png";
})(AssetType || (exports.AssetType = AssetType = {}));
function addSplashAndIconFeatures(project) {
    project.setSubGroup(`Splash Screen & Icon`, tip_1.TipType.Media, 'Allows setting of the Splash Screen and Icon. Clicking Rebuild will create assets for your iOS and Android native projects.', context_variables_1.Context.rebuild).tip = new tip_1.Tip('Rebuild Assets', undefined).setQueuedAction(runCapacitorAssets, project);
    project.add(createFeature('Splash Screen', AssetType.splash, project));
    project.add(createFeature('Splash Screen Dark', AssetType.splashDark, project));
    project.add(createFeature('Icon', AssetType.icon, project));
    project.add(createFeature('Icon Foreground', AssetType.adaptiveForeground, project));
    project.add(createFeature('Icon Background', AssetType.adaptiveBackground, project));
    project.clearSubgroup();
}
function getAssetTipType(folder, filename) {
    const assetfilename = (0, path_1.join)(getResourceFolder(folder, filename), filename);
    if ((0, fs_1.existsSync)(assetfilename)) {
        return tip_1.TipType.CheckMark;
    }
    else {
        return tip_1.TipType.Warning;
    }
}
function createFeature(title, assetType, project) {
    const tip = new tip_1.Tip(title, undefined, getAssetTipType(project.projectFolder(), assetType));
    tip.setQueuedAction(setAssetResource, project, assetType);
    tip.setContextValue(context_variables_1.Context.asset);
    const filename = (0, path_1.join)(getResourceFolder(project.projectFolder(), assetType), assetType);
    tip.setSecondCommand('Open Asset', filename);
    tip.tooltip = getAssetTooltip(project.projectFolder(), assetType);
    return tip;
}
function getResourceFolder(folder, filename, createIfMissing) {
    let resourceFolder = (0, path_1.join)(folder, 'resources');
    if (createIfMissing && !(0, fs_1.existsSync)(resourceFolder)) {
        (0, fs_1.mkdirSync)(resourceFolder);
    }
    if (filename == AssetType.adaptiveBackground || filename == AssetType.adaptiveForeground) {
        resourceFolder = (0, path_1.join)(resourceFolder, 'android');
        if (createIfMissing && !(0, fs_1.existsSync)(resourceFolder)) {
            (0, fs_1.mkdirSync)(resourceFolder);
        }
    }
    return resourceFolder;
}
function getAssetTooltip(folder, filename) {
    switch (filename) {
        case AssetType.splash:
            return 'Your splash screen should be a 2732×2732px png file. It will be used as the original asset to create suitably sized splash screens for iOS and Android.';
            break;
        case AssetType.splashDark:
            return 'Your dark mode splash screen should be a 2732×2732px png file. It will be used as the original asset to create suitably sized dark mode splash screens for iOS and Android.';
            break;
        case AssetType.icon:
            return 'Your icon should be a 1024×1024px png file that does not contain transparency. It will be used as the original asset to create suitably sized icons for iOS and Android.';
            break;
        case AssetType.adaptiveForeground:
            return 'The icon should be at least 432x432 png file. It will be used as the original asset to create suitably sized adaptive icons for Android.';
            break;
        case AssetType.adaptiveBackground:
            return 'The icon should be at least 432x432 png file. It will be used as the original asset to create suitably sized adaptive icons for Android.';
            break;
    }
}
async function setAssetResource(queueFunction, project, filename) {
    const folder = project.projectFolder();
    const title = getAssetTooltip(folder, filename);
    const buttonTitle = getAssetTipType(folder, filename) == tip_1.TipType.Warning ? `Select File` : `Update File`;
    const selected = await vscode_1.window.showInformationMessage(title, buttonTitle);
    if (!selected)
        return;
    try {
        queueFunction();
        // Copy newfilename to resources/splash.png
        const resourceFolder = getResourceFolder(folder, filename, true);
        const files = await vscode_1.window.showOpenDialog({ canSelectFiles: true, canSelectMany: false });
        if (!files || files.length !== 1)
            return;
        const copyfilename = files[0].fsPath;
        if ((0, path_1.extname)(copyfilename) !== '.png') {
            vscode_1.window.showErrorMessage('The file must be a png');
            return;
        }
        const newfilename = (0, path_1.join)(resourceFolder, filename);
        (0, fs_1.copyFileSync)(copyfilename, newfilename);
        if (!(0, fs_1.existsSync)(newfilename)) {
            await vscode_1.window.showErrorMessage(`Unable to create ${newfilename}`);
            return;
        }
        // If its an icon file and no adaptive icons then use the icon
        if (filename == AssetType.icon) {
            const adaptiveBackground = (0, path_1.join)(getResourceFolder(folder, AssetType.adaptiveBackground, true), AssetType.adaptiveBackground);
            const adaptiveForeground = (0, path_1.join)(getResourceFolder(folder, AssetType.adaptiveForeground, true), AssetType.adaptiveForeground);
            if (!(0, fs_1.existsSync)(adaptiveBackground)) {
                (0, fs_1.copyFileSync)(copyfilename, adaptiveBackground);
            }
            if (!(0, fs_1.existsSync)(adaptiveForeground)) {
                (0, fs_1.copyFileSync)(copyfilename, adaptiveForeground);
            }
        }
        await runCapacitorAssets(undefined, project);
    }
    catch (err) {
        vscode_1.window.showErrorMessage(`Operation failed ${err}`);
    }
}
function hasNeededAssets(folder) {
    const icon = (0, path_1.join)(getResourceFolder(folder, AssetType.icon), AssetType.icon);
    const splash = (0, path_1.join)(getResourceFolder(folder, AssetType.splash), AssetType.splash);
    const splashDark = (0, path_1.join)(getResourceFolder(folder, AssetType.splashDark), AssetType.splashDark);
    if (!(0, fs_1.existsSync)(icon)) {
        return 'An icon needs to be specified next.';
    }
    if (!(0, fs_1.existsSync)(splash)) {
        return 'A splash screen needs to be specified next.';
    }
    if (!(0, fs_1.existsSync)(splashDark)) {
        return 'A dark mode splash screen needs to be specified next.';
    }
}
async function runCapacitorAssets(queueFunction, project) {
    const hasCordovaRes = (0, analyzer_1.exists)('@capacitor/assets');
    const ios = project.hasCapacitorProject(capacitor_platform_1.CapacitorPlatform.ios);
    const android = project.hasCapacitorProject(capacitor_platform_1.CapacitorPlatform.android);
    const pwa = (0, analyzer_1.exists)('@angular/service-worker');
    const folder = project.projectFolder();
    const neededMessage = hasNeededAssets(folder);
    if (neededMessage) {
        await vscode_1.window.showInformationMessage(neededMessage, 'OK');
        return;
    }
    if (queueFunction) {
        queueFunction();
    }
    (0, logging_1.writeWN)('Generating Splash Screen and Icon Assets...');
    (0, utilities_1.channelShow)();
    await showProgress('Generating Splash Screen and Icon Assets', async () => {
        if ((0, analyzer_1.exists)('cordova-res')) {
            await (0, utilities_1.run)(folder, (0, node_commands_1.npmUninstall)('cordova-res'), undefined, [], undefined, undefined);
        }
        let cmd = '';
        if (ios) {
            cmd = `${(0, node_commands_1.npx)(project, { forceNpx: true })} @capacitor/assets generate --ios`;
            (0, logging_1.write)(`> ${cmd}`);
            await (0, utilities_1.run)(folder, cmd, undefined, [], undefined, undefined);
            addToGitIgnore(folder, 'resources/ios/**/*');
        }
        if (android) {
            cmd = `${(0, node_commands_1.npx)(project, { forceNpx: true })} @capacitor/assets generate --android`;
            (0, logging_1.write)(`> ${cmd}`);
            await (0, utilities_1.run)(folder, cmd, undefined, [], undefined, undefined);
            addToGitIgnore(folder, 'resources/android/**/*');
        }
        if (pwa) {
            cmd = `${(0, node_commands_1.npx)(project, {
                forceNpx: true,
            })} @capacitor/assets generate --pwa --pwaManifestPath './src/manifest.webmanifest'`;
            (0, logging_1.write)(`> ${cmd}`);
            await (0, utilities_1.run)(folder, cmd, undefined, [], undefined, undefined);
        }
    });
    (0, logging_1.writeWN)('Completed created Splash Screen and Icon Assets');
    (0, utilities_1.channelShow)();
}
function addToGitIgnore(folder, ignoreGlob) {
    const filename = (0, path_1.join)(folder, '.gitignore');
    if ((0, fs_1.existsSync)(filename)) {
        let txt = (0, fs_1.readFileSync)(filename, { encoding: 'utf-8' });
        const lines = txt.split('\n');
        if (!txt.includes(ignoreGlob)) {
            txt = txt + `\n${ignoreGlob}`;
            (0, fs_1.writeFileSync)(filename, txt);
        }
    }
}
async function showProgress(message, func) {
    await vscode_1.window.withProgress({
        location: vscode_1.ProgressLocation.Notification,
        title: `${message}`,
        cancellable: false,
    }, async (progress, token) => {
        await func();
    });
}
//# sourceMappingURL=splash-icon.js.map