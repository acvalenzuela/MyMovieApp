"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearOutput = clearOutput;
exports.showOutput = showOutput;
exports.hideOutput = hideOutput;
exports.write = write;
exports.writeAppend = writeAppend;
exports.writeWN = writeWN;
exports.writeError = writeError;
exports.writeWarning = writeWarning;
const vscode_1 = require("vscode");
let channel = undefined;
function getOutputChannel() {
    if (!channel) {
        channel = vscode_1.window.createOutputChannel('WebNative');
        //channel.show();
    }
    return channel;
}
function clearOutput() {
    const channel = getOutputChannel();
    channel.clear();
    //showOutput();
    return channel;
}
function showOutput() {
    const channel = getOutputChannel();
    channel.show();
}
function hideOutput() {
    const channel = getOutputChannel();
    channel.hide();
}
function write(message) {
    getOutputChannel().appendLine(message);
}
function writeAppend(message) {
    getOutputChannel().append(message);
}
function writeWN(message) {
    const channel = getOutputChannel();
    channel.appendLine(`[wn] ${message}`);
}
function writeError(message) {
    const channel = getOutputChannel();
    channel.appendLine(`[error] ${message}`);
}
function writeWarning(message) {
    const channel = getOutputChannel();
    channel.appendLine(`[warning] ${message}`);
}
//# sourceMappingURL=logging.js.map