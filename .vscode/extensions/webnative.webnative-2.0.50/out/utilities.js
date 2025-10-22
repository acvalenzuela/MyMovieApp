"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateRunTime = estimateRunTime;
exports.confirm = confirm;
exports.isWindows = isWindows;
exports.isMac = isMac;
exports.stopPublishing = stopPublishing;
exports.passesRemoteFilter = passesRemoteFilter;
exports.passesFilter = passesFilter;
exports.run = run;
exports.delay = delay;
exports.replaceAll = replaceAll;
exports.openUri = openUri;
exports.debugSkipFiles = debugSkipFiles;
exports.stripJSON = stripJSON;
exports.getSpawnOutput = getSpawnOutput;
exports.getRunOutput = getRunOutput;
exports.getExecOutput = getExecOutput;
exports.channelShow = channelShow;
exports.runWithProgress = runWithProgress;
exports.getPackageJSON = getPackageJSON;
exports.alt = alt;
exports.generateUUID = generateUUID;
exports.asAppId = asAppId;
exports.extractBetween = extractBetween;
exports.plural = plural;
exports.doDoes = doDoes;
exports.pluralize = pluralize;
exports.showMessage = showMessage;
exports.toTitleCase = toTitleCase;
exports.showProgress = showProgress;
exports.httpRequest = httpRequest;
exports.toPascalCase = toPascalCase;
exports.tStart = tStart;
exports.tEnd = tEnd;
const tip_1 = require("./tip");
const preview_1 = require("./preview");
const error_handler_1 = require("./error-handler");
const wn_tree_provider_1 = require("./wn-tree-provider");
const monorepo_1 = require("./monorepo");
const command_name_1 = require("./command-name");
const analyzer_1 = require("./analyzer");
const ionic_init_1 = require("./ionic-init");
const https_1 = require("https");
const workspace_state_1 = require("./workspace-state");
const logging_1 = require("./logging");
const web_configuration_1 = require("./web-configuration");
const discovery_1 = require("./discovery");
const path_1 = require("path");
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const log_server_1 = require("./log-server");
const webview_debug_1 = require("./webview-debug");
const vscode_1 = require("vscode");
const uncolor_1 = require("./uncolor");
const process_1 = require("process");
const utils_strings_1 = require("./utils-strings");
const opTiming = {};
let pub;
// Any logged lines that start with these are filtered out
const filteredLines = [
    '▲ [WARNING] The glob pattern import("./**/*.entry.js*") ',
    '  :host-context([dir=rtl])',
    '  .ion-float-start:dir(rtl)',
    '▲ [WARNING] 20 rules skipped',
    '◑',
    '◒',
    '◐',
    '◓',
    '│',
    '◇  💡',
    '[info][capacitorcookies] Getting cookies at:',
    '[INFO] Waiting for connectivity with npm...', // Occurs during debugging
];
function estimateRunTime(command) {
    const idx = command.replace(command_name_1.InternalCommand.cwd, '');
    if (opTiming[idx]) {
        return opTiming[idx];
    }
    else {
        return undefined;
    }
}
async function confirm(message, confirmButton) {
    const selection = await vscode_1.window.showInformationMessage(message, confirmButton, 'Cancel');
    return selection == confirmButton;
}
function isWindows() {
    return process.platform === 'win32';
}
function isMac() {
    return process.platform === 'darwin';
}
function runOptions(command, folder, shell) {
    const env = { ...process.env };
    const javaHome = (0, workspace_state_1.getExtSetting)(workspace_state_1.ExtensionSetting.javaHome);
    // Cocoapods required lang set to en_US.UTF-8 (when capacitor sync or run ios is done)
    if (!env.LANG) {
        env.LANG = 'en_US.UTF-8';
    }
    if (javaHome) {
        env.JAVA_HOME = javaHome;
    }
    else if (!env.JAVA_HOME && !isWindows()) {
        const jHome = '/Applications/Android Studio.app/Contents/jre/Contents/Home';
        if ((0, fs_1.existsSync)(jHome)) {
            env.JAVA_HOME = jHome;
        }
    }
    if (!shell && wn_tree_provider_1.exState.shell) {
        shell = wn_tree_provider_1.exState.shell;
    }
    //  if (!shell && process.env.SHELL) {
    //    shell = process.env.SHELL;
    //  }
    return { cwd: folder, shell, encoding: 'utf8', env: env, maxBuffer: 10485760 };
}
function stopPublishing() {
    if (pub) {
        pub.stop();
    }
}
function passesRemoteFilter(msg, logFilters) {
    return passesFilter(msg, logFilters, true);
}
function passesFilter(msg, logFilters, isRemote) {
    for (const filteredLine of filteredLines) {
        if (msg.startsWith(filteredLine)) {
            return false;
        }
    }
    if (msg == '')
        return false;
    if (!logFilters)
        return true;
    for (const logFilter of logFilters) {
        if (logFilter == '' && !isRemote) {
            // If we're filtering out most logs then provide exception
            if (!msg.startsWith('[') || msg.startsWith('[info]') || msg.startsWith('[INFO]')) {
                if (new RegExp('Warn|warn|Error|error').test(msg)) {
                    // Its not info so allow
                }
                else {
                    return false;
                }
            }
        }
        else if (logFilter == 'console' && isRemote) {
            // Remote logging sends console statements as [info|warn|error]
            if (msg.startsWith('[info]') || msg.startsWith('[warn]') || msg.startsWith('[error]')) {
                return false;
            }
        }
        else {
            if (msg === null || msg === void 0 ? void 0 : msg.includes(logFilter)) {
                return false;
            }
        }
    }
    return true;
}
async function run(folder, command, cancelObject, features, runPoints, progress, ionicProvider, output, suppressInfo, auxData, continousProgress, preventErrorFocus) {
    if (command == command_name_1.InternalCommand.removeCordova) {
        return await removeCordovaFromPackageJSON(folder);
    }
    if (command == command_name_1.InternalCommand.ionicInit) {
        await (0, ionic_init_1.ionicInit)(folder);
        return false;
    }
    if (command.includes(command_name_1.InternalCommand.cwd)) {
        command = replaceAll(command, command_name_1.InternalCommand.cwd, '');
        // Change the work directory for monorepos as folder is the root folder
        folder = (0, monorepo_1.getMonoRepoFolder)(wn_tree_provider_1.exState.workspace, folder);
    }
    command = qualifyCommand(command, folder);
    let findLocalUrl = features.includes(tip_1.TipFeature.debugOnWeb) || features.includes(tip_1.TipFeature.welcome);
    let findExternalUrl = features.includes(tip_1.TipFeature.welcome);
    let localUrl;
    let externalUrl;
    let launched = false;
    async function launchUrl() {
        if (localUrl && externalUrl) {
            launched = true;
            launch(localUrl, externalUrl);
        }
        else if (!externalUrl) {
            await delay(500);
            if (!launched) {
                launched = true;
                launch(localUrl, externalUrl);
            }
        }
    }
    function launch(localUrl, externalUrl) {
        const config = (0, web_configuration_1.getWebConfiguration)();
        const url = externalUrl !== null && externalUrl !== void 0 ? externalUrl : localUrl;
        if (url) {
            if (pub) {
                pub.stop();
            }
            else {
                if (!auxData) {
                    console.error(`auxData not set for launch of ${localUrl} ${externalUrl}`);
                }
                pub = new discovery_1.Publisher('devapp', auxData !== null && auxData !== void 0 ? auxData : '', portFrom(url), url.startsWith('https'));
            }
            pub.start().then(() => {
                if (config == web_configuration_1.WebConfigSetting.nexus) {
                    (0, webview_debug_1.qrView)(externalUrl, localUrl);
                }
            });
        }
        // Make sure remote logger service is running
        (0, log_server_1.startStopLogServer)(undefined);
        if (features.includes(tip_1.TipFeature.debugOnWeb)) {
            (0, preview_1.debugBrowser)(localUrl, true);
            return;
        }
        switch (config) {
            case web_configuration_1.WebConfigSetting.editor:
                (0, preview_1.viewInEditor)(localUrl, externalUrl, true, !!wn_tree_provider_1.exState.webView);
                break;
            case web_configuration_1.WebConfigSetting.browser:
                //if (!externalUrl) {
                openUri(localUrl);
                //}
                break;
            case web_configuration_1.WebConfigSetting.nexus:
                break;
            default: {
                openUri(localUrl);
                break;
            }
        }
    }
    function portFrom(externalUrl) {
        const tmp = externalUrl.split(':');
        if (tmp.length < 3)
            return 8100;
        return parseInt(tmp[2]);
    }
    let answered = '';
    const logFilters = (0, workspace_state_1.getSetting)(workspace_state_1.WorkspaceSetting.logFilter);
    let logs = [];
    return new Promise((resolve, reject) => {
        const start_time = process.hrtime();
        const interval = setInterval(() => {
            if (cancelObject === null || cancelObject === void 0 ? void 0 : cancelObject.cancelled) {
                clearInterval(interval);
                reject(`${command} Cancelled`);
            }
        }, 500);
        const proc = (0, child_process_1.exec)(command, runOptions(command, folder), async (error, stdout, stdError) => {
            let retry = false;
            if (error) {
                console.error(error);
            }
            // Quirk of windows robocopy is that it logs errors/exit code on success
            if (!error || command.includes('robocopy')) {
                const end_time = process.hrtime(start_time);
                if (!(cancelObject === null || cancelObject === void 0 ? void 0 : cancelObject.cancelled)) {
                    opTiming[command] = end_time[0]; // Number of seconds
                }
                // Allows handling of linting and tests
                retry = await (0, error_handler_1.handleError)(undefined, logs, folder);
                clearInterval(interval);
                if (output) {
                    output.success = true;
                }
                resolve(retry);
            }
            else {
                if (!(cancelObject === null || cancelObject === void 0 ? void 0 : cancelObject.cancelled)) {
                    retry = await (0, error_handler_1.handleError)(stdError, logs, folder);
                }
                clearInterval(interval);
                if (retry) {
                    if (output) {
                        output.success = true;
                    }
                    resolve(retry);
                }
                else {
                    if (output) {
                        output.success = false;
                    }
                    reject(`${command} Failed`);
                }
            }
        });
        proc.stdout.on('data', (data) => {
            if (data) {
                if (output) {
                    output.output += data;
                }
                const logLines = data.split('\r\n');
                logs = logs.concat(logLines);
                if (findLocalUrl) {
                    if (data.includes('http')) {
                        const url = checkForUrls(data, [
                            'Local:',
                            'On Your Network:',
                            'open your browser on ',
                            '> Local:', // Nuxt
                            '➜  Local:', // AnalogJs
                            '➜ Local:', // Nuxt with Vite
                            '- Local:', // Vue
                            'Listening on ', // Tanstack start
                            '┃ Local', // Astro
                        ]);
                        if (url) {
                            findLocalUrl = false;
                            localUrl = url;
                            wn_tree_provider_1.exState.localUrl = localUrl;
                            wn_tree_provider_1.exState.openWebStatusBar.show();
                            wn_tree_provider_1.exState.openEditorStatusBar.show();
                            launchUrl();
                        }
                    }
                }
                if (continousProgress) {
                    progress.report({ message: (0, uncolor_1.uncolor)(data.toString()) });
                }
                if (findExternalUrl) {
                    if (data.includes('http')) {
                        const url = checkForUrls(data, [
                            'External:',
                            'On Your Network:',
                            '> Network:', // Nuxt
                            '➜  Network:', // AnalogJs
                            '- Network:', // Vue
                            'open your browser on ', // NX
                        ]);
                        if (url) {
                            findExternalUrl = false;
                            externalUrl = url;
                            wn_tree_provider_1.exState.externalUrl = externalUrl;
                            launchUrl();
                        }
                    }
                }
                // Based on found text logged change the progress message in the status bar
                if (runPoints) {
                    for (const runPoint of runPoints) {
                        if (data.includes(runPoint.text)) {
                            progress.report({ message: runPoint.title });
                            if (runPoint.action) {
                                if (answered !== '') {
                                    data = data.replace(answered, '');
                                }
                                if (data.includes(runPoint.text)) {
                                    runPoint.action(runPoint.text).then((keystrokes) => {
                                        proc.stdin.write(keystrokes);
                                        (0, logging_1.writeWN)(`Answered.`);
                                        answered = runPoint.text;
                                    });
                                }
                            }
                            if (runPoint.refresh && ionicProvider) {
                                ionicProvider.refresh();
                            }
                        }
                    }
                }
                for (const logLine of logLines) {
                    if (logLine.startsWith('[capacitor]')) {
                        if (!suppressInfo && passesFilter(logLine, logFilters, false)) {
                            (0, logging_1.write)(logLine.replace('[capacitor]', ''));
                        }
                    }
                    else if (logLine && !suppressInfo) {
                        const uncolored = (0, uncolor_1.uncolor)(logLine);
                        if (passesFilter(uncolored, logFilters, false)) {
                            if (uncolored.includes('\r')) {
                                (0, logging_1.write)(uncolored);
                            }
                            else {
                                (0, logging_1.writeAppend)(uncolored);
                            }
                        }
                    }
                }
                focusOutput();
            }
        });
        proc.stderr.on('data', (data) => {
            if (!suppressInfo) {
                const uncolored = (0, uncolor_1.uncolor)(data);
                if (passesFilter(uncolored, logFilters, false)) {
                    (0, logging_1.write)(uncolored);
                }
            }
            if (!preventErrorFocus) {
                wn_tree_provider_1.exState.channelFocus = true; // Allows the errors to show
                focusOutput();
                wn_tree_provider_1.exState.channelFocus = false; // Reset so that if user fixes the error they dont see the logs again
            }
        });
        if (cancelObject) {
            cancelObject.proc = proc;
        }
    });
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function checkForUrls(data, list) {
    const colorLess = stripColors(data);
    const lines = colorLess.split('\n');
    for (const line of lines) {
        for (const text of list) {
            const url = checkForUrl(line, text);
            if (url) {
                return url;
            }
        }
    }
}
function checkForUrl(data, text) {
    if (data.includes(text) && data.includes('http')) {
        let url = (0, utils_strings_1.getStringFrom)(data, text, '\n').trim();
        if (url && url.endsWith(' **')) {
            // This is for NX which logs urls like http://192.168.0.1:4200/ **
            url = url.substring(0, url.length - 3);
        }
        if (url && url.endsWith('/')) {
            url = url.slice(0, -1);
        }
        if (url && url.startsWith('http://[')) {
            return undefined; // IPV6 is not supported (nuxt/vite projects emit this)
        }
        return url;
    }
}
function stripColors(s) {
    // [36mhttp://localhost:[1m3002[22m/[39m
    return (0, utils_strings_1.replaceAllStringIn)(s, '[', 'm', '');
}
/**
 * This ensures that the focus is not pushed to the output window while you are editing a document
 */
function focusOutput() {
    if (wn_tree_provider_1.exState.outputIsFocused)
        return;
    channelShow();
}
function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replace);
}
// This will use the local @ionic/cli from the extension if one is not installed locally
function qualifyCommand(command, folder) {
    if (command.startsWith('npx ionic')) {
        if (!(0, analyzer_1.exists)('@ionic/cli')) {
            const cli = (0, path_1.join)(wn_tree_provider_1.exState.context.extensionPath, 'node_modules/@ionic/cli/bin');
            if ((0, fs_1.existsSync)(cli)) {
                command = command.replace('npx ionic', 'node "' + (0, path_1.join)(cli, 'ionic') + '"');
            }
        }
    }
    if (process.env.NVM_DIR) {
        if (!wn_tree_provider_1.exState.nvm) {
            const nvmrc = (0, path_1.join)(folder, '.nvmrc');
            if ((0, fs_1.existsSync)(nvmrc)) {
                const txt = (0, fs_1.readFileSync)(nvmrc, 'utf-8').replace('\n', '');
                wn_tree_provider_1.exState.nvm = `source ${process.env.NVM_DIR}/nvm.sh && nvm use > /dev/null`;
                (0, logging_1.writeWN)(`Detected nvm (${txt}) for this project.`);
            }
        }
        if (wn_tree_provider_1.exState.nvm) {
            return `${wn_tree_provider_1.exState.nvm} && ${command}`;
        }
    }
    return command;
}
async function openUri(uri) {
    const ob = (uri === null || uri === void 0 ? void 0 : uri.includes('//')) ? vscode_1.Uri.parse(uri) : vscode_1.Uri.file(uri);
    await vscode_1.commands.executeCommand('vscode.open', ob);
}
function debugSkipFiles() {
    try {
        let debugSkipFiles = vscode_1.workspace.getConfiguration(workspace_state_1.WorkspaceSection).get('debugSkipFiles');
        if (!debugSkipFiles) {
            return undefined;
        }
        if (debugSkipFiles.includes("'")) {
            debugSkipFiles = debugSkipFiles.replace(/'/g, '"');
        }
        const list = JSON.parse(debugSkipFiles);
        if (!Array.isArray(list)) {
            throw new Error('debugSkipFiles not a valid array');
        }
    }
    catch (error) {
        vscode_1.window.showErrorMessage(`Unable to parse debugSkipFiles variable. Ensure it is a valid JSON array. ${error}`);
        return undefined;
    }
}
function stripJSON(txt, startText) {
    // This removed output from nvm from json
    const idx = txt.indexOf(startText);
    if (idx != -1) {
        return txt.substring(idx);
    }
    return txt;
}
function getSpawnOutput(command, folder, shell, hideErrors, ignoreErrors) {
    const a = command.split(' ');
    const args = a.slice(1);
    return new Promise((resolve, reject) => {
        const childProcess = (0, child_process_1.spawn)(a[0], args, { cwd: folder });
        let output = '';
        let error = '';
        tStart(command);
        childProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        childProcess.stderr.on('data', (data) => {
            error += data.toString();
        });
        childProcess.on('close', (code) => {
            tEnd(command);
            if (code !== 0) {
                if (!hideErrors) {
                    (0, logging_1.writeError)(error);
                }
                if (ignoreErrors) {
                    resolve(output);
                }
                else {
                    reject(`${error}`);
                }
            }
            else {
                resolve(output);
            }
        });
    });
}
async function getRunOutput(command, folder, shell, hideErrors, ignoreErrors) {
    return getExecOutput(command, folder, shell, hideErrors, ignoreErrors);
    // Problems with spawn with some commands (eg windows, npx ng generate)
    //return getSpawnOutput(command, folder, shell, hideErrors, ignoreErrors);
}
async function getExecOutput(command, folder, shell, hideErrors, ignoreErrors) {
    return new Promise((resolve, reject) => {
        let out = '';
        if (command.includes(command_name_1.InternalCommand.cwd)) {
            command = replaceAll(command, command_name_1.InternalCommand.cwd, '');
            // Change the work directory for monorepos as folder is the root folder
            folder = (0, monorepo_1.getMonoRepoFolder)(wn_tree_provider_1.exState.workspace, folder);
        }
        command = qualifyCommand(command, folder);
        tStart(command);
        (0, child_process_1.exec)(command, runOptions(command, folder, shell), (error, stdout, stdError) => {
            if (stdout) {
                out += stdout;
            }
            if (!error) {
                if (out == '' && stdError) {
                    out += stdError;
                }
                tEnd(command);
                resolve(out);
            }
            else {
                if (stdError) {
                    if (!hideErrors) {
                        (0, logging_1.writeError)(stdError);
                    }
                    else {
                        console.error(stdError);
                    }
                    if (ignoreErrors) {
                        tEnd(command);
                        resolve(out);
                    }
                    else {
                        tEnd(command);
                        reject(stdError);
                    }
                }
                else {
                    // This is to fix a bug in npm outdated where it returns an exit code when it succeeds
                    tEnd(command);
                    resolve(out);
                }
            }
        });
    });
}
function channelShow() {
    if (wn_tree_provider_1.exState.channelFocus) {
        (0, logging_1.showOutput)();
        wn_tree_provider_1.exState.channelFocus = false;
    }
}
async function runWithProgress(command, title, folder, output) {
    let result = false;
    let done = false;
    await vscode_1.window.withProgress({
        location: vscode_1.ProgressLocation.Notification,
        title,
        cancellable: true,
    }, async (progress, token) => {
        const cancelObject = { proc: undefined, cancelled: false };
        run(folder, command, cancelObject, [], [], progress, undefined, output, false).then((success) => {
            (0, logging_1.writeWN)(`Command ${command} completed.`);
            done = true;
            result = success;
        });
        while (!cancelObject.cancelled && !done) {
            await delay(500);
            if (token.isCancellationRequested) {
                cancelObject.cancelled = true;
                (0, process_1.kill)(cancelObject.proc.pid);
            }
        }
    });
    return result;
}
function getPackageJSON(folder) {
    const filename = (0, monorepo_1.getPackageJSONFilename)(folder);
    if (!(0, fs_1.existsSync)(filename)) {
        return { name: undefined, displayName: undefined, description: undefined, version: undefined, scripts: {} };
    }
    return JSON.parse((0, fs_1.readFileSync)(filename, 'utf8'));
}
function alt(key) {
    return isWindows() ? `Alt+${key}` : `⌥+${key}`;
}
function generateUUID() {
    return new Date().getTime().toString(36) + Math.random().toString(36).slice(2);
}
/**
 * Given user input convert to a usable app identifier
 * @param  {string} name
 * @returns string
 */
function asAppId(name) {
    if (!name)
        return 'Unknown';
    name = name.split('-').join('.');
    name = name.split(' ').join('.');
    if (!name.includes('.')) {
        name = 'com.' + name; // Must have at least a . in the name
    }
    return name;
}
function extractBetween(A, B, C) {
    const indexB = A.indexOf(B);
    if (indexB === -1)
        return null; // B not found
    const indexC = A.indexOf(C, indexB + B.length);
    if (indexC === -1)
        return null; // C not found after B
    return A.substring(indexB + B.length, indexC);
}
function plural(name, count) {
    if (count <= 1) {
        if (name == 'are')
            return 'is';
    }
    if (name == 'Dependency') {
        return 'Dependencies';
    }
    else if (name == 'Plugin') {
        return 'Cordova Plugins';
    }
    return name + 's';
}
function doDoes(count) {
    return count > 1 ? 'does' : 'do';
}
function pluralize(name, count) {
    if (count) {
        return count <= 1 ? `${count} ${name}` : `${count} ${name}s`;
    }
}
async function showMessage(message, ms) {
    vscode_1.window.withProgress({
        location: vscode_1.ProgressLocation.Notification,
        title: message,
        cancellable: false,
    }, async () => {
        await timeout(ms); // Show the message for 3 seconds
    });
}
function toTitleCase(text) {
    return text
        .replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    })
        .trim();
}
async function showProgress(message, func) {
    return await vscode_1.window.withProgress({
        location: vscode_1.ProgressLocation.Notification,
        title: `${message}`,
        cancellable: false,
    }, async (progress, token) => {
        return await func();
    });
}
function httpRequest(method, host, path, postData) {
    const params = {
        host,
        port: 443,
        method,
        path,
    };
    return new Promise(function (resolve, reject) {
        const req = (0, https_1.request)(params, function (res) {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error('statusCode=' + res.statusCode));
            }
            let body = [];
            res.on('data', function (chunk) {
                body.push(chunk);
            });
            res.on('close', function () {
                try {
                    body = JSON.parse(Buffer.concat(body).toString());
                }
                catch (e) {
                    reject(e);
                }
                resolve(body);
            });
            res.on('end', function () {
                try {
                    body = JSON.parse(Buffer.concat(body).toString());
                }
                catch (e) {
                    reject(e);
                }
                resolve(body);
            });
        });
        req.setHeader('User-Agent', 'WebNative VS Code Extension (https://webnative.dev)');
        req.setHeader('Accept', '*/*');
        req.on('error', function (err) {
            reject(err);
        });
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}
function timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function removeCordovaFromPackageJSON(folder) {
    return new Promise((resolve, reject) => {
        try {
            const filename = (0, path_1.join)(folder, 'package.json');
            const packageFile = JSON.parse((0, fs_1.readFileSync)(filename, 'utf8'));
            packageFile.cordova = undefined;
            (0, fs_1.writeFileSync)(filename, JSON.stringify(packageFile, undefined, 2));
            // Also replace cordova in ionic.config.json
            const iFilename = (0, path_1.join)(folder, 'ionic.config.json');
            if ((0, fs_1.existsSync)(iFilename)) {
                const ionicConfig = JSON.parse((0, fs_1.readFileSync)(iFilename, 'utf8'));
                if (ionicConfig.integrations.cordova) {
                    delete ionicConfig.integrations.cordova;
                    ionicConfig.integrations.capacitor = new Object();
                }
                (0, fs_1.writeFileSync)(iFilename, JSON.stringify(ionicConfig, undefined, 2));
            }
            resolve(false);
        }
        catch (err) {
            reject(err);
        }
    });
}
function toPascalCase(text) {
    return text.replace(/(^\w|-\w)/g, clearAndUpper);
}
function clearAndUpper(text) {
    return text.replace(/-/, '').toUpperCase();
}
const times = {};
function tStart(name) {
    times[name] = process.hrtime();
}
function tEnd(name) {
    const endTime = process.hrtime(times[name]);
    const executionTime = (endTime[0] * 1e9 + endTime[1]) / 1e6; // Convert to milliseconds
    console.log(`${name} took ${Math.trunc(executionTime)} milliseconds to run.`);
}
//# sourceMappingURL=utilities.js.map