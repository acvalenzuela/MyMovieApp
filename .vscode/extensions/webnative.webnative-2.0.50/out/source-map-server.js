"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSourceMapServer = startSourceMapServer;
const logging_1 = require("./logging");
const fs_1 = require("fs");
const http_1 = require("http");
const path_1 = require("path");
function startSourceMapServer(folder) {
    (0, logging_1.writeWN)('Starting source map server on port 80....');
    (0, http_1.createServer)((request, response) => {
        const filePath = (0, path_1.join)(folder, request.url);
        (0, logging_1.writeWN)(`Serving ${filePath}`);
        const ex = (0, path_1.extname)(filePath);
        const contentType = getMimeType(ex);
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
    }).listen(80);
}
function getMimeType(extname) {
    switch (extname) {
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
//# sourceMappingURL=source-map-server.js.map