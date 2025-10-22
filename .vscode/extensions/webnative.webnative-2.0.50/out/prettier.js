"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.integratePrettier = integratePrettier;
const fs_1 = require("fs");
const path_1 = require("path");
const node_commands_1 = require("./node-commands");
const logging_1 = require("./logging");
const vscode_1 = require("vscode");
async function integratePrettier(project) {
    try {
        const question = await vscode_1.window.showInformationMessage('You can enforce coding standards during development using a standard set of ESLint and Prettier rules. Would you like to add this integration to your project?', 'Yes', 'No');
        if (question != 'Yes')
            return;
        await project.run2((0, node_commands_1.npmInstall)('husky', (0, node_commands_1.saveDevArgument)(project), '--save-exact'));
        (0, logging_1.writeWN)(`Installed husky`);
        await project.run2((0, node_commands_1.npmInstall)('prettier', (0, node_commands_1.saveDevArgument)(project), '--save-exact'));
        (0, logging_1.writeWN)(`Installed prettier`);
        await project.run2((0, node_commands_1.npmInstall)('lint-staged', (0, node_commands_1.saveDevArgument)(project), '--save-exact'));
        (0, logging_1.writeWN)(`Installed lint-staged`);
        const filename = (0, path_1.join)(project.projectFolder(), 'package.json');
        const packageFile = JSON.parse((0, fs_1.readFileSync)(filename, 'utf8'));
        if (!packageFile.scripts['prettify']) {
            packageFile.scripts['prettify'] = `prettier "**/*.{ts,html}" --write`;
        }
        if (!packageFile.scripts['prepare']) {
            packageFile.scripts['prepare'] = `husky install`;
        }
        if (!packageFile['husky']) {
            packageFile['husky'] = {
                hooks: {
                    'pre-commit': 'npx lint-staged && npm run lint',
                },
            };
        }
        if (!packageFile['lint-staged']) {
            packageFile['lint-staged'] = {
                '*.{css,html,js,jsx,scss,ts,tsx}': ['prettier --write'],
                '*.{md,json}': ['prettier --write'],
            };
        }
        (0, fs_1.writeFileSync)(filename, JSON.stringify(packageFile, undefined, 2));
        // Create a .prettierrc.json file
        const prettierrc = (0, path_1.join)(project.projectFolder(), '.prettierrc.json');
        if (!(0, fs_1.existsSync)(prettierrc)) {
            (0, fs_1.writeFileSync)(prettierrc, defaultPrettier());
        }
        const hasLint = !!packageFile.scripts['lint'];
        const response = await vscode_1.window.showInformationMessage(`ESLint and Prettier have been integrated and will enforce coding standards during development. Do you want to apply these standards to the code base now? (this will run '${(0, node_commands_1.npmRun)('lint -- --fix')}' which may alter source code and report errors in your code)`, 'Yes', 'No');
        if (response == 'No') {
            return;
        }
        await project.run2((0, node_commands_1.npmRun)('prettify'));
        if (hasLint) {
            await project.run2((0, node_commands_1.npmRun)('lint -- --fix'));
        }
    }
    catch (err) {
        (0, logging_1.writeError)(`Unable to integrate prettier and ESLint:` + err);
    }
}
function defaultPrettier() {
    return JSON.stringify({
        printWidth: 120, // default: 80
        tabWidth: 2,
        useTabs: false,
        semi: true,
        singleQuote: true, // default: false
        quoteProps: 'as-needed',
        jsxSingleQuote: false,
        trailingComma: 'all',
        bracketSpacing: true,
        bracketSameLine: false,
        arrowParens: 'always',
        overrides: [
            {
                files: ['*.java'],
                options: {
                    printWidth: 140,
                    tabWidth: 4,
                    useTabs: false,
                    trailingComma: 'none',
                },
            },
            {
                files: '*.md',
                options: {
                    parser: 'mdx',
                },
            },
        ],
    }, undefined, 2);
}
//# sourceMappingURL=prettier.js.map