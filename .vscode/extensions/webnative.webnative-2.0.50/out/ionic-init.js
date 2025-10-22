"use strict";
// The project is non-ionic:
// Run ionic init using the project name of the package.json and type of custom
// Create ionic:build if there is a build script
Object.defineProperty(exports, "__esModule", { value: true });
exports.ionicInit = ionicInit;
const utilities_1 = require("./utilities");
const logging_1 = require("./logging");
const fs_1 = require("fs");
const path_1 = require("path");
const analyzer_1 = require("./analyzer");
// Create ionic:serve if there is a serve script
async function ionicInit(folder) {
    var _a, _b, _c, _d, _e;
    (0, logging_1.write)('[Ionic] Creating Ionic project...');
    try {
        const filename = (0, path_1.join)(folder, 'package.json');
        const packageFile = JSON.parse((0, fs_1.readFileSync)(filename, 'utf8'));
        verifyValidPackageJson(filename, packageFile);
        const name = packageFile.name;
        const cfg = (0, path_1.join)(folder, 'ionic.config.json');
        if (!(0, fs_1.existsSync)(cfg)) {
            const result = await (0, utilities_1.getRunOutput)(`npx ionic init "${name}" --type=custom`, folder);
        }
        if ((_a = packageFile.scripts) === null || _a === void 0 ? void 0 : _a.build) {
            packageFile.scripts['ionic:build'] = 'npm run build';
            if ((0, analyzer_1.exists)('@nuxtjs/ionic') && ((_b = packageFile.scripts) === null || _b === void 0 ? void 0 : _b.generate)) {
                packageFile.scripts['ionic:build'] = 'npm run generate';
            }
        }
        // Typical for Vite
        if ((_c = packageFile.scripts) === null || _c === void 0 ? void 0 : _c.dev) {
            packageFile.scripts['ionic:serve'] = 'npm run dev';
        }
        if ((_d = packageFile.scripts) === null || _d === void 0 ? void 0 : _d.serve) {
            packageFile.scripts['ionic:serve'] = 'npm run serve';
        }
        else if ((_e = packageFile.scripts) === null || _e === void 0 ? void 0 : _e.start) {
            packageFile.scripts['ionic:serve'] = 'npm run start';
        }
        (0, fs_1.writeFileSync)(filename, JSON.stringify(packageFile, undefined, 2));
        addIonicConfigCapacitor(folder);
        (0, logging_1.writeWN)('Created Ionic Project');
        return true;
    }
    catch (err) {
        (0, logging_1.writeError)('Unable to create Ionic project:' + err);
        return false;
    }
}
/**
 * This will force package.json to have a name and version. Without this Ionic CLI will call the package.json malformed
 * @param  {string} filename
 * @param  {any} packages
 */
function verifyValidPackageJson(filename, packages) {
    if (!packages.name) {
        packages.name = 'my-app';
        (0, fs_1.writeFileSync)(filename, JSON.stringify(packages, null, 2));
    }
    if (!packages.version) {
        packages.version = '0.0.0';
        (0, fs_1.writeFileSync)(filename, JSON.stringify(packages, null, 2));
    }
}
function addIonicConfigCapacitor(folder) {
    // This will add capacitor to integrations object of ionic.config.json
    // "capacitor": {}
    try {
        const filename = (0, path_1.join)(folder, 'ionic.config.json');
        if ((0, fs_1.existsSync)(filename)) {
            const ionicConfig = JSON.parse((0, fs_1.readFileSync)(filename, 'utf8'));
            ionicConfig.integrations.capacitor = new Object();
            (0, fs_1.writeFileSync)(filename, JSON.stringify(ionicConfig, undefined, 2));
        }
    }
    catch {
        // Just continue
    }
}
//# sourceMappingURL=ionic-init.js.map