"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capacitorSync = capacitorSync;
const monorepo_1 = require("./monorepo");
const analyzer_1 = require("./analyzer");
const command_name_1 = require("./command-name");
const node_commands_1 = require("./node-commands");
const capacitor_run_1 = require("./capacitor-run");
const build_configuration_1 = require("./build-configuration");
/**
 * Creates the capacitor sync command
 * @param  {Project} project
 * @returns string
 */
async function capacitorSync(project) {
    const preop = (0, node_commands_1.preflightNPMCheck)(project);
    const ionicCLI = (0, capacitor_run_1.useIonicCLI)();
    switch (project.repoType) {
        case monorepo_1.MonoRepoType.none:
            return preop + (ionicCLI ? ionicCLISync(project) : capCLISync(project));
        case monorepo_1.MonoRepoType.folder:
        case monorepo_1.MonoRepoType.pnpm:
        case monorepo_1.MonoRepoType.lerna:
        case monorepo_1.MonoRepoType.yarn:
        case monorepo_1.MonoRepoType.bun:
        case monorepo_1.MonoRepoType.npm:
            return command_name_1.InternalCommand.cwd + preop + (ionicCLI ? ionicCLISync(project) : capCLISync(project));
        case monorepo_1.MonoRepoType.nx:
            return preop + nxSync(project);
        default:
            throw new Error('Unsupported Monorepo type');
    }
}
function capCLISync(project) {
    if ((0, analyzer_1.isGreaterOrEqual)('@capacitor/cli', '4.1.0')) {
        return `${(0, node_commands_1.npx)(project)} cap sync --inline`;
    }
    return `${(0, node_commands_1.npx)(project)} cap sync${(0, build_configuration_1.getBuildConfigurationArgs)()}`;
}
function ionicCLISync(project) {
    return `${(0, node_commands_1.npx)(project)} ionic cap sync --inline${(0, build_configuration_1.getBuildConfigurationArgs)()}`;
}
function nxSync(project) {
    if (project.monoRepo.isNXStandalone) {
        return capCLISync(project);
    }
    return `${(0, node_commands_1.npx)(project)} nx sync ${project.monoRepo.name}${(0, build_configuration_1.getBuildConfigurationArgs)()}`;
}
//# sourceMappingURL=capacitor-sync.js.map