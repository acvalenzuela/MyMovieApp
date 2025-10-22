"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPrivacyManifest = checkPrivacyManifest;
exports.iosFolder = iosFolder;
const path_1 = require("path");
const xcode_1 = require("xcode");
const plist = __importStar(require("simple-plist"));
const fs_1 = require("fs");
const tip_1 = require("./tip");
const vscode_1 = require("vscode");
const logging_1 = require("./logging");
const analyzer_1 = require("./analyzer");
const utilities_1 = require("./utilities");
const privacy_manifest_1 = require("./privacy-manifest");
const context_variables_1 = require("./context-variables");
const process_packages_1 = require("./process-packages");
const oneHour = 60 * 1000 * 60;
async function checkPrivacyManifest(project, context) {
    const lastManifestCheck = getLastManifestCheck(context);
    if (lastManifestCheck < oneHour) {
        return;
    }
    const apisUsed = [];
    for (const api of Object.keys(privacy_manifest_1.privacyManifestRules)) {
        for (const plugin of privacy_manifest_1.privacyManifestRules[api]) {
            if ((0, analyzer_1.exists)(plugin)) {
                apisUsed.push({ api, plugin, reasons: getReasons(api), reasonUrl: getReasonUrl(api) });
            }
        }
    }
    if (apisUsed.length == 0) {
        return; // Manifest file is not required
    }
    try {
        const xc = await getXCProject(project);
        if (!xc) {
            if (!(0, fs_1.existsSync)(iosFolder(project))) {
                return; // They have @capacitor/ios but haven't added an iOS project yet
            }
            (0, logging_1.writeError)(`XCode project file is missing: ${xCodeProjectFile(project)}.`);
            return;
        }
        const pFiles = xc.p.pbxFileReferenceSection();
        const files = Object.keys(pFiles);
        const found = files.find((f) => { var _a; return (_a = pFiles[f].path) === null || _a === void 0 ? void 0 : _a.includes('.xcprivacy'); });
        if (found) {
            // Has a .xcprivacy file
            investigatePrivacyManifest(project, (0, utilities_1.replaceAll)(pFiles[found].path, '"', ''), context, apisUsed);
            setLastManifestCheck(context);
            return;
        }
        const title = 'Add Privacy Manifest';
        project.add(new tip_1.Tip(title, '', tip_1.TipType.Warning)
            .setQueuedAction(createPrivacyManifest, project, context)
            .setTooltip('A Privacy Manifest file is required by Apple when submitting your app to the App Store.')
            .canRefreshAfter()
            .canIgnore());
        setLastManifestCheck(context);
        return undefined;
    }
    catch (err) {
        (0, logging_1.writeError)(`Unable to read privacy manifest of XCode project: ${err}`);
    }
}
function setLastManifestCheck(context) {
    context.workspaceState.update(context_variables_1.LastManifestCheck, new Date().getTime());
}
function getLastManifestCheck(context) {
    const v = parseInt(context.workspaceState.get(context_variables_1.LastManifestCheck));
    return new Date().getTime() - (isNaN(v) ? 0 : v);
}
async function investigatePrivacyManifest(project, filename, context, apisUsages) {
    var _a;
    const path = (0, path_1.join)(iosFolder(project), filename);
    if (!(0, fs_1.existsSync)(path)) {
        (0, logging_1.writeError)(`Unable to find privacy manifest file from XCode project: ${path}`);
        return;
    }
    try {
        const data = plist.readFileSync(path);
        for (const apiUsage of apisUsages) {
            const found = data.NSPrivacyAccessedAPITypes
                ? data.NSPrivacyAccessedAPITypes.find((a) => a.NSPrivacyAccessedAPIType == apiUsage.api)
                : undefined;
            if (!found || ((_a = found.NSPrivacyAccessedAPITypeReasons) === null || _a === void 0 ? void 0 : _a.length) == 0) {
                project.add(new tip_1.Tip(`Missing Privacy Manifest Category`, '', tip_1.TipType.Error)
                    .setQueuedAction(setPrivacyCategory, context, path, apiUsage.plugin, apiUsage.api, apiUsage.reasons, apiUsage.reasonUrl)
                    .setTooltip(`${apiUsage.plugin} requires that the privacy manifest specifies ${apiUsage.api}.`)
                    .canRefreshAfter()
                    .canIgnore());
            }
        }
    }
    catch (e) {
        (0, logging_1.writeError)(`Unable to parse plist file: ${path}: ${e}`);
    }
}
async function setPrivacyCategory(queueFunction, context, privacyFilename, plugin, category, reasons, reasonUrl) {
    const result = await vscode_1.window.showInformationMessage(`The Privacy Manifest file in your XCode project requires ${category} and a reason code for using it because ${plugin} uses this feature.`, 'Docs', ...reasons, 'Exit');
    if (result === 'Docs') {
        (0, utilities_1.openUri)(reasonUrl);
        return;
    }
    if (result === 'Exit') {
        return;
    }
    queueFunction();
    const data = plist.readFileSync(privacyFilename);
    if (!data.NSPrivacyAccessedAPITypes) {
        data.NSPrivacyAccessedAPITypes = [];
    }
    const found = data.NSPrivacyAccessedAPITypes.find((t) => t.NSPrivacyAccessedAPIType == category);
    if (found) {
        if (!found.NSPrivacyAccessedAPITypeReasons) {
            found.NSPrivacyAccessedAPITypeReasons = [];
        }
        found.NSPrivacyAccessedAPITypeReasons.push(result);
    }
    else {
        data.NSPrivacyAccessedAPITypes.push({
            NSPrivacyAccessedAPIType: category,
            NSPrivacyAccessedAPITypeReasons: [result],
        });
    }
    plist.writeFileSync(privacyFilename, data);
    (0, process_packages_1.clearRefreshCache)(context);
}
function XCodeProjFolder(project) {
    return (0, path_1.join)(iosFolder(project), 'App.xcodeproj');
}
function iosFolder(project) {
    return (0, path_1.join)(project.projectFolder(), 'ios', 'App');
}
function xCodeProjectFile(project) {
    const projectFolder = XCodeProjFolder(project);
    return (0, path_1.join)(projectFolder, 'project.pbxproj');
}
async function getXCProject(project) {
    const projectFolder = XCodeProjFolder(project);
    const path = (0, path_1.join)(projectFolder, 'project.pbxproj');
    if (!(0, fs_1.existsSync)(path)) {
        // iOS project not found
        return;
    }
    const p = await parse(path);
    return { projectFilePath: path, projectFolder, p };
}
async function createPrivacyManifest(queueFunction, project, context) {
    const result = await vscode_1.window.showInformationMessage(`Your app requires a Privacy Manifest file as it uses particular plugins. Would you like to create one?`, 'Yes', 'More Information', 'Exit');
    if (result == 'More Information') {
        (0, utilities_1.openUri)('https://developer.apple.com/support/third-party-SDK-requirements/');
        return;
    }
    if (result !== 'Yes') {
        return;
    }
    queueFunction();
    try {
        const xc = await getXCProject(project);
        const filename = 'PrivacyInfo.xcprivacy';
        const path = writeManifestFile(iosFolder(project), filename);
        const res = xc.p.addPbxGroup([], 'Resources', undefined, undefined);
        const r3 = xc.p.getPBXGroupByKey('504EC2FB1FED79650016851F', 'PBXGroup');
        const r2 = xc.p.addResourceFile(filename, {}, res.uuid);
        r3.children.push({ value: r2.fileRef, comment: 'Resources' });
        (0, fs_1.writeFileSync)(xc.projectFilePath, xc.p.writeSync());
        (0, logging_1.writeWN)('A privacy manifest file was added to your project.');
    }
    catch (e) {
        (0, logging_1.writeError)(`Unable to create privacy manifest file: ${e}`);
    }
    (0, process_packages_1.clearRefreshCache)(context);
}
function writeManifestFile(iosFolder, filename) {
    const content = `<?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
	<key>NSPrivacyTracking</key>
	<false/>
	<key>NSPrivacyAccessedAPITypes</key>
	<array/>
	<key>NSPrivacyCollectedDataTypes</key>
	<array/>
   </dict>
   </plist>`;
    const f = (0, path_1.join)(iosFolder, filename);
    (0, fs_1.writeFileSync)(f, content);
    return f;
}
async function parse(path) {
    return new Promise((resolve) => {
        const p = (0, xcode_1.project)(path);
        p.parse((err) => {
            resolve(p);
        });
    });
}
function getReasons(api) {
    switch (api) {
        case 'NSPrivacyAccessedAPICategoryUserDefaults':
            return ['CA92.1', '1C8F.1'];
        case 'NSPrivacyAccessedAPICategoryFileTimestamp':
            return ['C617.1', 'DDA9.1', '3B52.1']; // FYI: 0A2A.1 is not applicable
        case 'NSPrivacyAccessedAPICategoryDiskSpace':
            return ['85F4.1', 'E174.1', '7D9E.1', 'B728.1'];
        case 'NSPrivacyAccessedAPICategorySystemBootTime':
            return ['35F9.1', '8FFB.1', '3D61.1'];
        case 'NSPrivacyAccessedAPICategoryActiveKeyboards':
            return ['3EC4.1', '54BD.1'];
        default:
            (0, logging_1.writeError)(`Unknown api ${api} in getReasons`);
    }
}
function getReasonUrl(api) {
    switch (api) {
        case 'NSPrivacyAccessedAPICategoryUserDefaults':
            return 'https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api#4278401';
        case 'NSPrivacyAccessedAPICategoryFileTimestamp':
            return 'https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api#4278393';
        case 'NSPrivacyAccessedAPICategoryDiskSpace':
            return 'https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api#4278397';
        case 'NSPrivacyAccessedAPICategoryActiveKeyboards':
            return 'https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api#4278400';
        case 'NSPrivacyAccessedAPICategorySystemBootTime':
            return 'https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api#4278394';
    }
}
//# sourceMappingURL=xcode.js.map