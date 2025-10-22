"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkBuilderIntegration = checkBuilderIntegration;
exports.builderDevelopAuth = builderDevelopAuth;
exports.builderDevelopInteractive = builderDevelopInteractive;
exports.builderSettingsRules = builderSettingsRules;
exports.hasBuilder = hasBuilder;
exports.builderOpen = builderOpen;
exports.builderDevelopPrompt = builderDevelopPrompt;
exports.chat = chat;
const vscode_1 = require("vscode");
const analyzer_1 = require("./analyzer");
const command_name_1 = require("./command-name");
const tip_1 = require("./tip");
const logging_1 = require("./logging");
const workspace_state_1 = require("./workspace-state");
const terminal_1 = require("./terminal");
const path_1 = require("path");
const fs_1 = require("fs");
const utilities_1 = require("./utilities");
const wn_tree_provider_1 = require("./wn-tree-provider");
function checkBuilderIntegration() {
    const tips = [];
    if (!(0, analyzer_1.exists)('@builder.io/dev-tools') &&
        ((0, analyzer_1.exists)('next') || (0, analyzer_1.exists)('react') || (0, analyzer_1.exists)('@remix-run/react') || (0, analyzer_1.exists)('@angular/core') || (0, analyzer_1.exists)('qwik')))
        return [
            new tip_1.Tip('Integrate DevTools', '', tip_1.TipType.None, 'Run Builder.io Develop', undefined, 'Add Builder', '', undefined, 'Add Builder')
                .setQueuedAction(addDevTools)
                .setTooltip('Integrate Builder.io Publish (Visual CMS) into this project?')
                .canRefreshAfter(),
        ];
    // Below will do the same thing but it is ignoring the text sent to it
    // tips.push(
    //   new Tip(
    //     'Integrate DevTools',
    //     '',
    //     TipType.None,
    //     'Integrate Builder.io Publish (Visual CMS) into this project?',
    //     ['npm init builder.io@latest', runApp],
    //     'Add Builder',
    //     'Builder support added to your project. Click Run to complete the integration.',
    //     undefined,
    //     'Adding Builder.io DevTools to this Project...',
    //   )
    //     .setRunPoints([
    //       {
    //         title: '',
    //         text: 'Would you like to integrate Builder.io with this app?',
    //         action: async (message) => {
    //           return '\r\n'; // Just press enter
    //         },
    //       },
    //       {
    //         title: '',
    //         text: 'Which sdk would you like to install?',
    //         action: async (message) => {
    //           return '\r\n'; // Just press enter to pick the recommended one
    //         },
    //       },
    //     ])
    //     .showProgressDialog()
    //     .canIgnore(),
    // );
    return tips;
}
async function addDevTools(queueFunction) {
    queueFunction();
    (0, terminal_1.runInTerminal)(`npm init builder.io@latest`);
}
function runApp() {
    return new Promise((resolve) => {
        (0, logging_1.showOutput)();
        vscode_1.commands.executeCommand(command_name_1.CommandName.RunForWeb);
        resolve();
    });
}
function builderDevelopAuth() {
    const builder = hasBuilder();
    const title = builder ? 'Reauthenticate' : 'Integrate Builder';
    return [
        new tip_1.Tip(title, '', builder ? tip_1.TipType.None : tip_1.TipType.Builder, 'Authenticate with Builder.io for this project?', [auth, rememberAuth], 'Authenticate', 'Builder authenticated.', 'https://www.builder.io/', 'Authenticating with Builder.io for this Project...')
            .setRunPoints([
            {
                title: '',
                text: 'Would you like to authenticate with Builder.io for this app?',
                action: async (message) => {
                    return '\r\n'; // Just press enter
                },
            },
        ])
            .canIgnore(),
    ];
}
async function auth() {
    const folder = wn_tree_provider_1.exState.projectRef.projectFolder();
    const cmd = 'npx builder.io auth';
    await (0, utilities_1.runWithProgress)(cmd, 'Authenticating With Builder', folder);
}
async function rememberAuth() {
    await (0, workspace_state_1.setSetting)(workspace_state_1.WorkspaceSetting.builderAuthenticated, true);
}
function builderDevelopInteractive() {
    if (!hasBuilder())
        return undefined;
    return new tip_1.Tip('Chat', 'Interactive', tip_1.TipType.None, 'Run Builder.io Develop', undefined, 'Builder Develop', '', undefined, 'Builder Develop')
        .setQueuedAction(develop)
        .setTooltip('Chat with Builder Develop interactively in the terminal to modify your project')
        .canRefreshAfter();
}
// Builder Rules File
function builderSettingsRules(project) {
    if (!hasBuilder())
        return undefined;
    return new tip_1.Tip('Rules', '', tip_1.TipType.None, 'Open the Builder Develop Rules file (custom instructions for the AI)').setQueuedAction(async () => {
        const file = (0, path_1.join)(project.projectFolder(), '.builderrules');
        if (!(0, fs_1.existsSync)(file)) {
            (0, fs_1.writeFileSync)(file, '# .builderrules (see https://www.builder.io/c/docs/cli-code-generation-best-practices#project-level-settings)\r\n\r\n', { encoding: 'utf8' });
        }
        const doc = await vscode_1.workspace.openTextDocument(vscode_1.Uri.file(file));
        await vscode_1.window.showTextDocument(doc);
    });
}
function hasBuilder() {
    const authed = (0, workspace_state_1.getSetting)(workspace_state_1.WorkspaceSetting.builderAuthenticated);
    if (authed || hasDevTools())
        return true;
    return false;
}
function hasDevTools() {
    return (0, analyzer_1.exists)('@builder.io/dev-tools');
}
// Open Builder
function builderOpen() {
    if (!hasBuilder())
        return undefined;
    return new tip_1.Tip('Open', '', tip_1.TipType.None, '').setQueuedAction(async () => {
        (0, utilities_1.openUri)('https://builder.io/content');
        //viewInEditor('https://builder.io/content', true, false, true, true );
    });
}
// Chat: Builder Develop Prompt
function builderDevelopPrompt(project) {
    if (!hasBuilder())
        return undefined;
    return new tip_1.Tip('Chat', '', tip_1.TipType.None, 'Chat with Builder Develop')
        .setTooltip('Chat with Builder Develop to modify your project')
        .setQueuedAction(async () => {
        await chat(project.projectFolder());
    });
}
async function chat(folder, url, append, prompt) {
    let chatting = true;
    while (chatting) {
        const title = url
            ? `How would you like to integrate this Figma design?`
            : `How would you like to modify your project?`;
        if (!prompt) {
            prompt = await vscode_1.window.showInputBox({
                title,
                placeHolder: 'Enter prompt (eg "Create a component called Pricing Page")',
                ignoreFocusOut: true,
            });
            if (!prompt)
                return undefined;
        }
        const cmd = `npx builder.io@latest code --prompt "${prompt}" ${url ? `--url "${url}"${append !== null && append !== void 0 ? append : ''}` : ''}`;
        (0, logging_1.write)(`> ${cmd}`);
        await vscode_1.window.withProgress({
            location: vscode_1.ProgressLocation.Notification,
            title: `Builder`,
            cancellable: true,
        }, async (progress, token) => {
            const cancelObject = { proc: undefined, cancelled: false };
            await (0, utilities_1.run)(folder, cmd, cancelObject, [], [], progress, undefined, undefined, false, undefined, true, true);
        });
        const view = 'View Response';
        const chat = 'Chat More';
        chatting = false;
        const res = await vscode_1.window.showInformationMessage(`Builder Develop has Finished.`, chat, view, 'Exit');
        if (res == view) {
            wn_tree_provider_1.exState.channelFocus = true;
            (0, logging_1.showOutput)();
        }
        if (res == chat) {
            url = undefined;
            append = undefined;
            chatting = true;
        }
    }
}
async function develop(queueFunction) {
    queueFunction();
    (0, terminal_1.runInTerminal)(`npx @builder.io/dev-tools@latest code`);
}
//# sourceMappingURL=integrations-builder.js.map