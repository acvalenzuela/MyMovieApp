"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeConsistentVersionError = exports.writeConsistentVersionWarning = exports.writeMinVersionWarning = exports.writeMinVersionError = exports.libString = exports.error = void 0;
const node_commands_1 = require("./node-commands");
const tip_1 = require("./tip");
const error = (title, str) => {
    return new tip_1.Tip(title, str, tip_1.TipType.Error, str, tip_1.Command.NoOp, 'OK').canIgnore();
};
exports.error = error;
const libString = (lib, ver) => {
    const vstr = ver ? ` (${ver})` : '';
    return `${lib}${vstr}`;
};
exports.libString = libString;
const writeMinVersionError = (library, version, minVersion, reason) => {
    return new tip_1.Tip(library, `${library} must be upgraded from ${version} to at least version ${minVersion}${reason ? ' ' + reason : ''}`, tip_1.TipType.Error, undefined, (0, node_commands_1.npmInstall)(library + '@latest'), `Upgrade`, `${library} successfully updated.`).canIgnore();
};
exports.writeMinVersionError = writeMinVersionError;
const writeMinVersionWarning = (library, version, minVersion, reason, url) => {
    let r = reason ? ' ' + reason : '';
    if (url)
        r = `[${reason}](${url})`;
    return new tip_1.Tip(library, `Update to at least ${minVersion}${reason ? ' ' + reason : ''}`, tip_1.TipType.Idea, `${library} ${version} should be updated to at least ${minVersion}${reason ? ' ' + reason : ''}`, (0, node_commands_1.npmInstall)(`${library}@latest`), `Upgrade`, `${library} successfully updated.`).canIgnore();
};
exports.writeMinVersionWarning = writeMinVersionWarning;
const writeConsistentVersionWarning = (lib1, ver1, lib2, ver2) => {
    return new tip_1.Tip(lib2, `Version of ${(0, exports.libString)(lib2, ver2)} should match ${(0, exports.libString)(lib1, ver1)}`, tip_1.TipType.Error, undefined, (0, node_commands_1.npmInstall)(`${lib2}@${ver1}`), `Upgrade`, `${lib2} successfully updated.`).canIgnore();
};
exports.writeConsistentVersionWarning = writeConsistentVersionWarning;
const writeConsistentVersionError = (lib1, ver1, lib2, ver2) => {
    return new tip_1.Tip(lib2, `Version of ${(0, exports.libString)(lib2, ver2)} must match ${(0, exports.libString)(lib1, ver1)}`, tip_1.TipType.Error, undefined, (0, node_commands_1.npmInstall)(`${lib2}@${ver1}`), `Upgrade`, `${lib2} successfully updated.`).canIgnore();
};
exports.writeConsistentVersionError = writeConsistentVersionError;
//# sourceMappingURL=messages.js.map