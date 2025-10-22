"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.audit = audit;
const vscode_1 = require("vscode");
const logging_1 = require("./logging");
const utilities_1 = require("./utilities");
const analyzer_1 = require("./analyzer");
async function audit(queueFunction, project) {
    try {
        queueFunction();
        (0, logging_1.clearOutput)();
        let vulnerabilities = [];
        await (0, utilities_1.showProgress)('Auditing project dependencies...', async () => {
            var _a;
            let folder = project.projectFolder();
            if ((_a = project.monoRepo) === null || _a === void 0 ? void 0 : _a.nodeModulesAtRoot) {
                folder = project.folder;
            }
            const data = await (0, utilities_1.getRunOutput)('npm audit --json', folder);
            try {
                const audit = JSON.parse((0, utilities_1.stripJSON)(data, '{'));
                const dependencies = (0, analyzer_1.getAllPackageNames)();
                vulnerabilities = analyzeAudit(dependencies, audit);
                setTimeout(async () => {
                    if (vulnerabilities.length > 0) {
                        await checkAuditFix(vulnerabilities, project);
                    }
                    else {
                        (0, logging_1.writeWN)(`No security vulnerabilities were found using npm audit.`);
                        (0, logging_1.showOutput)();
                    }
                }, 1);
            }
            catch (error) {
                (0, logging_1.writeError)('npm audit --json failed with:');
                (0, logging_1.writeError)(data);
            }
        });
    }
    catch (error) {
        (0, logging_1.writeError)(error);
    }
    return;
}
function analyzeAudit(dependencies, audit) {
    const result = [];
    for (const name of Object.keys(audit.vulnerabilities)) {
        const v = audit.vulnerabilities[name];
        if (dependencies.includes(name)) {
            const source = drillDown(name, audit);
            result.push({
                name,
                severity: v.severity,
                title: source ? source.title : '',
                url: source ? source.url : '',
            });
        }
    }
    return result;
}
function drillDown(name, audit) {
    for (const source of audit.vulnerabilities[name].via) {
        if (!source.title) {
            return drillDown(source, audit);
        }
        else {
            const src = source;
            return src;
        }
    }
}
async function checkAuditFix(vulnerabilities, project) {
    for (const vulnerability of vulnerabilities) {
        (0, logging_1.write)(`${colorSeverity(vulnerability.severity)} ${vulnerability.severity} - ${vulnerability.name} - ${vulnerability.title} (${vulnerability.url})`);
    }
    (0, logging_1.showOutput)();
    const response = await vscode_1.window.showWarningMessage(`Security vulnerabilities were found in your project. Do you want to attempt to fix them?`, 'Yes', 'Cancel');
    if (response === 'Yes') {
        (0, logging_1.clearOutput)();
        (0, logging_1.write)('> npm audit fix');
        await (0, utilities_1.run)(project.projectFolder(), 'npm audit fix', undefined, [], [], undefined, undefined, undefined, false);
    }
}
async function completeAudit(project, audit) {
    const severities = ['critical', 'high', 'moderate', 'low'];
    const types = ['direct', 'indirect'];
    (0, logging_1.writeWN)(`There are ${audit.metadata.vulnerabilities.total} security vulnerabilities in your projects ${audit.metadata.dependencies.total} dependencies`);
    for (const type of types) {
        if (type == 'indirect' && audit.metadata.vulnerabilities.total > 0) {
            (0, logging_1.write)('');
            (0, logging_1.write)('Other vulnerable dependencies');
        }
        for (const severity of severities) {
            for (const name of Object.keys(audit.vulnerabilities)) {
                const v = audit.vulnerabilities[name];
                if (v.severity == severity) {
                    let direct = false;
                    for (const source of v.via) {
                        if (typeof source === 'object')
                            direct = true;
                        if (type == 'direct' && typeof source === 'object') {
                            (0, logging_1.write)(`[${v.severity}] ${source.title} ${source.url}`);
                        }
                    }
                    if (!direct && type === 'indirect') {
                        (0, logging_1.write)(`${v.name} is vulnerable because it uses ${v.via.join(',')}`);
                    }
                }
            }
        }
    }
    if (audit.metadata.vulnerabilities.total > 0) {
        const response = await vscode_1.window.showWarningMessage(`${audit.metadata.vulnerabilities.total} security vulnerabilities were found in your project. Do you want to attempt to fix them?`, 'Yes', 'Cancel');
        if (response === 'Yes') {
            (0, logging_1.clearOutput)();
            (0, logging_1.write)('> npm audit fix');
            await (0, utilities_1.run)(project.projectFolder(), 'npm audit fix', undefined, [], [], undefined, undefined, undefined, false);
        }
    }
}
function colorSeverity(severity) {
    switch (severity) {
        case 'critical':
            return '🔴';
        case 'high':
            return '🟠';
        case 'moderate':
            return '🟡';
        case 'low':
            return '⚪';
        default:
            return '-';
    }
}
//# sourceMappingURL=audit.js.map