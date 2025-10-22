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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IosProject = void 0;
const fs_1 = require("fs");
const xcode_1 = __importDefault(require("xcode"));
const plist = __importStar(require("simple-plist"));
const path_1 = require("path");
class IosProject {
    constructor(projectPath) {
        this._projectPath = (0, path_1.join)(projectPath, 'App.xcodeproj', 'project.pbxproj');
        this._infoPlistPath = (0, path_1.join)(projectPath, 'App', 'Info.plist');
    }
    exists() {
        return (0, fs_1.existsSync)(this._projectPath);
    }
    async parse() {
        if (!this.exists()) {
            return false;
        }
        this._project = xcode_1.default.project(this._projectPath);
        try {
            await this.parseAsync(this._project);
            return true;
        }
        catch (error) {
            console.error(error);
            throw new Error(`Unable to parse project ${this._projectPath}`);
        }
    }
    parseAsync(project) {
        return new Promise((resolve, reject) => {
            project.parse((err) => {
                if (err)
                    return reject(err);
                resolve(undefined);
            });
        });
    }
    getAppTarget() {
        const targets = this.getAppTargets();
        return targets[0];
    }
    getAppTargets() {
        const targets = this._project.hash.project.objects.PBXNativeTarget;
        const result = [];
        Object.keys(targets).forEach((key) => {
            result.push({ name: targets[key].name, id: key });
        });
        return result;
    }
    getBundleId(target) {
        const targets = this._project.hash.project.objects.PBXNativeTarget;
        let bundleId = '';
        Object.keys(targets).forEach((key) => {
            if (targets[key].name === target) {
                const buildConfigs = this._project.hash.project.objects.XCBuildConfiguration;
                Object.keys(buildConfigs).forEach((configKey) => {
                    const config = buildConfigs[configKey];
                    if (config.buildSettings && config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER) {
                        bundleId = config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER;
                    }
                });
            }
        });
        if (bundleId == '') {
            throw new Error(`getBundleId ${target} failed`);
        }
        return bundleId;
    }
    async getDisplayName() {
        const data = plist.readFileSync(this._infoPlistPath);
        return data.CFBundleDisplayName;
    }
    async getProdutName(target) {
        let displayName = '';
        const targets = this._project.hash.project.objects.PBXNativeTarget;
        Object.keys(targets).forEach((key) => {
            if (targets[key].name === target) {
                const buildConfigs = this._project.hash.project.objects.XCBuildConfiguration;
                Object.keys(buildConfigs).forEach((configKey) => {
                    const config = buildConfigs[configKey];
                    if (config.buildSettings && config.buildSettings.PRODUCT_NAME) {
                        displayName = config.buildSettings.PRODUCT_NAME.replace(/"/g, ''); // Remove quotes if present
                    }
                });
                if (displayName == '') {
                    throw new Error(`getDisplayName ${target} failed`);
                }
            }
        });
        return displayName;
    }
    getBuildConfigurations(target) {
        const buildConfigs = this._project.hash.project.objects.XCBuildConfiguration;
        const result = [];
        Object.keys(buildConfigs).forEach((configKey) => {
            const config = buildConfigs[configKey];
            if (!config.baseConfigurationReference && config.name) {
                result.push({ name: config.name });
            }
        });
        return result;
    }
    getVersion(target, buildConfig) {
        const identifier = this.getVariable(this.getInfoPlist().CFBundleShortVersionString);
        // eg version = MARKETING_VERSION
        const buildConfigs = this._project.hash.project.objects.XCBuildConfiguration;
        let version = '';
        Object.keys(buildConfigs).forEach((configKey) => {
            const config = buildConfigs[configKey];
            if (config.name === buildConfig) {
                if (config.buildSettings && config.buildSettings[identifier]) {
                    version = config.buildSettings[identifier];
                    //console.log(`Found version ${version} for ${identifier} in ${buildConfig}`);
                    return;
                }
            }
        });
        if (version == '') {
            throw Error(`Couldnt find version for ${identifier} in ${buildConfig}`);
        }
        return version;
    }
    getInfoPlist() {
        return plist.readFileSync(this._infoPlistPath);
    }
    async getBuild(target, buildConfig) {
        const identifier = this.getVariable(this.getInfoPlist().CFBundleVersion);
        // eg version = MARKETING_VERSION
        const buildConfigs = this._project.hash.project.objects.XCBuildConfiguration;
        let build = '';
        Object.keys(buildConfigs).forEach((configKey) => {
            const config = buildConfigs[configKey];
            if (config.name === buildConfig) {
                if (config.buildSettings && config.buildSettings[identifier]) {
                    build = config.buildSettings[identifier];
                    return;
                }
            }
        });
        if (build == '') {
            throw Error(`Couldnt find build for ${identifier} in ${buildConfig}`);
        }
        return parseInt(build);
    }
    getVariable(name) {
        return name.replace('$(', '').replace(')', '');
    }
    async setBundleId(target, buildConfig, bundleId) {
        const targets = this._project.hash.project.objects.PBXNativeTarget;
        let set = false;
        Object.keys(targets).forEach((key) => {
            if (targets[key].name === target) {
                const buildConfigs = this._project.hash.project.objects.XCBuildConfiguration;
                Object.keys(buildConfigs).forEach((configKey) => {
                    const config = buildConfigs[configKey];
                    if (config.buildSettings && config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER) {
                        config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = bundleId;
                        (0, fs_1.writeFileSync)(this._projectPath, this._project.writeSync());
                        set = true;
                    }
                });
            }
        });
        if (!set) {
            throw new Error(`setBundleId ${target} failed`);
        }
    }
    setVersion(target, buildConfig, version) {
        const identifier = this.getVariable(this.getInfoPlist().CFBundleShortVersionString);
        let versionSet = false;
        const buildConfigs = this._project.hash.project.objects.XCBuildConfiguration;
        Object.keys(buildConfigs).forEach((configKey) => {
            const config = buildConfigs[configKey];
            if (config.name === buildConfig) {
                if (config.buildSettings && config.buildSettings[identifier]) {
                    config.buildSettings[identifier] = version;
                    (0, fs_1.writeFileSync)(this._projectPath, this._project.writeSync());
                    versionSet = true;
                    return;
                }
            }
        });
        if (!versionSet) {
            throw Error(`Couldnt find version for ${identifier} in ${buildConfig}`);
        }
    }
    async setBuild(target, buildConfig, build) {
        const identifier = this.getVariable(this.getInfoPlist().CFBundleVersion);
        let set = false;
        const buildConfigs = this._project.hash.project.objects.XCBuildConfiguration;
        Object.keys(buildConfigs).forEach((configKey) => {
            const config = buildConfigs[configKey];
            if (config.name === buildConfig) {
                if (config.buildSettings && config.buildSettings[identifier]) {
                    config.buildSettings[identifier] = build;
                    (0, fs_1.writeFileSync)(this._projectPath, this._project.writeSync());
                    set = true;
                    return;
                }
            }
        });
        if (!set) {
            throw Error(`Couldnt find build for ${identifier} in ${buildConfig}`);
        }
    }
    async setDisplayName(target, buildConfig, displayName) {
        const data = plist.readFileSync(this._infoPlistPath);
        data.CFBundleDisplayName = displayName;
        plist.writeFileSync(this._infoPlistPath, data);
    }
}
exports.IosProject = IosProject;
//# sourceMappingURL=native-project-ios.js.map