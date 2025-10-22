"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNpmInfo = getNpmInfo;
exports.httpGet = httpGet;
exports.getNpmToken = getNpmToken;
async function getNpmInfo(name, latest) {
    let url = '';
    try {
        url = latest ? `https://registry.npmjs.org/${name}/latest` : `https://registry.npmjs.org/${name}`;
        const np = await httpGet(url, npmHeaders());
        if (!np.name)
            throw new Error(`No name found in ${url}`); // This error is happening for some reason
        //np.versions = undefined;
        np.version = np['dist-tags'] ? np['dist-tags'].latest : np.version;
        return np;
    }
    catch (error) {
        const msg = `${error}`;
        if (msg.includes(`'Not found'`)) {
            console.error(`[error] ${name} was not found on npm.`);
        }
        else {
            console.error(`getNpmInfo Failed ${url}`, error);
        }
        return {};
    }
}
function npmHeaders() {
    return {
        headers: {
            Authorization: `bearer ${getNpmToken()}`,
            'User-Agent': 'Ionic VSCode Extension',
            Accept: '*/*',
        },
    };
}
async function httpGet(url, opts) {
    const response = await fetch(url, opts);
    try {
        const data = await response.json();
        if (rateLimited(data)) {
            console.log(`The api call ${url} was rate limited.`);
        }
        return data;
    }
    catch (error) {
        throw new Error(`Error: get ${url}: ${response.status} ${response.statusText}`);
    }
}
function rateLimited(a) {
    var _a, _b;
    return (((_a = a.message) === null || _a === void 0 ? void 0 : _a.startsWith('API rate limit exceeded')) ||
        ((_b = a.message) === null || _b === void 0 ? void 0 : _b.startsWith('You have exceeded a secondary rate limit')));
}
function getNpmToken() {
    return process.env.DATA_SCRIPTS_NPM_TOKEN;
}
//# sourceMappingURL=npm-info.js.map