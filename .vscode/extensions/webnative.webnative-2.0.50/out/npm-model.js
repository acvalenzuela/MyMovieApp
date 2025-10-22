"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageVersion = exports.PackageType = void 0;
var PackageType;
(function (PackageType) {
    PackageType["Dependency"] = "Dependency";
    PackageType["CapacitorPlugin"] = "Capacitor Plugin";
    PackageType["CordovaPlugin"] = "Plugin";
})(PackageType || (exports.PackageType = PackageType = {}));
var PackageVersion;
(function (PackageVersion) {
    PackageVersion["Unknown"] = "Unknown";
    // Like a version that is pulled from git or local folder
    PackageVersion["Custom"] = "[custom]";
})(PackageVersion || (exports.PackageVersion = PackageVersion = {}));
//# sourceMappingURL=npm-model.js.map