"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PMOperation = exports.PackageManager = void 0;
exports.outdatedCommand = outdatedCommand;
exports.listCommand = listCommand;
exports.saveDevArgument = saveDevArgument;
exports.installForceArgument = installForceArgument;
exports.npmInstall = npmInstall;
exports.addCommand = addCommand;
exports.preflightNPMCheck = preflightNPMCheck;
exports.getPackageManagers = getPackageManagers;
exports.suggestInstallAll = suggestInstallAll;
exports.npmInstallAll = npmInstallAll;
exports.npmUpdate = npmUpdate;
exports.npx = npx;
exports.npmUninstall = npmUninstall;
exports.npmRun = npmRun;
const vscode_1 = require("vscode");
const command_name_1 = require("./command-name");
const wn_tree_provider_1 = require("./wn-tree-provider");
const monorepo_1 = require("./monorepo");
const utilities_1 = require("./utilities");
const fs_1 = require("fs");
const workspace_state_1 = require("./workspace-state");
const analyzer_1 = require("./analyzer");
const package_lock_1 = require("./package-lock");
var PackageManager;
(function (PackageManager) {
    PackageManager[PackageManager["npm"] = 0] = "npm";
    PackageManager[PackageManager["yarn"] = 1] = "yarn";
    PackageManager[PackageManager["pnpm"] = 2] = "pnpm";
    PackageManager[PackageManager["bun"] = 3] = "bun";
})(PackageManager || (exports.PackageManager = PackageManager = {}));
var PMOperation;
(function (PMOperation) {
    PMOperation[PMOperation["install"] = 0] = "install";
    PMOperation[PMOperation["installAll"] = 1] = "installAll";
    PMOperation[PMOperation["uninstall"] = 2] = "uninstall";
    PMOperation[PMOperation["update"] = 3] = "update";
    PMOperation[PMOperation["run"] = 4] = "run";
})(PMOperation || (exports.PMOperation = PMOperation = {}));
function outdatedCommand(project) {
    switch (project.packageManager) {
        case PackageManager.yarn: {
            if (project.isYarnV1()) {
                return 'yarn outdated --json';
            }
            // Uses https://github.com/mskelton/yarn-plugin-outdated
            return 'yarn outdated --format=json';
        }
        case PackageManager.bun:
            return 'npm outdated --json';
        case PackageManager.pnpm:
            return 'pnpm outdated --json';
        default:
            return 'npm outdated --json';
    }
}
function listCommand(project) {
    switch (project.packageManager) {
        case PackageManager.yarn:
            return project.isYarnV1() ? 'yarn list --json' : 'yarn info --json';
        case PackageManager.pnpm:
            return 'pnpm list --json';
        case PackageManager.bun:
            return 'npm list --json';
        default:
            return 'npm list --json';
    }
}
function saveDevArgument(project) {
    switch (project.packageManager) {
        case PackageManager.yarn:
            return '--dev';
        default:
            return '--save-dev';
    }
}
function installForceArgument(project) {
    switch (project.packageManager) {
        case PackageManager.yarn:
            return '';
        default:
            return '--force';
    }
}
function npmInstall(name, ...args) {
    const argList = args.join(' ').trim();
    switch (wn_tree_provider_1.exState.repoType) {
        case monorepo_1.MonoRepoType.npm:
            return `${pm(PMOperation.install, name)} ${argList} --workspace=${(0, monorepo_1.getMonoRepoFolder)(wn_tree_provider_1.exState.workspace, undefined)}`;
        case monorepo_1.MonoRepoType.bun:
        case monorepo_1.MonoRepoType.yarn:
        case monorepo_1.MonoRepoType.folder:
        case monorepo_1.MonoRepoType.lerna:
        case monorepo_1.MonoRepoType.pnpm:
            return command_name_1.InternalCommand.cwd + `${pm(PMOperation.install, name)} ${notForce(argList)}`;
        default:
            return `${pm(PMOperation.install, name)} ${notForce(argList)}`;
    }
}
function notForce(args) {
    if (wn_tree_provider_1.exState.packageManager !== PackageManager.yarn)
        return args;
    return args.replace('--force', '');
}
// The package manager add command (without arguments)
function addCommand() {
    const a = pm(PMOperation.install, '*');
    return a.replace('*', '').replace('--save-exact', '').replace('--exact', '').trim();
}
/**
 * Check to see if we have node modules installed and return a command to prepend to any operations we may do
 * @param  {Project} project
 * @returns string
 */
