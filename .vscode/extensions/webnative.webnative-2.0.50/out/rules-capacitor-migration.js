"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capacitorMigrationChecks = capacitorMigrationChecks;
const analyzer_1 = require("./analyzer");
const command_name_1 = require("./command-name");
const process_packages_1 = require("./process-packages");
const rules_capacitor_1 = require("./rules-capacitor");
const tip_1 = require("./tip");
const utilities_1 = require("./utilities");
async function capacitorMigrationChecks(packages, project) {
    const tips = [];
    project.setGroup('Capacitor Migration', 'Your Cordova application ' +
        project.name +
        ' can be migrated to Capacitor (see [guide](https://capacitorjs.com/docs/cordova/migrating-from-cordova-to-capacitor)). The following recommendations will help with the migration:', tip_1.TipType.Capacitor, true);
    const list = await (0, rules_capacitor_1.capacitorRecommendations)(project, true);
    tips.push(...list);
    // Plugins with Hooks
    tips.push(...(0, process_packages_1.reviewPluginsWithHooks)(packages));
    // Requires evaluation to determine compatibility
    tips.push((0, analyzer_1.reviewPlugin)('cordova-wheel-selector-plugin'));
    tips.push((0, analyzer_1.reviewPlugin)('cordova-plugin-secure-storage'));
    tips.push((0, analyzer_1.reviewPlugin)('newrelic-cordova-plugin'));
    if ((0, analyzer_1.exists)('cordova-ios') || (0, analyzer_1.exists)('cordova-android') || project.fileExists('config.xml')) {
        const movecmd = (0, utilities_1.isWindows)() ? 'rename config.xml config.xml.bak' : 'mv config.xml config.xml.bak';
        tips.push(new tip_1.Tip('Remove Cordova Project', '', tip_1.TipType.Capacitor, 'Remove the Cordova integration', ['npm uninstall cordova-ios', 'npm uninstall cordova-android', movecmd, command_name_1.InternalCommand.removeCordova], 'Remove Cordova', 'Removing Cordova', 'Successfully removed Cordova'));
    }
    project.tips(tips);
}
//# sourceMappingURL=rules-capacitor-migration.js.map