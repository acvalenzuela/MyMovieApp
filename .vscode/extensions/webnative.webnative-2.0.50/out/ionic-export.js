"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ionicExport = ionicExport;
const project_1 = require("./project");
const semver_1 = require("semver");
const fs_1 = require("fs");
const path_1 = require("path");
const utilities_1 = require("./utilities");
const vscode_1 = require("vscode");
const npm_info_1 = require("./npm-info");
const logging_1 = require("./logging");
const utils_strings_1 = require("./utils-strings");
async function ionicExport(queueFunction, project, context) {
    var _a, _b;
    queueFunction();
    let folder = project.projectFolder();
    if ((_a = project.monoRepo) === null || _a === void 0 ? void 0 : _a.nodeModulesAtRoot) {
        folder = project.folder;
    }
    const summary = await (0, project_1.inspectProject)(folder, context, undefined);
    let txt = '';
    let total = 0;
    let good = 0;
    for (const libType of ['Capacitor Plugin', 'Plugin', 'Dependency']) {
        let lastScope = '';
        txt += `## ${(0, utilities_1.plural)(libType)}\n\n`;
        for (const library of Object.keys(summary.packages).sort()) {
            const pkg = summary.packages[library];
            if (pkg.depType == libType) {
                let lastReleased = 0;
                let link;
                let message;
                const isCustom = pkg.latest === '[custom]';
                let point = '🟩';
                if (!isCustom) {
                    try {
                        (0, logging_1.write)(`Inspecting ${library}`);
                        const npmInfo = await (0, npm_info_1.getNpmInfo)(library, false);
                        // example: released = 2016-03-17T15:16:31.913Z
                        const released = npmInfo.time[pkg.version];
                        const keys = Object.keys(npmInfo.time);
                        const modified = npmInfo.time[keys[keys.length - 1]];
                        lastReleased = daysAgo(new Date(modified));
                        link = cleanLink((_b = npmInfo.repository) === null || _b === void 0 ? void 0 : _b.url);
                    }
                    catch (err) {
                        (0, logging_1.writeError)(`${library}: ${err}`);
                        point = '🟧';
                        message = `Unable to find information on npm.`;
                    }
                }
                if (lastReleased > 730) {
                    point = '🟥';
                    message = `Unmaintained (${timePeriod(lastReleased)} since last release)`;
                }
                else if (lastReleased > 365) {
                    point = '🟧';
                    message = `May be unmaintained (${timePeriod(lastReleased)} since last release)`;
                }
                if (isCustom) {
                    point = '🟧';
                    message = `Requires manual developer maintenance as it custom / forked.`;
                }
                if (!isCustom) {
                    const current = (0, semver_1.coerce)(pkg.version);
                    const latest = (0, semver_1.coerce)(pkg.latest);
                    if (latest.major - current.major >= 1) {
                        point = '🟧';
                        const count = latest.major - current.major;
                        message = `Is behind ${count} major version${count > 1 ? 's' : ''}.`;
                    }
                }
                if (library.startsWith('@ionic-native/')) {
                    point = '🟧';
                    message = `Is deprecated and replaced with @awesome-cordova-plugins.`;
                }
                const scope = (0, utils_strings_1.getStringFrom)(library, '@', '/');
                let name = `${library}`;
                if (!isCustom) {
                    name = name + `@${pkg.version}`;
                }
                if (link) {
                    name = `[${name}](${link})`;
                }
                txt += `- ${point} ${name}`;
                txt += pkg.current ? ` - (Latest ${pkg.latest})` : ``;
                const tip = getTip(library, summary.project.groups);
                if (tip) {
                    txt += ` - ${tip.message}`;
                }
                else if (message) {
                    txt += ` - ${message}`;
                }
                txt += '\n';
                if (point == '🟩')
                    good++;
                total++;
                lastScope = scope;
            }
        }
    }
    txt += `### Maintenance Score\n`;
    txt += `${good} out of ${total} dependencies were up to date without issues.\n\n`;
    txt += exportNamingStyles(summary.project.projectFolder());
    const filename = (0, path_1.join)(summary.project.projectFolder(), 'project-summary.md');
    (0, fs_1.writeFileSync)(filename, txt);
    vscode_1.window.showInformationMessage(`Exported ${filename}`);
}
function timePeriod(days) {
    if (days < 365) {
        return `${days} days`;
    }
    const years = days / 365.0;
    return `${Math.round(years * 10) / 10} years`;
}
function daysAgo(d) {
    const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    const today = new Date();
    return Math.round(Math.abs((d - today) / oneDay));
}
function cleanLink(url) {
    url = url.replace('git+ssh://git@', 'https://');
    url = url.replace('git://github.com/', 'https://github.com/');
    url = url.replace('git+https://', 'https://');
    url = url.replace('git://', '');
    return url;
}
function exportNamingStyles(folder) {
    const filenames = [];
    const baseFolder = (0, path_1.join)(folder, 'src');
    getAllFiles(baseFolder, filenames);
    let txt = '\n\n## Nonstandard naming\n';
    txt += 'The following files and folders do not follow the standard naming convention:\n\n';
    for (const filename of filenames) {
        const name = filename.replace(baseFolder, '');
        if (name.toLowerCase() != name) {
            txt += `- ${name}\n`;
        }
    }
    return txt;
}
function getAllFiles(folder, arrayOfFiles) {
    if (!(0, fs_1.existsSync)(folder)) {
        return [];
    }
    const files = (0, fs_1.readdirSync)(folder);
    arrayOfFiles = arrayOfFiles || [];
    for (const file of files) {
        if ((0, fs_1.statSync)((0, path_1.join)(folder, file)).isDirectory()) {
            arrayOfFiles = getAllFiles((0, path_1.join)(folder, file), arrayOfFiles);
        }
        else {
            arrayOfFiles.push((0, path_1.join)(folder, file));
        }
    }
    return arrayOfFiles;
}
function getTip(library, recommendations) {
    var _a;
    for (const parent of recommendations) {
        for (const recommendation of parent.children) {
            if (((_a = recommendation.tip) === null || _a === void 0 ? void 0 : _a.relatedDependency) == library) {
                return recommendation.tip;
            }
        }
    }
    return undefined;
}
//# sourceMappingURL=ionic-export.js.map