function preflightNPMCheck(project) {
    const nmf = project.getNodeModulesFolder();
    const preop = !(0, fs_1.existsSync)(nmf) && !project.isModernYarn() ? npmInstallAll() + ' && ' : '';
    // If not set then set to a default value to prevent failrue
    if (!process.env.ANDROID_SDK_ROOT && !process.env.ANDROID_HOME && process.platform !== 'win32') {
        process.env.ANDROID_HOME = `~/Library/Android/sdk`;
        //preop = preop + 'export ANDROID_HOME=~/Library/Android/sdk && ';
    }
    return preop;
}
async function getPackageManagers() {
    const result = [];
    if ((0, analyzer_1.isVersionGreaterOrEqual)(await getVersion('npm -v'), '0.0.0')) {
        result.push('npm');
    }
    if ((0, analyzer_1.isVersionGreaterOrEqual)(await getVersion('pnpm -v'), '0.0.0')) {
        result.push('pnpm');
    }
    if ((0, analyzer_1.isVersionGreaterOrEqual)(await getVersion('yarn -v'), '0.0.0')) {
        result.push('yarn');
    }
    if ((0, analyzer_1.isVersionGreaterOrEqual)(await getVersion('bun -v'), '0.0.0')) {
        result.push('bun');
    }
    return result;
}
async function getVersion(cmd) {
    return await (0, utilities_1.getRunOutput)(cmd, '', undefined, true, true);
}
/**
 * Suggests and handles installation of node modules for a project.
 * Prompts the user to choose a package manager if not already specified,
 * and then installs dependencies using the selected package manager.
 *
 * @param project The project for which to install node modules
 */
