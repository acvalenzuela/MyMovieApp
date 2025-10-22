"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCapacitorConfigureFile = getCapacitorConfigureFile;
exports.getCapacitorConfigureFilename = getCapacitorConfigureFilename;
exports.getCapacitorConfigDistFolder = getCapacitorConfigDistFolder;
exports.getCapacitorConfigWebDir = getCapacitorConfigWebDir;
exports.writeCapacitorConfig = writeCapacitorConfig;
exports.updateCapacitorConfig = updateCapacitorConfig;
const fs_1 = require("fs");
const path_1 = require("path");
const utils_strings_1 = require("./utils-strings");
// Purpose: Capacitor Config File Management
function getCapacitorConfigureFile(folder) {
    const capConfigFile = getCapacitorConfigureFilename(folder);
    if (capConfigFile && (0, fs_1.existsSync)(capConfigFile)) {
        return (0, fs_1.readFileSync)(capConfigFile, 'utf-8');
    }
    return undefined; // not found
}
function getCapacitorConfigureFilename(folder) {
    let capConfigFile = (0, path_1.join)(folder, 'capacitor.config.ts');
    if (!(0, fs_1.existsSync)(capConfigFile)) {
        // React projects may use .js
        capConfigFile = (0, path_1.join)(folder, 'capacitor.config.js');
        if (!(0, fs_1.existsSync)(capConfigFile)) {
            // might be a json file
            capConfigFile = (0, path_1.join)(folder, 'capacitor.config.json');
        }
    }
    return capConfigFile;
}
/**
 * Gets the full path using a folder and the webDir property from capacitor.config.ts
 * @param  {string} folder
 * @returns string
 */
function getCapacitorConfigDistFolder(folder) {
    let result = getCapacitorConfigWebDir(folder);
    if (!result) {
        // No config file take a best guess
        if ((0, fs_1.existsSync)((0, path_1.join)(folder, 'www'))) {
            result = 'www';
        }
        else if ((0, fs_1.existsSync)((0, path_1.join)(folder, 'dist'))) {
            result = 'dist';
        }
        else if ((0, fs_1.existsSync)((0, path_1.join)(folder, 'build'))) {
            result = 'build';
        }
        else if ((0, fs_1.existsSync)((0, path_1.join)(folder, 'out'))) {
            result = 'out';
        }
    }
    if (!result) {
        result = 'www'; // Assume www folder
    }
    return (0, path_1.join)(folder, result);
}
function getCapacitorConfigWebDir(folder) {
    let result;
    const config = getCapacitorConfigureFile(folder);
    if (config) {
        result = (0, utils_strings_1.getStringFrom)(config, `webDir: '`, `'`);
        if (!result) {
            result = (0, utils_strings_1.getStringFrom)(config, `webDir: "`, `"`);
            if (!result) {
                result = (0, utils_strings_1.getStringFrom)(config, `"webDir": "`, `"`);
            }
        }
    }
    return result;
}
function writeCapacitorConfig(project, keyValues) {
    const filename = getCapacitorConfigureFilename(project.projectFolder());
    if (!filename) {
        return;
    }
    let data = (0, fs_1.readFileSync)(filename, 'utf-8');
    for (const kv of keyValues) {
        data = setValueIn(data, kv.key, kv.value);
    }
    (0, fs_1.writeFileSync)(filename, data);
}
function updateCapacitorConfig(project, bundleId, displayName) {
    const filename = getCapacitorConfigureFilename(project.projectFolder());
    if (!filename) {
        return;
    }
    let data = (0, fs_1.readFileSync)(filename, 'utf-8');
    if (bundleId) {
        data = setValueIn(data, 'appId', bundleId);
    }
    if (displayName) {
        data = setValueIn(data, 'appName', displayName);
    }
    (0, fs_1.writeFileSync)(filename, data);
}
function setValueIn(data, key, value) {
    if (data.includes(`${key}: '`)) {
        data = (0, utils_strings_1.setStringIn)(data, `${key}: '`, `'`, value);
    }
    else if (data.includes(`${key}: "`)) {
        data = (0, utils_strings_1.setStringIn)(data, `${key}: "`, `"`, value);
    }
    return data;
}
//# sourceMappingURL=capacitor-config-file.js.map