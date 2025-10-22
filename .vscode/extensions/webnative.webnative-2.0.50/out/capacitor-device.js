"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectDevice = selectDevice;
const vscode_1 = require("vscode");
const command_name_1 = require("./command-name");
const error_handler_1 = require("./error-handler");
const wn_tree_provider_1 = require("./wn-tree-provider");
const utilities_1 = require("./utilities");
const workspace_state_1 = require("./workspace-state");
/**
 * Uses vscodes Quick pick dialog to allow selection of a device and
 * returns the command used to run on the selected device
 * @param  {string} command
 * @param  {string} rootPath
 * @param {CommandName} srcCommand The command that triggered this (eg the ... button)
 */
async function selectDevice(command, rootPath, tip, srcCommand) {
    const isAndroid = command.includes('android');
    const preselected = isAndroid ? wn_tree_provider_1.exState.selectedAndroidDevice : wn_tree_provider_1.exState.selectedIOSDevice;
    if (preselected) {
        return preselected;
    }
    let devices;
    await showProgress('Getting Devices...', async () => {
        devices = await getDevices(command, rootPath);
    });
    const realDevices = devices.filter((device) => !device.name.includes('(simulator)') && !device.name.includes('(emulator)'));
    const names = devices.map((device) => {
        device.title = formatDeviceName(device.name);
        return device.title;
    });
    if (names.length == 0) {
        return;
    }
    let userChosen = false;
    let selected = undefined;
    if ((realDevices === null || realDevices === void 0 ? void 0 : realDevices.length) == 1 && srcCommand != command_name_1.CommandName.SelectDevice) {
        // Auto select the device if it is not an emulator and the user did not choose the ... for device selection
        selected = realDevices[0].title;
    }
    else {
        selected = await vscode_1.window.showQuickPick(names, { placeHolder: 'Select a device to run application on' });
        userChosen = true;
    }
    const device = devices.find((device) => device.title == selected);
    if (!device)
        return;
    tip.commandTitle = device === null || device === void 0 ? void 0 : device.name;
    if (userChosen) {
        if (command.includes('android')) {
            wn_tree_provider_1.exState.selectedAndroidDevice = device === null || device === void 0 ? void 0 : device.target;
            wn_tree_provider_1.exState.selectedAndroidDeviceName = device === null || device === void 0 ? void 0 : device.name;
        }
        else {
            wn_tree_provider_1.exState.selectedIOSDevice = device === null || device === void 0 ? void 0 : device.target;
            wn_tree_provider_1.exState.selectedIOSDeviceName = device === null || device === void 0 ? void 0 : device.name;
        }
    }
    else {
        if ((0, workspace_state_1.getSetting)(workspace_state_1.WorkspaceSetting.liveReload)) {
            if (command.includes('android')) {
                wn_tree_provider_1.exState.selectedAndroidDeviceName = `(running)`;
            }
            else {
                wn_tree_provider_1.exState.selectedIOSDeviceName = `(running)`;
            }
        }
    }
    return device === null || device === void 0 ? void 0 : device.target;
}
function formatDeviceName(name) {
    const nice = name.replace('(simulator)', '').replace('(emulator)', '');
    if (nice.length != name.length) {
        return `$(device-mobile) ${nice}`;
    }
    else {
        return `$(ports-view-icon) ${nice}`;
    }
}
function friendlyName(name) {
    function fix(api, v) {
        if (name.includes(`API ${api}`)) {
            name = (0, utilities_1.replaceAll)(name, `API ${api}`, '').trim() + ` (Android ${v})`;
        }
    }
    fix('33', '13');
    fix('32', '12');
    fix('31', '12');
    fix('30', '11');
    fix('29', '10');
    fix('28', '9');
    fix('27', '8');
    fix('26', '8');
    fix('25', '7');
    fix('24', '7');
    fix('23', '6');
    fix('22', '5');
    fix('21', '5');
    name = name.replace(' (emulator)', 'Emulator');
    return name;
}
/**
 * Runs the command and obtains the stdout, parses it for the list of device names and target ids
 * @param  {string} command Node command which gathers device list
 * @param  {string} rootPath Path where the node command runs
 */
async function getDevices(command, rootPath) {
    try {
        const result = await (0, utilities_1.getRunOutput)(command, rootPath);
        const lines = result.split('\n');
        lines.shift(); // Remove the header
        const devices = [];
        for (const line of lines) {
            const data = line.split('|');
            if (data.length == 3) {
                const target = data[2].trim();
                if (target != '?') {
                    devices.push({ name: friendlyName(data[0].trim() + ' ' + data[1].trim()), target: target });
                }
            }
            else {
                const device = parseDevice(line);
                if (device) {
                    devices.push(device);
                }
            }
        }
        if (devices.length == 0) {
            vscode_1.window.showErrorMessage(`Unable to find any devices: ${result}`, 'OK');
        }
        return devices;
    }
    catch (error) {
        (0, error_handler_1.handleError)(error, [], rootPath);
    }
}
function parseDevice(line) {
    try {
        const name = line.substring(0, line.indexOf('  ')).trim();
        line = line.substring(line.indexOf('  ')).trim();
        const args = line.replace('  ', '|').split('|');
        const target = args[1].trim();
        if (target == '?') {
            return undefined;
        }
        return { name: name + ' ' + replaceSDKLevel(args[0].trim()), target };
    }
    catch {
        return undefined;
    }
}
function replaceSDKLevel(sdk) {
    switch (sdk) {
        case 'API 34':
            return 'Android 14';
        case 'API 33':
            return 'Android 13';
        case 'API 32':
        case 'API 31':
            return 'Android 12';
        case 'API 30':
            return 'Android 11';
        case 'API 29':
            return 'Android 10';
        case 'API 28':
            return 'Android 9';
        case 'API 27':
            return 'Android 8.1';
        case 'API 26':
            return 'Android 8.0';
        default:
            return sdk;
    }
}
async function showProgress(message, func) {
    await vscode_1.window.withProgress({
        location: vscode_1.ProgressLocation.Window,
        title: `${message}`,
        cancellable: true,
    }, async (progress, token) => {
        await func();
    });
}
//# sourceMappingURL=capacitor-device.js.map