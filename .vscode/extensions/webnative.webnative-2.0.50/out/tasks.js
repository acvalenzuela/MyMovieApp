"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLastOperation = getLastOperation;
exports.isRunning = isRunning;
exports.cancelLastOperation = cancelLastOperation;
exports.cancelIfRunning = cancelIfRunning;
exports.finishCommand = finishCommand;
exports.startCommand = startCommand;
exports.markActionAsRunning = markActionAsRunning;
exports.markOperationAsRunning = markOperationAsRunning;
exports.waitForOtherActions = waitForOtherActions;
exports.markActionAsCancelled = markActionAsCancelled;
const vscode_1 = require("vscode");
const command_name_1 = require("./command-name");
const context_variables_1 = require("./context-variables");
const wn_tree_provider_1 = require("./wn-tree-provider");
const logging_1 = require("./logging");
const tip_1 = require("./tip");
const utilities_1 = require("./utilities");
let runningOperations = [];
let runningActions = [];
let lastOperation;
function getLastOperation() {
    return lastOperation;
}
function isRunning(tip) {
    const found = runningOperations.find((found) => {
        return same(found, { tip, workspace: wn_tree_provider_1.exState.workspace });
    });
    if (found == undefined) {
        const foundAction = runningActions.find((found) => {
            return same(found, { tip, workspace: wn_tree_provider_1.exState.workspace });
        });
        return foundAction != undefined;
    }
    return found != undefined;
}
function same(a, b) {
    return a.tip.title == b.tip.title && a.workspace == b.workspace;
}
async function cancelLastOperation() {
    if (!lastOperation)
        return;
    if (!isRunning(lastOperation))
        return;
    await cancelRunning(lastOperation);
}
function cancelRunning(tip) {
    const found = runningOperations.find((found) => {
        return same(found, { tip, workspace: wn_tree_provider_1.exState.workspace });
    });
    if (found) {
        found.tip.cancelRequested = true;
        console.log('Found task to cancel...');
        if (tip.description == 'Serve') {
            (0, utilities_1.stopPublishing)();
        }
        tip.applyRunStatus(tip_1.RunStatus.Idle);
    }
    return new Promise((resolve) => setTimeout(resolve, 1000));
}
// If the task is already running then cancel it
async function cancelIfRunning(tip) {
    if (isRunning(tip)) {
        await cancelRunning(tip);
        if (tip.data == context_variables_1.Context.stop) {
            (0, utilities_1.channelShow)();
            return true; // User clicked stop
        }
    }
    return false;
}
function finishCommand(tip) {
    runningOperations = runningOperations.filter((op) => {
        return !same(op, { tip, workspace: wn_tree_provider_1.exState.workspace });
    });
    runningActions = runningActions.filter((op) => {
        return !same(op, { tip, workspace: wn_tree_provider_1.exState.workspace });
    });
    tip.applyRunStatus(tip_1.RunStatus.Idle);
}
function startCommand(tip, cmd, clear) {
    if (tip.title) {
        const message = tip.commandTitle ? tip.commandTitle : tip.title;
        if (clear !== false) {
            (0, logging_1.clearOutput)();
        }
        (0, logging_1.writeWN)(`${message}...`);
        let command = cmd;
        if (command === null || command === void 0 ? void 0 : command.includes(command_name_1.InternalCommand.cwd)) {
            command = command.replace(command_name_1.InternalCommand.cwd, '');
            if (wn_tree_provider_1.exState.workspace) {
                (0, logging_1.write)(`> Workspace: ${wn_tree_provider_1.exState.workspace}`);
            }
        }
        tip.applyRunStatus(tip_1.RunStatus.Running);
        (0, logging_1.write)(`> ${(0, utilities_1.replaceAll)(command, command_name_1.InternalCommand.cwd, '')}`);
        (0, utilities_1.channelShow)();
    }
}
function markActionAsRunning(tip) {
    runningActions.push({ tip, workspace: wn_tree_provider_1.exState.workspace });
}
function markOperationAsRunning(tip) {
    var _a;
    runningOperations.push({ tip, workspace: wn_tree_provider_1.exState.workspace });
    lastOperation = tip;
    if (tip.type == tip_1.TipType.Run && ((_a = tip.tooltip) === null || _a === void 0 ? void 0 : _a.startsWith(`Runs '`))) {
        (0, logging_1.showOutput)();
    }
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function runningInThisWorkSpace() {
    let count = 0;
    for (const action of runningActions) {
        if (action.workspace == wn_tree_provider_1.exState.workspace) {
            count++;
        }
    }
    return count;
}
function queueEmpty() {
    if (runningInThisWorkSpace() == 0)
        return true;
    if (runningInThisWorkSpace() == 1 && runningActions[0].tip.isNonBlocking())
        return true;
    return false;
}
async function waitForOtherActions(tip) {
    let cancelled = false;
    if (queueEmpty())
        return false;
    if (tip.willNotWait())
        return false;
    await vscode_1.window.withProgress({
        location: vscode_1.ProgressLocation.Notification,
        title: `Task Queued: ${tip.title}`,
        cancellable: true,
    }, async (progress, token) => {
        while (!queueEmpty() && !cancelled) {
            await delay(500);
            if (token.isCancellationRequested) {
                cancelled = true;
            }
        }
    });
    return cancelled;
}
function markActionAsCancelled(tip) {
    runningActions = runningActions.filter((op) => {
        return !same(op, { tip, workspace: wn_tree_provider_1.exState.workspace });
    });
}
//# sourceMappingURL=tasks.js.map