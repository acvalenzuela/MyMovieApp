"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.liveReloadSSL = liveReloadSSL;
exports.setupServerCertificate = setupServerCertificate;
exports.certPath = certPath;
const utilities_1 = require("./utilities");
const wn_tree_provider_1 = require("./wn-tree-provider");
const fs_1 = require("fs");
const logging_1 = require("./logging");
const path_1 = require("path");
const vscode_1 = require("vscode");
const http_1 = require("http");
const os_1 = require("os");
async function liveReloadSSL(project) {
    try {
        const certFilename = getRootCACertFilename();
        // Create the Root CA and key if they dont already exist
        if (!hasRootCA()) {
            const keyFilename = await createRootCAKey();
            await createRootCA(keyFilename);
        }
        await setupServerCertificate(project);
        const url = servePage(certFilename);
        (0, utilities_1.openUri)(url);
    }
    catch (err) {
        (0, logging_1.writeError)(err);
    }
}
async function setupServerCertificate(project) {
    if (!hasRootCA()) {
        if ((await vscode_1.window.showInformationMessage('A trusted root certificate is required to use HTTPS with Live Reload. Would you like to create one?', 'Yes')) == 'Yes') {
            liveReloadSSL(project);
        }
        return;
    }
    // Create a server certificate request
    const crFile = createCertificateRequest();
    const cmd = `openssl req -new -nodes -sha256 -keyout '${certPath('key')}' -config '${crFile}' -out '${certPath('csr')}' -newkey rsa:4096 -subj "/C=US/ST=/L=/O=/CN=myserver"`;
    (0, logging_1.writeWN)(`> ${cmd}`);
    const txt = await (0, utilities_1.getRunOutput)(cmd, project.folder);
    // Create the server certificate
    const cmd2 = `openssl x509 -sha256 -extfile '${crFile}' -extensions x509_ext -req -in '${certPath('csr')}' -CA '${getRootCACertFilename()}' -CAkey '${getRootCAKeyFilename()}' -CAcreateserial -out '${certPath('crt')}' -days 180`;
    (0, logging_1.writeWN)(`> ${cmd2}`);
    const txt2 = await (0, utilities_1.getRunOutput)(cmd2, project.folder);
    (0, fs_1.rmSync)(crFile);
    const certFile = certPath('crt');
    if (!(0, fs_1.existsSync)(certFile)) {
        (0, logging_1.writeError)(`Unable to create certificate`);
    }
}
function globalPath() {
    return wn_tree_provider_1.exState.context.globalStorageUri.fsPath;
}
function certPath(ext) {
    return (0, path_1.join)(certStorePath(), `server.${ext}`);
}
function certStorePath() {
    return wn_tree_provider_1.exState.context.globalStorageUri.fsPath;
}
function hasRootCA() {
    const certFilename = getRootCACertFilename();
    // Create the Root CA and key if they don't already exist
    return (0, fs_1.existsSync)(certFilename) && (0, fs_1.existsSync)(getRootCAKeyFilename());
}
function createCertificateRequest() {
    const filename = (0, path_1.join)(globalPath(), 'cr.txt');
    let data = `
	[req]
	default_bits = 4096
	default_md = sha256
	distinguished_name = subject
	req_extensions = req_ext
	x509_extensions = x509_ext
	string_mask = utf8only
	prompt = no
	
	[ subject ]
	C = US
	ST = WI
	L = Madison
	O = Ionic
	OU = Development
	CN = ${getAddress()}
	
	[ x509_ext ]
	subjectKeyIdentifier = hash
	authorityKeyIdentifier = keyid,issuer
	basicConstraints = CA:FALSE
	keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
	subjectAltName = @alternate_names
	
	[ req_ext ]
	subjectKeyIdentifier = hash
	basicConstraints = CA:FALSE
	keyUsage = digitalSignature, keyEncipherment
	subjectAltName = @alternate_names
	
	[ alternate_names ]
	DNS.2 =localhost
	`;
    // Add all external and internal IP Addresses to server certificate
    let i = 0;
    for (const address of getAddresses()) {
        i++;
        data += `IP.${i} =${address}\n`;
    }
    (0, fs_1.writeFileSync)(filename, data);
    return filename;
}
async function createRootCA(keyFilename) {
    // Create the config file the Root CA
    const filename = (0, path_1.join)(globalPath(), 'cr-ca.txt');
    const data = `
	[req]
	default_bits = 4096
	default_md = sha256
	distinguished_name = subject
	req_extensions = req_ext
  x509_extensions = x509_ext
	string_mask = utf8only
	prompt = no
	
	[ subject ]
	C = US
	ST = WI
	L = Madison
	O = Ionic
	OU = Development
	CN = Ionic Root CA Certificate
	
	[ req_ext ]
	basicConstraints        = critical, CA:true
	keyUsage                = critical, keyCertSign, cRLSign
	subjectKeyIdentifier    = hash
	subjectAltName          = @subject_alt_name
	authorityKeyIdentifier = keyid:always,issuer:always
	issuerAltName           = issuer:copy

	[ x509_ext ]
  subjectKeyIdentifier      = hash
  authorityKeyIdentifier    = keyid:always,issuer
  basicConstraints          = critical, CA:TRUE
  keyUsage                  = critical, digitalSignature, keyEncipherment, cRLSign, keyCertSign

	[ subject_alt_name ]
	URI                     = https://ionic.io/
	email                   = support@ionic.io	
	`;
    (0, fs_1.writeFileSync)(filename, data);
    const certFilePath = getRootCACertFilename();
    const certFName = (0, path_1.basename)(certFilePath);
    if ((0, fs_1.existsSync)(certFilePath)) {
        (0, fs_1.rmSync)(certFilePath);
    }
    // Create the CA Certificate
    const cmd = `openssl req -config '${filename}' -key ${keyFilename} -new -x509 -days 3650 -sha256 -out ${certFName}`;
    (0, logging_1.writeWN)(cmd);
    const certTxt = await (0, utilities_1.getRunOutput)(cmd, globalPath());
    if (!(0, fs_1.existsSync)(certFilePath)) {
        (0, logging_1.writeError)(certTxt);
        throw new Error('Unable to create root CA Certificate');
    }
    (0, logging_1.writeWN)(`Ionic Root CA certificate created (${certFilePath})`);
    return certFilePath;
}
function getRootCAKeyFilename() {
    const folder = globalPath();
    if (!(0, fs_1.existsSync)(folder)) {
        (0, fs_1.mkdirSync)(folder);
    }
    return (0, path_1.join)(folder, 'ca.key');
}
function getRootCACertFilename() {
    const folder = globalPath();
    if (!(0, fs_1.existsSync)(folder)) {
        (0, fs_1.mkdirSync)(folder);
    }
    return (0, path_1.join)(folder, 'ca.crt');
}
async function createRootCAKey() {
    const keyFilename = getRootCAKeyFilename();
    const filename = (0, path_1.basename)(keyFilename);
    if ((0, fs_1.existsSync)(keyFilename)) {
        (0, fs_1.rmSync)(keyFilename);
    }
    // Create the CA Key
    const cmd = `openssl genrsa -out ${filename} 4096`;
    (0, logging_1.writeWN)(cmd);
    const txt = await (0, utilities_1.getRunOutput)(cmd, globalPath());
    if (!(0, fs_1.existsSync)(keyFilename)) {
        (0, logging_1.writeError)(txt);
        throw new Error('Unable to create root CA Certificate');
    }
    return filename;
}
let certServer;
function servePage(certFilename) {
    if (certServer) {
        certServer.close();
        certServer = undefined;
        (0, logging_1.writeWN)(`Certificate Server stopped.`);
        return;
    }
    const port = 8942;
    const basePath = (0, path_1.join)(wn_tree_provider_1.exState.context.extensionPath, 'certificates');
    certServer = (0, http_1.createServer)((request, response) => {
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Request-Method', '*');
        response.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
        response.setHeader('Access-Control-Allow-Headers', '*');
        if (request.method == 'OPTIONS') {
            response.writeHead(200);
            response.end();
            return;
        }
        let name = request.url.includes('?') ? request.url.split('?')[0] : request.url;
        name = name == '/' ? 'index.html' : name;
        name = name == '/favicon.ico' ? '/favicon.png' : name;
        let filePath = (0, path_1.join)(basePath, name);
        if (name.endsWith('.crt')) {
            filePath = certFilename;
        }
        const ext = (0, path_1.extname)(filePath);
        const contentType = getMimeType(ext);
        const content = (0, fs_1.readFileSync)(filePath);
        response.writeHead(200, { 'Content-Type': contentType });
        response.end(content, 'utf-8');
    }).listen(port);
    const address = getAddress();
    const url = `http://${address}:${port}`;
    (0, logging_1.writeWN)(`Server running at ${url}`);
    return url;
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
function getAddresses() {
    const result = [];
    const nets = (0, os_1.networkInterfaces)();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 addresses
            if (net.family === 'IPv4') {
                result.push(net.address);
            }
        }
    }
    return result;
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
        case '.crt':
            return 'application/x-pem-file';
    }
    return 'text/html';
}
//# sourceMappingURL=live-reload.js.map