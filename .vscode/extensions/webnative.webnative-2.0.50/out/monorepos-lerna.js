"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLernaWorkspaces = getLernaWorkspaces;
const globule = __importStar(require("globule"));
const fs_1 = require("fs");
const path_1 = require("path");
function getLernaWorkspaces(project) {
    const lernaFile = (0, path_1.join)(project.folder, 'lerna.json');
    if (!(0, fs_1.existsSync)(lernaFile)) {
        return [];
    }
    try {
        const json = (0, fs_1.readFileSync)(lernaFile, { encoding: 'utf8' });
        const lerna = JSON.parse(json);
        const list = [];
        for (const folder of lerna.packages) {
            list.push(folder);
        }
        const folders = globule.find({ src: list, srcBase: project.folder });
        const repos = [];
        for (const folder of folders) {
            repos.push({ folder: (0, path_1.join)(project.folder, folder), name: (0, path_1.basename)(folder) });
        }
        return repos;
    }
    catch (err) {
        console.error(err);
        return [];
    }
}
//# sourceMappingURL=monorepos-lerna.js.map