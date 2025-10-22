"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportQuickFixProvider = void 0;
const vscode_1 = require("vscode");
const imports_auto_fix_1 = require("./imports-auto-fix");
class ImportQuickFixProvider {
    provideCodeActions(document, range, context, token) {
        // Filter out diagnostics that are not related to missing imports
        const missingImportDiagnostics = context.diagnostics.filter((diagnostic) => diagnostic.message.includes('is not a known element'));
        // Return an array of code actions for each diagnostic
        return missingImportDiagnostics.map((diagnostic) => this.createImportQuickFix(document, diagnostic));
    }
    createImportQuickFix(document, diagnostic) {
        // Get the name of the missing identifier from the diagnostic message
        const missingComponent = diagnostic.message.split(' ')[0].replace(/["']/g, '');
        console.log(diagnostic.message);
        (0, imports_auto_fix_1.autoFixImports)(document, missingComponent);
        return;
    }
}
exports.ImportQuickFixProvider = ImportQuickFixProvider;
ImportQuickFixProvider.providedCodeActionKinds = [vscode_1.CodeActionKind.QuickFix];
//# sourceMappingURL=quick-fix.js.map