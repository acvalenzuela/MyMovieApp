"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AndroidDebugProvider = void 0;
const vscode_1 = require("vscode");
const android_debug_bridge_1 = require("./android-debug-bridge");
class AndroidDebugProvider {
    async resolveDebugConfiguration(folder, debugConfiguration, token) {
        if (!debugConfiguration.type || !debugConfiguration.request || debugConfiguration.request !== 'attach') {
            return null;
        }
        debugConfiguration.type = 'pwa-chrome';
        await (0, android_debug_bridge_1.verifyAndroidDebugBridge)();
        return await vscode_1.window.withProgress({
            location: vscode_1.ProgressLocation.Window,
        }, async (progress) => {
            var _a, _b;
            let device;
            let webView;
            progress.report({ message: 'Connecting' });
            // Find the connected devices
            const devices = await (0, android_debug_bridge_1.findDevices)();
            if (devices.length < 1) {
                vscode_1.window.showErrorMessage(`No devices found`);
                return undefined;
            }
            if (debugConfiguration.packageName) {
                const webViews = await withTimeoutRetries((_a = debugConfiguration.connectTimeout) !== null && _a !== void 0 ? _a : 0, 500, async () => {
                    // Find all devices that have the application running
                    const promises = devices.map(async (dev) => {
                        const webViews = await (0, android_debug_bridge_1.findWebViews)(dev).catch((err) => {
                            vscode_1.window.showWarningMessage(err.message);
                            return [];
                        });
                        return webViews.find((el) => el.packageName === debugConfiguration.packageName);
                    });
                    const result = await Promise.all(promises);
                    const filtered = result.filter((el) => (el ? true : false));
                    if (filtered.length < 1) {
                        return undefined;
                    }
                    return filtered;
                });
                if (!webViews || webViews.length < 1) {
                    vscode_1.window.showErrorMessage(`Webview is not running on a device`);
                    return undefined;
                }
                if (webViews.length === 1) {
                    device = webViews[0].device;
                    webView = webViews[0];
                }
                else {
                    return undefined;
                }
            }
            else {
                return undefined;
            }
            if (!webView) {
                const webViews = await withTimeoutRetries((_b = debugConfiguration.connectTimeout) !== null && _b !== void 0 ? _b : 1000, 1000, async () => {
                    // Find the running applications
                    const webViews = await (0, android_debug_bridge_1.findWebViews)(device);
                    if (webViews.length < 1) {
                        return undefined;
                    }
                    if (debugConfiguration.packageName) {
                        // Try to find the configured application
                        const filtered = webViews.filter((el) => el.packageName === debugConfiguration.packageName);
                        if (filtered.length < 1) {
                            return undefined;
                        }
                        return filtered;
                    }
                    else {
                        return webViews;
                    }
                });
                if (!webViews || webViews.length < 1) {
                    vscode_1.window.showErrorMessage(`WebView not found`);
                    return undefined;
                }
                return undefined;
            }
            // Forward to the local port
            debugConfiguration.port = await (0, android_debug_bridge_1.forwardDebugger)(webView, debugConfiguration.port);
            debugConfiguration.browserAttachLocation = 'workspace';
            return debugConfiguration;
        });
    }
}
exports.AndroidDebugProvider = AndroidDebugProvider;
function withTimeoutRetries(timeout, interval, func) {
    const startTime = new Date().valueOf();
    const run = async () => {
        const result = await func();
        if (result || startTime + timeout <= new Date().valueOf()) {
            return result;
        }
        await new Promise((resolve) => setTimeout(resolve, interval));
        return run();
    };
    return run();
}
//# sourceMappingURL=android-debug-provider.js.map