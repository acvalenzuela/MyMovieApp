"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TipType = exports.Command = exports.Tip = exports.RunStatus = exports.TipFeature = void 0;
const context_variables_1 = require("./context-variables");
const tasks_1 = require("./tasks");
var TipFeature;
(function (TipFeature) {
    TipFeature[TipFeature["debugOnWeb"] = 0] = "debugOnWeb";
    TipFeature[TipFeature["welcome"] = 1] = "welcome";
})(TipFeature || (exports.TipFeature = TipFeature = {}));
var RunStatus;
(function (RunStatus) {
    RunStatus[RunStatus["Running"] = 0] = "Running";
    RunStatus[RunStatus["Idle"] = 1] = "Idle";
})(RunStatus || (exports.RunStatus = RunStatus = {}));
class Tip {
    constructor(title, message, type, description, command, commandTitle, commandSuccess, url, commandProgress) {
        this.title = title;
        this.message = message;
        this.type = type;
        this.description = description;
        this.command = command;
        this.commandTitle = commandTitle;
        this.commandSuccess = commandSuccess;
        this.url = url;
        this.commandProgress = commandProgress;
        this.features = [];
    }
    showProgressDialog() {
        this.progressDialog = true;
        return this;
    }
    performRun() {
        this.doRun = true;
        return this;
    }
    requestDeviceSelection() {
        this.doDeviceSelection = true;
        return this;
    }
    requestIPSelection() {
        this.doIpSelection = true;
        return this;
    }
    setFeatures(features) {
        for (const feature of features) {
            this.features.push(feature);
        }
        return this;
    }
    hasFeature(feature) {
        return this.features.includes(feature);
    }
    canAnimate() {
        this.animates = true;
        return this;
    }
    setTooltip(tooltip) {
        this.tooltip = tooltip;
        return this;
    }
    canStop() {
        if ((0, tasks_1.isRunning)(this)) {
            this.setContextValue(context_variables_1.Context.stop);
        }
        else {
            this.stoppable = true;
        }
        return this;
    }
    // Tasks that do not block will allow other tasks to run immediately instead of being queued.
    willNotBlock() {
        this.nonBlocking = true;
        return this;
    }
    isNonBlocking() {
        return this.nonBlocking;
    }
    contextIf(value, running) {
        if (running && (0, tasks_1.isRunning)(this)) {
            this.setContextValue(value);
        }
        else if (!running && !(0, tasks_1.isRunning)(this)) {
            this.setContextValue(value);
        }
        return this;
    }
    canIgnore() {
        this.ignorable = true;
        return this;
    }
    canRefreshAfter() {
        this.refresh = true;
        return this;
    }
    // This task will not wait for other tasks to complete
    doNotWait() {
        this.dontWait = true;
        return this;
    }
    // Return whether this task will not wait for other tasks to complete
    willNotWait() {
        return this.dontWait;
    }
    setSyncOnSuccess(platform) {
        this.syncOnSuccess = platform;
        return this;
    }
    // The action is executed when the user clicks the item in the treeview
    setAction(func, ...args) {
        this.onAction = func;
        this.actionArgs = args;
        return this;
    }
    applyRunStatus(status) {
        if (this.onRunStatus) {
            this.onRunStatus(status);
        }
    }
    setRunStatus(func) {
        this.onRunStatus = func;
        return this;
    }
    // The action is executed when the user clicks the item in the treeview
    setQueuedAction(func, ...args) {
        this.onQueuedAction = func;
        this.actionArgs = args;
        return this;
    }
    // The action is executed when the user clicks the button called title
    setAfterClickAction(title, func, ...args) {
        this.commandTitle = title;
        this.command = Command.NoOp;
        this.onAction = func;
        this.actionArgs = args;
        return this;
    }
    setContextValue(contextValue) {
        if (this.contextValue == context_variables_1.Context.stop) {
            return this;
        }
        this.contextValue = contextValue;
        return this;
    }
    setVSCommand(commandName) {
        this.vsCommand = commandName;
        return this;
    }
    addActionArg(arg) {
        this.actionArgs.push(arg);
    }
    actionArg(index) {
        return this.actionArgs[index];
    }
    setData(data) {
        this.data = data;
        return this;
    }
    setRelatedDependency(name) {
        this.relatedDependency = name;
        return this;
    }
    setDynamicCommand(func, ...args) {
        this.onCommand = func;
        this.actionArgs = args;
        return this;
    }
    setDynamicTitle(func, ...args) {
        this.onTitle = func;
        this.titleArgs = args;
        return this;
    }
    setSecondCommand(title, command) {
        this.secondCommand = command;
        this.secondTitle = title;
        return this;
    }
    setRunPoints(runPoints) {
        this.runPoints = runPoints;
        return this;
    }
    async executeAction() {
        if (this.onAction) {
            if (await (0, tasks_1.waitForOtherActions)(this)) {
                return;
            }
            try {
                (0, tasks_1.markActionAsRunning)(this);
                return await this.onAction(...this.actionArgs);
            }
            finally {
                (0, tasks_1.finishCommand)(this);
            }
            return;
        }
        // This only marks an action as queued when it starts
        if (this.onQueuedAction) {
            if (await (0, tasks_1.waitForOtherActions)(this)) {
                return;
            }
            try {
                return await this.onQueuedAction(() => {
                    (0, tasks_1.markActionAsRunning)(this);
                }, ...this.actionArgs);
            }
            finally {
                (0, tasks_1.finishCommand)(this);
            }
        }
    }
    async generateCommand() {
        if (this.onCommand) {
            this.command = await this.onCommand(...this.actionArgs);
        }
    }
    async generateTitle() {
        if (this.onTitle) {
            this.title = this.onTitle(...this.titleArgs);
        }
    }
}
exports.Tip = Tip;
var Command;
(function (Command) {
    Command["NoOp"] = " ";
})(Command || (exports.Command = Command = {}));
var TipType;
(function (TipType) {
    TipType[TipType["Build"] = 0] = "Build";
    TipType[TipType["Error"] = 1] = "Error";
    TipType[TipType["Edit"] = 2] = "Edit";
    TipType[TipType["Warning"] = 3] = "Warning";
    TipType[TipType["Idea"] = 4] = "Idea";
    TipType[TipType["Capacitor"] = 5] = "Capacitor";
    TipType[TipType["Capacitor2"] = 6] = "Capacitor2";
    TipType[TipType["Cordova"] = 7] = "Cordova";
    TipType[TipType["Check"] = 8] = "Check";
    TipType[TipType["CheckMark"] = 9] = "CheckMark";
    TipType[TipType["Box"] = 10] = "Box";
    TipType[TipType["Experiment"] = 11] = "Experiment";
    TipType[TipType["Ionic"] = 12] = "Ionic";
    TipType[TipType["WebNative"] = 13] = "WebNative";
    TipType[TipType["Run"] = 14] = "Run";
    TipType[TipType["Link"] = 15] = "Link";
    TipType[TipType["Android"] = 16] = "Android";
    TipType[TipType["Vue"] = 17] = "Vue";
    TipType[TipType["Angular"] = 18] = "Angular";
    TipType[TipType["React"] = 19] = "React";
    TipType[TipType["Comment"] = 20] = "Comment";
    TipType[TipType["Settings"] = 21] = "Settings";
    TipType[TipType["Files"] = 22] = "Files";
    TipType[TipType["Builder"] = 23] = "Builder";
    TipType[TipType["Sync"] = 24] = "Sync";
    TipType[TipType["Add"] = 25] = "Add";
    TipType[TipType["Dependency"] = 26] = "Dependency";
    TipType[TipType["Media"] = 27] = "Media";
    TipType[TipType["Debug"] = 28] = "Debug";
    TipType[TipType["Apple"] = 29] = "Apple";
    TipType[TipType["None"] = 30] = "None";
})(TipType || (exports.TipType = TipType = {}));
//# sourceMappingURL=tip.js.map