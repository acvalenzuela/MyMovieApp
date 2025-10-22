"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRecommendedExtensions = checkRecommendedExtensions;
exports.recommendWebNativeExtension = recommendWebNativeExtension;
const fs_1 = require("fs");
const path_1 = require("path");
const workspace_state_1 = require("./workspace-state");
const logging_1 = require("./logging");
function checkRecommendedExtensions(folder) {
    const recFile = (0, path_1.join)(folder, '.vscode', 'extensions.json');
    if ((0, workspace_state_1.getSetting)(workspace_state_1.WorkspaceSetting.recCheck) == true) {
        return;
    }
    if ((0, fs_1.existsSync)(recFile)) {
        try {
            const data = (0, fs_1.readFileSync)(recFile, 'utf8');
            const jsonData = JSON.parse(data);
            jsonData.recommendations = jsonData.recommendations.filter((ext) => ext !== 'ionic.ionic');
            if (!data.includes('Webnative.webnative')) {
                jsonData.recommendations.push('Webnative.webnative');
            }
            (0, fs_1.writeFileSync)(recFile, JSON.stringify(jsonData, null, 2), 'utf8');
        }
        catch {
            (0, logging_1.writeError)(`extensions.json is not a valid JSON file.`);
        }
    }
    (0, workspace_state_1.setSetting)(workspace_state_1.WorkspaceSetting.recCheck, true);
}
function recommendWebNativeExtension(folder) {
    const recFile = (0, path_1.join)(folder, '.vscode', 'extensions.json');
    try {
        if (!(0, fs_1.existsSync)(recFile)) {
            const data = {
                recommendations: ['Webnative.webnative'],
            };
            (0, fs_1.writeFileSync)(recFile, JSON.stringify(data, null, 2), 'utf8');
        }
        else {
            const data = (0, fs_1.readFileSync)(recFile, 'utf8');
            const jsonData = JSON.parse(data);
            if (jsonData.recommendations) {
                if (jsonData.recommendations.includes('ionic.ionic')) {
                    jsonData.recommendations = jsonData.recommendations.filter((r) => r !== 'ionic.ionic');
                }
                if (!jsonData.recommendations.includes('Webnative.webnative')) {
                    jsonData.recommendations.push('Webnative.webnative');
                    (0, fs_1.writeFileSync)(recFile, JSON.stringify(jsonData, null, 2), 'utf8');
                }
            }
        }
    }
    catch (e) {
        console.error('Error updating extension recommendations', e);
    }
}
//# sourceMappingURL=vscode-recommendation.js.map