async function suggestInstallAll(project) {
    if (!wn_tree_provider_1.exState || !wn_tree_provider_1.exState.hasPackageJson) {
        return;
    }
    wn_tree_provider_1.exState.hasNodeModulesNotified = true;
    if (project.isModernYarn()) {
        return;
    }
    const res = (0, workspace_state_1.getExtSetting)(workspace_state_1.ExtensionSetting.packageManager);
    let choice = res;
    if (!res || res == '' || res == 'undefined') {
        if ((0, workspace_state_1.getGlobalSetting)(workspace_state_1.GlobalSetting.suggestNPMInstall) == 'no')
            return;
        const isNpm = (0, package_lock_1.hasPackageLock)(project);
        let message = `Would you like to install node modules for this project?`;
        const options = [];
        let noMessage = 'no';
        if (!isNpm) {
            const list = await getPackageManagers();
            for (const pm of list) {
                options.push(pm);
            }
            if (options.length > 1) {
                message = `Which package manager should be used to install dependencies?`;
                noMessage = 'None of these';
            }
        }
        else {
            options.push('Yes');
        }
        const res = await vscode_1.window.showInformationMessage(message, ...options, noMessage, 'Never');
        choice = `${res}`;
        if (choice == 'Never') {
            (0, workspace_state_1.setGlobalSetting)(workspace_state_1.GlobalSetting.suggestNPMInstall, 'no');
            return;
        }
        if (!choice || choice == noMessage)
            return;
    }
    if (choice == 'npm') {
        wn_tree_provider_1.exState.repoType = monorepo_1.MonoRepoType.npm;
        wn_tree_provider_1.exState.packageManager = PackageManager.npm;
    }
    if (choice == 'pnpm') {
        wn_tree_provider_1.exState.repoType = monorepo_1.MonoRepoType.pnpm;
        wn_tree_provider_1.exState.packageManager = PackageManager.pnpm;
    }
    if (choice == 'yarn') {
        wn_tree_provider_1.exState.repoType = monorepo_1.MonoRepoType.yarn;
        wn_tree_provider_1.exState.packageManager = PackageManager.yarn;
    }
    if (choice == 'bun') {
        wn_tree_provider_1.exState.packageManager = PackageManager.bun;
    }
    if (choice == 'undefined')
        return;
    const message = choice == 'Yes' ? 'Installing dependencies...' : 'Installing dependencies with ' + choice + '...';
    (0, utilities_1.showProgress)(message, async () => {
        await project.runAtRoot(npmInstallAll());
        wn_tree_provider_1.exState.view.reveal(undefined, { focus: true, expand: true });
        vscode_1.commands.executeCommand(command_name_1.CommandName.Refresh);
    });
}
function npmInstallAll() {
    switch (wn_tree_provider_1.exState.repoType) {
        case monorepo_1.MonoRepoType.pnpm:
        case monorepo_1.MonoRepoType.lerna:
        case monorepo_1.MonoRepoType.folder:
            return command_name_1.InternalCommand.cwd + pm(PMOperation.installAll);
        default:
            return pm(PMOperation.installAll);
    }
}
function npmUpdate() {
    switch (wn_tree_provider_1.exState.repoType) {
        case monorepo_1.MonoRepoType.pnpm:
        case monorepo_1.MonoRepoType.lerna:
        case monorepo_1.MonoRepoType.folder:
            return command_name_1.InternalCommand.cwd + pm(PMOperation.update);
        default:
            return pm(PMOperation.update);
    }
}
function pm(operation, name) {
    switch (wn_tree_provider_1.exState.packageManager) {
        case PackageManager.npm:
            return npm(operation, name);
        case PackageManager.yarn:
            return yarn(operation, name);
        case PackageManager.pnpm:
            return pnpm(operation, name);
        case PackageManager.bun:
            return bun(operation, name);
        default:
            vscode_1.window.showErrorMessage('Unknown package manager');
    }
}
function yarn(operation, name) {
    switch (operation) {
        case PMOperation.installAll:
            return 'yarn install';
        case PMOperation.install:
            return `yarn add ${name} --exact`;
        case PMOperation.uninstall:
            return `yarn remove ${name}`;
        case PMOperation.run:
            return `yarn run ${name}`;
        case PMOperation.update:
            return `yarn update`;
    }
}
function npm(operation, name) {
    switch (operation) {
        case PMOperation.installAll:
            return 'npm install';
        case PMOperation.install:
            return `npm install ${name} --save-exact`;
        case PMOperation.uninstall:
            return `npm uninstall ${name}`;
        case PMOperation.run:
            return `npm run ${name}`;
        case PMOperation.update:
            return `npm update`;
    }
}
function pnpm(operation, name) {
    switch (operation) {
        case PMOperation.installAll:
            return 'pnpm install';
        case PMOperation.install:
            return `pnpm add ${name}  --save-exact`;
        case PMOperation.uninstall:
            return `pnpm remove ${name}`;
        case PMOperation.run:
            return `pnpm ${name}`;
        case PMOperation.update:
            return `pnpm update`;
    }
}
function bun(operation, name) {
    switch (operation) {
        case PMOperation.installAll:
            return 'bun install';
        case PMOperation.install:
            return `bun install ${name}  --save-exact`;
        case PMOperation.uninstall:
            return `bun uninstall ${name}`;
        case PMOperation.run:
            return `bun run ${name}`;
        case PMOperation.update:
            return `bun update`;
    }
}
function npx(project, options) {
    switch (project.packageManager) {
        case PackageManager.bun:
            return `${command_name_1.InternalCommand.cwd}bunx`;
        case PackageManager.pnpm:
            return `${command_name_1.InternalCommand.cwd}pnpm exec`;
        case PackageManager.yarn:
            if ((options === null || options === void 0 ? void 0 : options.forceNpx) && !project.isModernYarn()) {
                return `${command_name_1.InternalCommand.cwd}npx`;
            }
            if ((0, analyzer_1.exists)('@yarnpkg/pnpify')) {
                return `${command_name_1.InternalCommand.cwd}yarn pnpify`;
            }
            return `${command_name_1.InternalCommand.cwd}yarn exec`;
        default:
            return `${command_name_1.InternalCommand.cwd}npx`;
    }
}
function npmUninstall(name) {
    switch (wn_tree_provider_1.exState.repoType) {
        case monorepo_1.MonoRepoType.npm:
            return `${pm(PMOperation.uninstall, name)} --workspace=${(0, monorepo_1.getMonoRepoFolder)(wn_tree_provider_1.exState.workspace, undefined)}`;
        case monorepo_1.MonoRepoType.bun:
        case monorepo_1.MonoRepoType.folder:
        case monorepo_1.MonoRepoType.yarn:
        case monorepo_1.MonoRepoType.lerna:
        case monorepo_1.MonoRepoType.pnpm:
            return `${command_name_1.InternalCommand.cwd}${pm(PMOperation.uninstall, name)}`;
        default:
            return pm(PMOperation.uninstall, name);
    }
}
function npmRun(name) {
    switch (wn_tree_provider_1.exState.repoType) {
        case monorepo_1.MonoRepoType.npm:
            return `${pm(PMOperation.run, name)} --workspace=${(0, monorepo_1.getMonoRepoFolder)(wn_tree_provider_1.exState.workspace, undefined)}`;
        case monorepo_1.MonoRepoType.bun:
        case monorepo_1.MonoRepoType.folder:
        case monorepo_1.MonoRepoType.yarn:
        case monorepo_1.MonoRepoType.lerna:
        case monorepo_1.MonoRepoType.pnpm:
            return `${command_name_1.InternalCommand.cwd}${pm(PMOperation.run, name)}`;
        default:
            return pm(PMOperation.run, name);
    }
}
//# sourceMappingURL=node-commands.js.map