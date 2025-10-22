"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPackages = checkPackages;
exports.checkRemoteDependencies = checkRemoteDependencies;
const tip_1 = require("./tip");
const analyzer_1 = require("./analyzer");
const node_commands_1 = require("./node-commands");
const wn_tree_provider_1 = require("./wn-tree-provider");
const fs_1 = require("fs");
/**
 * General Rules for packages like momentjs, jquery, etc
 * @param  {Project} project
 */
function checkPackages(project) {
    const nmf = project.getNodeModulesFolder();
    wn_tree_provider_1.exState.hasNodeModules = true;
    wn_tree_provider_1.exState.nodeModulesFolder = nmf;
    if (!(0, fs_1.existsSync)(nmf) && !project.isModernYarn()) {
        wn_tree_provider_1.exState.hasNodeModules = false;
        project.add(new tip_1.Tip('Install Node Modules', '', tip_1.TipType.Idea, 'Install Node Modules', (0, node_commands_1.npmInstallAll)(), 'Installing Node Modules...')
            .performRun()
            .showProgressDialog());
        if (!wn_tree_provider_1.exState.hasNodeModulesNotified) {
            (0, node_commands_1.suggestInstallAll)(project);
        }
    }
    // Replace momentjs with date-fns
    project.recommendReplace('moment', `momentjs`, `Migrate the deprecated moment.js to date-fns`, `Migrate away from the deprecated library moment. A good replacement is date-fns which is significantly smaller and built for modern tooling (https://date-fns.org/)`, 'date-fns');
    // Remove jquery
    project.recommendRemove('jquery', 'jQuery', `Refactor your code to remove the dependency on jquery. Much of the API for Jquery is now available in browsers and often Jquery code conflicts with code written in your framework of choice.`);
    // Remove rxjs-compat by migrating v5 to v6+
    project.recommendRemove('rxjs-compat', 'rxjs-compat', `Migrate your code from rxjs v5 to v6+ so that rxjs-compat is not necessary.`, undefined, 'https://ncjamieson.com/avoiding-rxjs-compat/');
    // cordova-plugin-android-fingerprint-auth and Identity Vault clash with a duplicate resources error
    if ((0, analyzer_1.exists)('@ionic-enterprise/identity-vault') && (0, analyzer_1.exists)('cordova-plugin-android-fingerprint-auth')) {
        project.recommendRemove('cordova-plugin-android-fingerprint-auth', `cordova-plugin-android-fingerprint-auth`, `This plugin should be removed as it cannot be used in conjunction with Identity Vault (which provides the same functionality).`);
    }
    // node-sass deprecated and not required
    project.recommendRemove('node-sass', 'node-sass', `The dependency node-sass is deprecated and should be removed from package.json.`);
    if ((0, analyzer_1.exists)('cordova-plugin-file-opener2') && (0, analyzer_1.isLessOrEqual)('cordova-plugin-file-opener2', '3.0.5')) {
        project.recommendRemove('cordova-plugin-file-opener2', 'cordova-plugin-file-opener2', 'Your project uses cordova-plugin-file-opener2 which will be rejected from the Play Store due to use of REQUEST_INSTALL_PACKAGES permission. Upgrade to version 4+');
    }
    // Ionic 3+
    if ((0, analyzer_1.exists)('ionic-angular')) {
        if ((0, analyzer_1.exists)('@ionic/angular')) {
            project.recommendRemove('ionic-angular', 'ionic-angular', 'Your project has 2 versions of Ionic Angular installed (ionic-angular and @ionic/angular). You should remove ionic-angular');
        }
        else {
            project.note('@ionic/angular', 'Your Ionic project should be migrated to @ionic/angular version 5 or higher', 'https://ionicframework.com/docs/reference/migration#migrating-from-ionic-3-0-to-ionic-4-0');
        }
    }
    // Angular 10 is in LTS until December 2021
    project.tip((0, analyzer_1.warnMinVersion)('@angular/core', '10.0.0', '. Your version is no longer supported.', 'https://angular.io/guide/releases#support-policy-and-schedule'));
    if (!(0, analyzer_1.exists)('@awesome-cordova-plugins/core')) {
        const matching = (0, analyzer_1.matchingBeginingWith)('@awesome-cordova-plugins');
        if (matching.length > 0) {
            project.recommendAdd('@awesome-cordova-plugins/core', '@awesome-cordova-plugins/core', 'Missing @awesome-cordova-plugins/core', 'You are using awesome-cordova-plugins which require @awesome-cordova-plugins/core.', false);
        }
    }
    if ((0, analyzer_1.isGreaterOrEqual)('@angular/core', '11.0.0')) {
        project.checkNotExists('codelyzer', 'Codelyzer was popular in Angular projects before version 11 but has been superceded by angular-eslint. You can remove this dependency.');
    }
}
function checkRemoteDependencies(project) {
    // Look for dependencies that come from github etc
    const packages = (0, analyzer_1.remotePackages)();
    if (packages.length > 0) {
        project.add(new tip_1.Tip('Remote Dependencies', `Your project uses remote dependencies that can change at any time.`, tip_1.TipType.Warning, `Using dependencies from locations like github or http mean that no 2 builds are guaranteed to produce the same binary. These packages should use versioned dependencies: ${packages.join(', ')}`, tip_1.Command.NoOp).canIgnore());
    }
}
//# sourceMappingURL=rules-packages.js.map