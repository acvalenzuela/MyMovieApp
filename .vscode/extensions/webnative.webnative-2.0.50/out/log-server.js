"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startStopLogServer = startStopLogServer;
const wn_tree_provider_1 = require("./wn-tree-provider");
const log_server_scripts_1 = require("./log-server-scripts");
const path_1 = require("path");
const fs_1 = require("fs");
const utilities_1 = require("./utilities");
const workspace_state_1 = require("./workspace-state");
const logging_1 = require("./logging");
const os_1 = require("os");
const http_1 = require("http");
let logServer;
async function startStopLogServer(folder) {
    if (logServer && !folder) {
        return; // We've already started the log server
    }
    if (logServer) {
        logServer.close();
        (0, log_server_scripts_1.removeScript)(folder);
        logServer = undefined;
        (0, logging_1.writeWN)(`Remote logging stopped.`);
        return true;
    }
    const port = 8942;
    const basePath = (0, path_1.join)(wn_tree_provider_1.exState.context.extensionPath, 'log-client');
    logServer = (0, http_1.createServer)((request, response) => {
        let body = '';
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Request-Method', '*');
        response.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
        response.setHeader('Access-Control-Allow-Headers', '*');
        if (request.method == 'OPTIONS') {
            response.writeHead(200);
            response.end();
            return;
        }
        if (request.method == 'POST') {
            request.on('data', (chunk) => {
                body += chunk.toString();
            });
            request.on('end', () => {
                if (request.url == '/log') {
                    writeLog(body);
                }
                else if (request.url == '/devices') {
                    writeDevices(body);
                }
                else {
                    (0, logging_1.writeWN)(body);
                }
                response.writeHead(200);
                response.end();
            });
            // logging
            //        response.writeHead(200);
            //        response.end();
            return;
        }
        const name = request.url.includes('?') ? request.url.split('?')[0] : request.url;
        const filePath = (0, path_1.join)(basePath, name);
        const contentType = getMimeType((0, path_1.extname)(filePath));
        (0, fs_1.readFile)(filePath, (error, content) => {
            if (error) {
                if (error.code == 'ENOENT') {
                    (0, fs_1.readFile)('./404.html', function (error, content) {
                        response.writeHead(200, { 'Content-Type': contentType });
                        response.end(content, 'utf-8');
                    });
                }
                else {
                    response.writeHead(500);
                    response.end('Oh bummer error: ' + error.code + ' ..\n');
                    response.end();
                }
            }
            else {
                response.writeHead(200, { 'Content-Type': contentType });
                response.end(content, 'utf-8');
            }
        });
    }).listen(port);
    const addressInfo = getAddress();
    (0, logging_1.writeWN)(`Remote logging service has started at http://${addressInfo}:${port}`);
    (0, log_server_scripts_1.removeScript)(folder);
    if (!(await (0, log_server_scripts_1.injectScript)(folder, addressInfo, port))) {
        (0, logging_1.writeError)(`Unable to start remote logging (index.html or equivalent cannot be found).`);
        (0, logging_1.showOutput)();
        return false;
    }
    return true;
}
function getAddress() {
    const nets = (0, os_1.networkInterfaces)();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
}
function getLogFilters() {
    return (0, workspace_state_1.getSetting)(workspace_state_1.WorkspaceSetting.logFilter);
}
function writeLog(body) {
    function write2(level, message, tag) {
        const msg = typeof message === 'object'
            ? `[${level}][${tag}] ${JSON.stringify(message)}`
            : `[${level}][${tag}] ${(0, utilities_1.replaceAll)(message, '\n', '')}`;
        if ((0, utilities_1.passesFilter)(msg, getLogFilters(), false)) {
            (0, logging_1.write)(msg);
        }
    }
    try {
        const lines = JSON.parse(body);
        if (!Array.isArray(lines)) {
            write2(lines.level, lines.message, lines.tag);
        }
        else {
            for (const line of lines) {
                write2(line.level, line.message, line.tag);
            }
        }
    }
    catch {
        (0, logging_1.write)(body);
    }
}
function writeDevices(body) {
    try {
        const device = JSON.parse(body);
        (0, logging_1.writeWN)(`${device.agent}`);
    }
    catch {
        (0, logging_1.write)(body);
    }
}
function getMimeType(ext) {
    switch (ext) {
        case '.js':
            return 'text/javascript';
        case '.css':
            return 'text/css';
        case '.json':
            return 'application/json';
        case '.png':
            return 'image/png';
        case '.jpg':
            return 'image/jpg';
        case '.wav':
            return 'audio/wav';
    }
    return 'text/html';
}
//# sourceMappingURL=log-server.js.map