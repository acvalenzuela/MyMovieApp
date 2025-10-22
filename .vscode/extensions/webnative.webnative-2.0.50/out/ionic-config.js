"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIonicConfig = getIonicConfig;
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * Gets the local folders ionic configuration to override telemetry if needed
 * @param  {string} folder
 * @returns IonicConfig
 */
function getIonicConfig(folder) {
    const config = { type: 'unknown' };
    const configFile = (0, path_1.join)(folder, 'ionic.config.json');
    if ((0, fs_1.existsSync)(configFile)) {
        const json = (0, fs_1.readFileSync)(configFile);
        const data = JSON.parse(json);
        if (data.type) {
            config.type = data.type;
        }
        else {
            config.type = 'unknown';
            if (data.projects) {
                const keys = Object.keys(data.projects);
                if (keys.length > 0) {
                    if (data.defaultProject) {
                        config.type = data.projects[data.defaultProject].type;
                    }
                    else {
                        // Assume the first project type
                        config.type = data.projects[keys[0]].type;
                    }
                }
            }
        }
    }
    return config;
}
//# sourceMappingURL=ionic-config.js.map