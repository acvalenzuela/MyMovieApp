"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoFixAngularImports = autoFixAngularImports;
const fs_1 = require("fs");
const vscode_1 = require("vscode");
const utilities_1 = require("./utilities");
const imports_auto_fix_1 = require("./imports-auto-fix");
const ts_morph_1 = require("ts-morph");
const analyzer_1 = require("./analyzer");
async function autoFixAngularImports(document, component) {
    // Validate that the file changed was a .html file that also has a .ts file which uses @ionic standalone
    if (!document.fileName.endsWith('.html'))
        return false;
    const tsFile = document.fileName.replace(new RegExp('.html$'), '.ts');
    if (!(0, fs_1.existsSync)(tsFile))
        return false;
    const edit = new vscode_1.WorkspaceEdit();
    const tsDoc = await vscode_1.workspace.openTextDocument(vscode_1.Uri.file(tsFile));
    const tsText = tsDoc.getText();
    if (!imports_auto_fix_1.IonicComponents.includes(component)) {
        // Not a known Ionic Component
        return false;
    }
    const a19 = (0, analyzer_1.isGreaterOrEqual)('@angular/core', '19.0.0');
    if (!a19) {
        if (!tsText.includes('standalone: true')) {
            // Doesnt include a standalone component
            console.log(`${tsFile} does not include a standalone component`);
            return false;
        }
    }
    else {
        if (tsText.includes('standalone: false')) {
            // Opted out of standalone components
            return false;
        }
    }
    if (tsText.includes('IonicModule')) {
        // Its got the IonicModule kitchen sink
        return false;
    }
    const project = new ts_morph_1.Project();
    const sourceFile = project.addSourceFileAtPath(vscode_1.Uri.file(tsFile).fsPath);
    sourceFile.replaceWithText(tsText);
    const importDeclarations = sourceFile.getImportDeclarations();
    const importName = (0, utilities_1.toPascalCase)(component);
    const moduleSpecifier = '@ionic/angular/standalone';
    let existsAlready = false;
    // Check if the import name already exists in the typescript file
    for (const importDeclaration of importDeclarations) {
        if (importDeclaration.getModuleSpecifier().getText().includes(moduleSpecifier)) {
            for (const named of importDeclaration.getNamedImports()) {
                if (named.getText() == importName) {
                    existsAlready = true;
                }
            }
        }
    }
    if (existsAlready)
        return;
    let added = false;
    // Add the import
    for (const importDeclaration of importDeclarations) {
        if (!added && importDeclaration.getModuleSpecifier().getText().includes(moduleSpecifier)) {
            importDeclaration.addNamedImport(importName);
            added = true;
        }
    }
    // It wasnt added so we need to add the import declaration
    if (!added) {
        sourceFile.addImportDeclaration({
            namedImports: [importName],
            moduleSpecifier: moduleSpecifier,
        });
    }
    // Add to the imports list of the component
    const componentClass = sourceFile
        .getClasses()
        .find((classDeclaration) => classDeclaration.getDecorators().some((decorator) => decorator.getText().includes('@Component')));
    if (componentClass) {
        const componentDecorator = componentClass.getDecorators().find((d) => d.getText().includes('@Component'));
        if (componentDecorator) {
            const args = componentDecorator.getArguments();
            let code = args[0].getText();
            code = code.replace('imports: [', `imports: [${importName}, `);
            args[0].replaceWithText(code);
        }
    }
    edit.replace(vscode_1.Uri.file(tsFile), new vscode_1.Range(tsDoc.lineAt(0).range.start, tsDoc.lineAt(tsDoc.lineCount - 1).range.end), sourceFile.getText());
    await vscode_1.workspace.applyEdit(edit);
    // Save the changes so that refresh happens
    await vscode_1.workspace.saveAll();
}
//# sourceMappingURL=imports-angular.js.map