"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCapacitorPluginMigration = checkCapacitorPluginMigration;
exports.migrateCapacitorPlugin = migrateCapacitorPlugin;
const analyzer_1 = require("./analyzer");
const logging_1 = require("./logging");
const tip_1 = require("./tip");
const vscode_1 = require("vscode");
const utilities_1 = require("./utilities");
const node_commands_1 = require("./node-commands");
const command_name_1 = require("./command-name");
const wn_tree_provider_1 = require("./wn-tree-provider");
function checkCapacitorPluginMigration(project) {
    suggestCapacitorPluginMigration('6.0.0', '7.0.0', tip_1.TipType.Capacitor, project, {
        changesLink: 'https://capacitorjs.com/docs/updating/plugins/7-0',
        migrateCommand: '@capacitor/plugin-migration-v6-to-v7@latest',
    });
    suggestCapacitorPluginMigration('5.0.0', '6.0.0', tip_1.TipType.Capacitor, project, {
        changesLink: 'https://capacitorjs.com/docs/updating/plugins/6-0',
        migrateCommand: '@capacitor/plugin-migration-v5-to-v6@latest',
    });
    if ((0, analyzer_1.isGreaterOrEqual)('@capacitor/core', '4.0.0') && (0, analyzer_1.isLess)('@capacitor/core', '5.0.0')) {
        // Capacitor 4 to 5 plugin migration
        project.add(new tip_1.Tip('Migrate Plugin to Capacitor 5', undefined, tip_1.TipType.Error).setQueuedAction(migratePluginToCapacitor5, project));
    }
}
async function migrateCapacitorPlugin(queueFunction, project, currentVersion, migrateVersion, migrateOptions) {
    const result = await vscode_1.window.showInformationMessage(`Migrate this Capacitor Plugin from ${currentVersion} to version ${migrateVersion}?`, `Migrate to v${migrateVersion}`, 'Ignore');
    if (result == 'Ignore') {
        return command_name_1.ActionResult.Ignore;
    }
    if (!result) {
        return;
    }
    queueFunction();
    const cmd = `${(0, node_commands_1.npx)(project)} ${migrateOptions.migrateCommand}`;
    (0, logging_1.write)(`> ${cmd}`);
    try {
        await (0, utilities_1.showProgress)('Migrating Plugin...', async () => {
            await project.run2(cmd, false);
        });
    }
    finally {
        const message = `Capacitor Plugin migration to v${migrateVersion} completed.`;
        (0, logging_1.writeWN)(message);
        (0, logging_1.showOutput)();
        const changesTitle = 'View Changes';
        vscode_1.window.showInformationMessage(message, changesTitle, 'OK').then((res) => {
            if (res == changesTitle) {
                (0, utilities_1.openUri)(migrateOptions.changesLink);
            }
        });
    }
    //)
}
function suggestCapacitorPluginMigration(minCapacitorCore, maxCapacitorCore, type, project, migrateOptions) {
    if ((0, analyzer_1.isLess)('@capacitor/core', maxCapacitorCore)) {
        if (wn_tree_provider_1.exState.hasNodeModules && (0, analyzer_1.isGreaterOrEqual)('@capacitor/core', minCapacitorCore)) {
            project.tip(new tip_1.Tip(`Migrate Capacitor Plugin to ${maxCapacitorCore}`, '', type)
                .setQueuedAction(migrateCapacitorPlugin, project, (0, analyzer_1.getPackageVersion)('@capacitor/core'), maxCapacitorCore, migrateOptions)
                .canIgnore());
        }
    }
}
async function migratePluginToCapacitor5(queueFunction, project) {
    const txt = 'Migrate Plugin';
    const res = await vscode_1.window.showInformationMessage(`Your Capacitor 4 plugin can be migrated to Capacitor 5.`, txt, 'Exit');
    if (!res || res != txt)
        return;
    queueFunction();
    (0, logging_1.showOutput)();
    await (0, utilities_1.showProgress)('Migrating Plugin...', async () => {
        await project.run2('npx @capacitor/plugin-migration-v4-to-v5@latest', false);
        const msg = `Plugin has been migrated. Please read migration docs and verify your plugin before publishing.`;
        (0, logging_1.writeWN)(msg);
        vscode_1.window.showInformationMessage(msg, 'OK');
    });
}
//# sourceMappingURL=rules-capacitor-plugins.js.map