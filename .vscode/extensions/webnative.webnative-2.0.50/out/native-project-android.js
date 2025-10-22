"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AndroidProject = void 0;
const fs_1 = require("fs");
const fast_xml_parser_1 = require("fast-xml-parser");
const path_1 = require("path");
const utils_strings_1 = require("./utils-strings");
class AndroidProject {
    constructor(projectPath) {
        this._projectPath = projectPath;
    }
    exists() {
        return (0, fs_1.existsSync)(this._projectPath);
    }
    async parse() { }
    stringsXmlPath() {
        return (0, path_1.join)(this._projectPath, 'app', 'src', 'main', 'res', 'values', 'strings.xml');
    }
    // Function to get the current app name
    getDisplayName() {
        return this.getValueFromStringsXml('app_name');
    }
    setDisplayName(newName) {
        let data = (0, fs_1.readFileSync)(this.stringsXmlPath(), 'utf-8');
        if (!data) {
            throw new Error(`Unable to set Android display name`);
        }
        data = (0, utils_strings_1.setStringIn)(data, `<string name="app_name">`, `</string>`, newName);
        data = (0, utils_strings_1.setStringIn)(data, `<string name="title_activity_main">`, `</string>`, newName);
        (0, fs_1.writeFileSync)(this.stringsXmlPath(), data);
    }
    getValueFromStringsXml(key) {
        if (!(0, fs_1.existsSync)(this.stringsXmlPath())) {
            console.error('Error: strings.xml not found.');
            return null;
        }
        try {
            const xmlData = (0, fs_1.readFileSync)(this.stringsXmlPath(), 'utf-8');
            const parsedXml = (0, fast_xml_parser_1.parse)(xmlData, { ignoreAttributes: false });
            if (parsedXml.resources && parsedXml.resources.string) {
                const appNameEntry = parsedXml.resources.string.find((s) => s['@_name'] === key);
                return appNameEntry ? appNameEntry['#text'] : null;
            }
            return null;
        }
        catch (error) {
            console.error(`Error reading ${key}:`, error);
            return null;
        }
    }
    manifestPath() {
        return (0, path_1.join)(this._projectPath, 'app', 'src', 'main', 'AndroidManifest.xml');
    }
    getPackageName() {
        return this.getValueFromStringsXml('package_name');
    }
    getVersionName() {
        const gradlePath = (0, path_1.join)(this._projectPath, 'app', 'build.gradle');
        if (!(0, fs_1.existsSync)(gradlePath)) {
            console.error('Error: build.gradle not found.');
            return null;
        }
        try {
            const gradleData = (0, fs_1.readFileSync)(gradlePath, 'utf-8');
            const match = gradleData.match(/versionName\s+"(.+?)"/);
            return match ? match[1] : null;
        }
        catch (error) {
            console.error('Error reading versionName:', error);
            return null;
        }
    }
    getVersionCode() {
        const gradlePath = (0, path_1.join)(this._projectPath, 'app', 'build.gradle');
        if (!(0, fs_1.existsSync)(gradlePath)) {
            console.error('Error: build.gradle not found.');
            return null;
        }
        try {
            const gradleData = (0, fs_1.readFileSync)(gradlePath, 'utf-8');
            const match = (0, utils_strings_1.getStringFrom)(gradleData, 'versionCode ', '\r\n');
            return match ? parseInt(match) : null;
        }
        catch (error) {
            console.error('Error reading versionName:', error);
            return null;
        }
    }
    updateStringsXML(newBundleId) {
        let data = (0, fs_1.readFileSync)(this.stringsXmlPath(), 'utf-8');
        if (!data) {
            throw new Error('Error reading strings.xml');
        }
        data = (0, utils_strings_1.setStringIn)(data, `<string name="package_name">`, `</string>`, newBundleId);
        data = (0, utils_strings_1.setStringIn)(data, `<string name="custom_url_scheme">`, `</string>`, newBundleId);
        (0, fs_1.writeFileSync)(this.stringsXmlPath(), data);
    }
    async setPackageName(packageName) {
        const dir = (0, path_1.join)(this._projectPath, 'app', 'src', 'main', 'java');
        const stringsXML = this.stringsXmlPath();
        const currentPackageName = this.getPackageName();
        const gradlePath = (0, path_1.join)(this._projectPath, 'app', 'build.gradle');
        const currentFolders = currentPackageName.split('.');
        const currentPath = (0, path_1.join)(dir, ...currentFolders);
        const mainActivity = (0, path_1.join)(currentPath, 'MainActivity.java');
        if (packageName === currentPackageName) {
            return;
        }
        if (!(0, fs_1.existsSync)(currentPath)) {
            throw new Error(`Path ${currentPath} does not exist.`);
            return;
        }
        if (!(0, fs_1.existsSync)(mainActivity)) {
            console.error('Error: MainActivity.java not found.');
            return;
        }
        if (!(0, fs_1.existsSync)(stringsXML)) {
            console.error('Error: strings.xml not found.');
            return;
        }
        if (!(0, fs_1.existsSync)(gradlePath)) {
            console.error('Error: build.gradle not found.');
            return;
        }
        // Replace package name in MainActivity.java
        const data = (0, fs_1.readFileSync)(mainActivity, 'utf-8');
        const newData = data.replace(new RegExp(currentPackageName, 'g'), packageName);
        (0, fs_1.writeFileSync)(mainActivity, newData);
        // Replace package name in strings.xml
        const data2 = (0, fs_1.readFileSync)(stringsXML, 'utf-8');
        const newData2 = data2.replace(new RegExp(currentPackageName, 'g'), packageName);
        (0, fs_1.writeFileSync)(stringsXML, newData2);
        // Replace package name in Build.gradle
        const data3 = (0, fs_1.readFileSync)(gradlePath, 'utf-8');
        const newData3 = data3.replace(new RegExp(currentPackageName, 'g'), packageName);
        (0, fs_1.writeFileSync)(gradlePath, newData3);
        // Create new folders for the new package name
        const folders = packageName.split('.');
        let newPath = dir;
        for (const folder of folders) {
            newPath = (0, path_1.join)(newPath, folder);
            if (!(0, fs_1.existsSync)(newPath)) {
                (0, fs_1.mkdirSync)(newPath);
            }
        }
        // Move all files from the currentPath to the newPath
        const files = (0, fs_1.readdirSync)(currentPath);
        for (const file of files) {
            const source = (0, path_1.join)(currentPath, file);
            const destination = (0, path_1.join)(newPath, file);
            (0, fs_1.renameSync)(source, destination);
        }
        // Delete old path
        let count = currentFolders.length;
        let pth = currentPath;
        while (count > 0) {
            try {
                (0, fs_1.rmdirSync)(pth);
                pth = pth.substring(0, pth.lastIndexOf('/'));
                count--;
            }
            catch {
                break;
            }
        }
    }
    async setVersionName(versionName) {
        const currentVersionName = this.getVersionName();
        this.gradleReplace('versionName', `"${versionName}"`, `"${currentVersionName}"`);
    }
    gradleReplace(key, value, oldvalue) {
        const gradlePath = (0, path_1.join)(this._projectPath, 'app', 'build.gradle');
        if (!(0, fs_1.existsSync)(gradlePath)) {
            console.error('Error: build.gradle not found.');
            return null;
        }
        try {
            const gradleData = (0, fs_1.readFileSync)(gradlePath, 'utf-8');
            const newData = gradleData.replace(`${key} ${oldvalue}`, `${key} ${value}`);
            (0, fs_1.writeFileSync)(gradlePath, newData);
        }
        catch (error) {
            throw new Error(`Error setting ${key} to ${value}: ${error.message}`);
        }
    }
    async setVersionCode(versionCode) {
        const currentVersionCode = this.getVersionCode();
        this.gradleReplace('versionCode', versionCode.toString(), currentVersionCode.toString());
    }
}
exports.AndroidProject = AndroidProject;
//# sourceMappingURL=native-project-android.js.map