"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixIssue = fixIssue;
exports.fix = fix;
exports.execute = execute;
exports.runAction = runAction;
exports.runAgain = runAgain;
exports.findAndRun = findAndRun;
const vscode_1 = require("vscode");
const tasks_1 = require("../tasks");
const tip_1 = require("../tip");
const wn_tree_provider_1 = require("../wn-tree-provider");
const utilities_1 = require("../utilities");
const logging_1 = require("../logging");
const command_name_1 = require("../command-name");
const capacitor_platform_1 = require("../capacitor-platform");
const process_list_1 = require("../process-list");
const ignore_1 = require("../ignore");
const context_variables_1 = require("../context-variables");
const run_web_1 = require("../run-web");
const capacitor_device_1 = require("../capacitor-device");
/**
 * Runs the command while showing a vscode window that can be cancelled
 * @param  {string|string[]} command Node command
 * @param  {string} rootPath path to run the command
 * @param  {ExTreeProvider} ionicProvider? the provide which will be refreshed on completion
 * @param  {string} successMessage? Message to display if successful
 */
async function fixIssue(command, rootPath, ionicProvider, tip, successMessage, title) {
    const hasRunPoints = tip && tip.runPoints && tip.runPoints.length > 0;
    if (command == tip_1.Command.NoOp) {
        await tip.executeAction();
        ionicProvider === null || ionicProvider === void 0 ? void 0 : ionicProvider.refresh();
        return;
    }
    // If the task is already running then cancel it
    const didCancel = await (0, tasks_1.cancelIfRunning)(tip);
    if (didCancel) {
        (0, tasks_1.finishCommand)(tip);
        return;
    }
    (0, tasks_1.markOperationAsRunning)(tip);
    let msg = tip.commandProgress ? tip.commandProgress : tip.commandTitle ? tip.commandTitle : command;
    if (title)
        msg = title;
    let failed = false;
    let cancelled = false;
    await vscode_1.window.withProgress({
        location: tip.progressDialog ? vscode_1.ProgressLocation.Notification : vscode_1.ProgressLocation.Window,
        title: `${msg}`,
        cancellable: true,
    }, async (progress, token) => {
        const cancelObject = { proc: undefined, cancelled: false };
        let increment = undefined;
        let percentage = undefined;
        const interval = setInterval(async () => {
            // Kill the process if the user cancels
            if (token.isCancellationRequested || tip.cancelRequested) {
                tip.cancelRequested = false;
                (0, logging_1.writeWN)(`Stopped "${tip.title}"`);
                if (tip.features.includes(tip_1.TipFeature.welcome)) {
                    vscode_1.commands.executeCommand(command_name_1.CommandName.HideDevServer);
                }
                if (tip.title.toLowerCase() == capacitor_platform_1.CapacitorPlatform.ios) {
                    wn_tree_provider_1.exState.selectedIOSDeviceName = '';
                }
                if (tip.title.toLowerCase() == capacitor_platform_1.CapacitorPlatform.android) {
                    wn_tree_provider_1.exState.selectedAndroidDeviceName = '';
                }
                //channelShow();
                clearInterval(interval);
                (0, tasks_1.finishCommand)(tip);
                cancelObject.cancelled = true;
                console.log(`Killing process ${cancelObject.proc.pid}`);
                await (0, process_list_1.kill)(cancelObject.proc, rootPath);
                if (ionicProvider) {
                    ionicProvider.refresh();
                }
            }
            else {
                if (increment && !hasRunPoints) {
                    percentage += increment;
                    const msg = percentage > 100 ? ' ' : `${parseInt(percentage)}%`;
                    progress.report({ message: msg, increment: increment });
                }
            }
        }, 1000);
        const commandList = Array.isArray(command) ? command : [command];
        let clear = true;
        for (const cmd of commandList) {
            if (cmd instanceof Function) {
                await cmd();
            }
            else {
                (0, tasks_1.startCommand)(tip, cmd, clear);
                clear = false;
                const secondsTotal = (0, utilities_1.estimateRunTime)(cmd);
                if (secondsTotal) {
                    increment = 100.0 / secondsTotal;
                    percentage = 0;
                }
                try {
                    let retry = true;
                    while (retry) {
                        try {
                            retry = await (0, utilities_1.run)(rootPath, cmd, cancelObject, tip.features, tip.runPoints, progress, ionicProvider, undefined, undefined, tip.data);
                        }
                        catch (err) {
                            retry = false;
                            failed = true;
                            (0, logging_1.writeError)(err);
                        }
                    }
                }
                finally {
                    if (cancelObject === null || cancelObject === void 0 ? void 0 : cancelObject.cancelled) {
                        cancelled = true;
                    }
                    (0, tasks_1.finishCommand)(tip);
                }
            }
        }
        return true;
    });
    if (ionicProvider) {
        ionicProvider.refresh();
    }
    if (successMessage) {
        (0, logging_1.write)(successMessage);
    }
    if (tip.title) {
        if (failed && !cancelled) {
            (0, logging_1.writeError)(`${tip.title} Failed.`);
            (0, logging_1.showOutput)();
        }
        else {
            (0, logging_1.writeWN)(`${tip.title} Completed.`);
        }
        (0, logging_1.write)('');
    }
    if (tip.syncOnSuccess) {
        if (!wn_tree_provider_1.exState.syncDone.includes(tip.syncOnSuccess)) {
            wn_tree_provider_1.exState.syncDone.push(tip.syncOnSuccess);
        }
    }
}
async function fix(tip, rootPath, ionicProvider, context) {
    if (await (0, tasks_1.waitForOtherActions)(tip)) {
        return; // Canceled
    }
    await tip.generateCommand();
    tip.generateTitle();
    if (tip.command) {
        const urlBtn = tip.url ? 'Info' : undefined;
        const msg = tip.message ? `: ${tip.message}` : '';
        const info = tip.description ? tip.description : `${tip.title}${msg}`;
        const ignoreTitle = tip.ignorable ? 'Ignore' : undefined;
        const selection = await vscode_1.window.showInformationMessage(info, tip.secondTitle, tip.commandTitle, urlBtn, ignoreTitle);
        if (selection && selection == tip.commandTitle) {
            fixIssue(tip.command, rootPath, ionicProvider, tip, tip.commandSuccess);
        }
        if (selection && selection == tip.secondTitle) {
            fixIssue(tip.secondCommand, rootPath, ionicProvider, tip, undefined, tip.secondTitle);
        }
        if (selection && selection == urlBtn) {
            (0, utilities_1.openUri)(tip.url);
        }
        if (selection && selection == ignoreTitle) {
            (0, ignore_1.ignore)(tip, context);
            if (ionicProvider) {
                ionicProvider.refresh();
            }
        }
    }
    else {
        await execute(tip, context);
        if (ionicProvider) {
            ionicProvider.refresh();
        }
    }
}
async function execute(tip, context) {
    const result = (await tip.executeAction());
    if (result == command_name_1.ActionResult.Ignore) {
        (0, ignore_1.ignore)(tip, context);
    }
    if (tip.url) {
        await (0, utilities_1.openUri)(tip.url);
    }
}
async function runAction(tip, ionicProvider, rootPath, srcCommand) {
    if (await (0, tasks_1.waitForOtherActions)(tip)) {
        return; // Canceled
    }
    if (tip.stoppable || tip.contextValue == context_variables_1.Context.stop) {
        if ((0, tasks_1.isRunning)(tip)) {
            (0, tasks_1.cancelIfRunning)(tip);
            (0, tasks_1.markActionAsCancelled)(tip);
            ionicProvider.refresh();
            return;
        }
        (0, tasks_1.markActionAsRunning)(tip);
        ionicProvider.refresh();
    }
    await tip.generateCommand();
    tip.generateTitle();
    if (tip.command) {
        let command = tip.command;
        let host = '';
        if (tip.doIpSelection) {
            host = await (0, run_web_1.selectExternalIPAddress)();
            if (host) {
                // Ionic cli uses --public-host but capacitor cli uses --host
                host = ` --host=${host}`;
            }
            else {
                host = '';
            }
        }
        command = tip.command.replace(command_name_1.InternalCommand.publicHost, host);
        if (tip.doDeviceSelection) {
            const target = await (0, capacitor_device_1.selectDevice)(tip.secondCommand, tip.data, tip, srcCommand);
            if (!target) {
                (0, tasks_1.markActionAsCancelled)(tip);
                ionicProvider.refresh();
                return;
            }
            command = command.replace(command_name_1.InternalCommand.target, target);
        }
        if (command) {
            execute(tip, wn_tree_provider_1.exState.context);
            fixIssue(command, rootPath, ionicProvider, tip);
            return;
        }
    }
    else {
        await execute(tip, wn_tree_provider_1.exState.context);
        if (tip.refresh) {
            ionicProvider.refresh();
        }
    }
}
async function runAgain(ionicProvider, rootPath) {
    let runInfo = wn_tree_provider_1.exState.runWeb;
    switch (wn_tree_provider_1.exState.lastRun) {
        case capacitor_platform_1.CapacitorPlatform.android:
            runInfo = wn_tree_provider_1.exState.runAndroid;
            break;
        case capacitor_platform_1.CapacitorPlatform.ios:
            runInfo = wn_tree_provider_1.exState.runIOS;
            break;
    }
    if (runInfo) {
        runAction(runInfo, ionicProvider, rootPath);
    }
}
async function findAndRun(ionicProvider, rootPath, commandTitle) {
    const list = await ionicProvider.getChildren();
    const r = findRecursive(commandTitle, list);
    if (r) {
        runAction(r.tip, ionicProvider, rootPath);
    }
    else {
        vscode_1.window.showInformationMessage(`The action "${commandTitle}" is not available.`);
    }
}
function findRecursive(label, items) {
    for (const item of items) {
        if (item.children && item.children.length > 0) {
            const found = findRecursive(label, item.children);
            if (found) {
                return found;
            }
        }
        if (item.label == label || item.id == label) {
            return item;
        }
    }
    return undefined;
}
//# sourceMappingURL=fix-issue.js.map