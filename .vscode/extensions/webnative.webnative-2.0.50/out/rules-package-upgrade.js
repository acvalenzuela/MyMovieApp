"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packageUpgrade = packageUpgrade;
const fix_issue_1 = require("./features/fix-issue");
const node_commands_1 = require("./node-commands");
const tip_1 = require("./tip");
const utilities_1 = require("./utilities");
const vscode_1 = require("vscode");
const vscode_2 = require("vscode");
/**
 * Upgrade a package by allowing a user to select from the available versions
 * @param  {PackageInfo} info
 * @param  {string} folder
 */
async function packageUpgrade(info, folder) {
    let txt = '';
    await (0, utilities_1.showProgress)(`Finding versions of ${info.name}`, async () => {
        txt = await (0, utilities_1.getRunOutput)(`npm view ${info.name} versions --json`, folder);
    });
    const versions = JSON.parse(txt).reverse();
    const idx = versions.findIndex((version) => info.version == version);
    versions.splice(idx, 1);
    const picks = [];
    const betas = [];
    picks.push({ label: 'Releases', kind: vscode_2.QuickPickItemKind.Separator });
    for (const version of versions) {
        if (version.includes('-')) {
            betas.push(version);
        }
        else {
            picks.push({ label: version });
        }
    }
    if (betas.length > 0) {
        picks.push({ label: 'Betas', kind: vscode_2.QuickPickItemKind.Separator });
        for (const version of betas) {
            picks.push({ label: version });
        }
    }
    const selection = await vscode_1.window.showQuickPick(picks, {
        placeHolder: `Update to version of ${info.name}`,
    });
    if (!selection)
        return;
    const message = `Update ${info.name} to ${selection.label}`;
    await (0, fix_issue_1.fixIssue)((0, node_commands_1.npmInstall)(`${info.name}@${selection.label}`), folder, undefined, new tip_1.Tip(message, undefined).showProgressDialog(), undefined, message);
    return true;
}
//# sourceMappingURL=rules-package-upgrade.js.map