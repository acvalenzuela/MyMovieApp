"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capacitorAdd = capacitorAdd;
const capacitor_run_1 = require("./capacitor-run");
const command_name_1 = require("./command-name");
const monorepo_1 = require("./monorepo");
const node_commands_1 = require("./node-commands");
/**
 * Add a Capacitor Platform
 * @param  {Project} project
 * @param  {CapacitorPlatform} platform
 * @returns string
 */
function capacitorAdd(project, platform) {
    const ionic = (0, capacitor_run_1.useIonicCLI)() ? 'ionic ' : '';
    switch (project.repoType) {
        case monorepo_1.MonoRepoType.none:
            return `${(0, node_commands_1.npx)(project)} ${ionic}cap add ${platform}`;
        case monorepo_1.MonoRepoType.npm:
        case monorepo_1.MonoRepoType.bun:
        case monorepo_1.MonoRepoType.yarn:
        case monorepo_1.MonoRepoType.lerna:
        case monorepo_1.MonoRepoType.folder:
        case monorepo_1.MonoRepoType.pnpm:
            return `${command_name_1.InternalCommand.cwd}${(0, node_commands_1.npx)(project)} ${ionic}cap add ${platform}`;
        case monorepo_1.MonoRepoType.nx:
            return nxAdd(project, platform);
        default:
            throw new Error('Unsupported Monorepo type');
    }
}
function nxAdd(project, platform) {
    return `${(0, node_commands_1.npx)(project)} nx run ${project.monoRepo.name}:add:${platform}`;
}
//# sourceMappingURL=capacitor-add.js.map