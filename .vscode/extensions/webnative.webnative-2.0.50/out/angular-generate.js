"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addAngularGenerateAction = addAngularGenerateAction;
exports.angularGenerate = angularGenerate;
const utilities_1 = require("./utilities");
const logging_1 = require("./logging");
const path_1 = require("path");
const fs_1 = require("fs");
const analyzer_1 = require("./analyzer");
const vscode_1 = require("vscode");
const tip_1 = require("./tip");
const wn_tree_provider_1 = require("./wn-tree-provider");
const node_commands_1 = require("./node-commands");
const rules_angular_json_1 = require("./rules-angular-json");
const utils_strings_1 = require("./utils-strings");
async function addAngularGenerateAction(project) {
    // if (!project.isCapacitor) return;
    if (!(0, analyzer_1.exists)('@angular/core'))
        return;
    project.setSubGroup('New', tip_1.TipType.Add, 'Create new Angular Components, Pages and more');
    const types = ['Component', 'Service', 'Module', 'Class', 'Directive'];
    if ((0, analyzer_1.exists)('@ionic/angular-toolkit')) {
        types.push('Page');
    }
    types.forEach((item) => {
        project.add(new tip_1.Tip(item, '', tip_1.TipType.Angular)
            .setQueuedAction(angularGenerate, project, item.toLowerCase())
            .setTooltip(`Create a new Angular ${item.toLowerCase()}`)
            .canRefreshAfter());
    });
    project.clearSubgroup();
}
async function angularGenerate(queueFunction, project, angularType) {
    var _a;
    let name = await vscode_1.window.showInputBox({
        title: `New Angular ${angularType}`,
        placeHolder: `Enter name for new ${angularType}`,
    });
    if (!name || name.length < 1)
        return;
    queueFunction();
    // CREATE src/app/test2/test2.component.ts
    try {
        let args = '';
        if ((0, analyzer_1.isGreaterOrEqual)('@angular/core', '15.0.0')) {
            const isOlder = (0, analyzer_1.exists)('@ionic/angular-toolkit') && (0, analyzer_1.isLessOrEqual)('@ionic/angular-toolkit', '8.1.0');
            if (angularType == 'page' && !isOlder) {
                args += ' --standalone';
            }
            const isOld = (0, analyzer_1.exists)('@ionic/angular-toolkit') && (0, analyzer_1.isLessOrEqual)('@ionic/angular-toolkit', '11.0.1');
            if (angularType == 'component' && !isOld) {
                args += ' --standalone';
            }
        }
        name = (0, utilities_1.replaceAll)(name, ' ', '-').trim();
        (0, logging_1.writeWN)(`Creating Angular ${angularType} named ${name}..`);
        (0, rules_angular_json_1.checkAngularJson)(project);
        const angularProjectName = (_a = wn_tree_provider_1.exState.project) !== null && _a !== void 0 ? _a : 'app';
        // eg ng generate page page-a --standalone --project=app
        let cmd = `${(0, node_commands_1.npx)(project)} ng generate ${angularType} ${name}${args}`; // --project=${angularProjectName}`;
        if (angularType == 'directive') {
            cmd += ` --skip-import`;
        }
        (0, logging_1.write)(`> ${cmd}`);
        const out = await (0, utilities_1.getRunOutput)(cmd, project.projectFolder());
        (0, logging_1.write)(out);
        const src = (0, utils_strings_1.getStringFrom)(out, 'CREATE ', '.ts');
        const path = (0, path_1.join)(project.projectFolder(), src + '.ts');
        if (!src || !(0, fs_1.existsSync)(path)) {
            (0, logging_1.writeError)(`Failed to create Angular ${angularType} named ${name}`);
        }
        else {
            (0, logging_1.writeWN)(`Created Angular ${angularType} named ${name}`);
            await (0, utilities_1.openUri)(path);
        }
    }
    catch (err) {
        (0, logging_1.writeError)(`Unable to generate Angular ${angularType} named ${name}: ${err}`);
    }
}
//# sourceMappingURL=angular-generate.js.map