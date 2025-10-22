"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IonicComponents = void 0;
exports.autoFixImports = autoFixImports;
const fs_1 = require("fs");
const imports_angular_1 = require("./imports-angular");
var Framework;
(function (Framework) {
    Framework[Framework["Angular"] = 0] = "Angular";
    Framework[Framework["React"] = 1] = "React";
    Framework[Framework["Vue"] = 2] = "Vue";
    Framework[Framework["Unknown"] = 3] = "Unknown";
})(Framework || (Framework = {}));
exports.IonicComponents = [
    'ion-action-sheet',
    'ion-accordion',
    'ion-accordion-group',
    'ion-alert',
    'ion-badge',
    'ion-breadcrumb',
    'ion-button',
    'ion-ripple-effect',
    'ion-card',
    'ion-card-content',
    'ion-card-header',
    'ion-card-subtitle',
    'ion-card-title',
    'ion-checkbox',
    'ion-chip',
    'ion-app',
    'ion-content',
    'ion-datetime',
    'ion-datetime-button',
    'ion-picker',
    'ion-fab',
    'ion-fab-button',
    'ion-fab-list',
    'ion-grid',
    'ion-col',
    'ion-row',
    'ion-infinite-scroll',
    'ion-infinite-scroll-content',
    'ion-icon',
    'ion-input',
    'ion-textarea',
    'ion-item',
    'ion-item-divider',
    'ion-item-group',
    'ion-item-sliding',
    'ion-item-options',
    'ion-item-option',
    'ion-label',
    'ion-note',
    'ion-list',
    'ion-list-header',
    'ion-avatar',
    'ion-img',
    'ion-split-pane',
    'ion-modal',
    'ion-backdrop',
    'ion-nav',
    'ion-nav-link',
    'ion-popover',
    'ion-loading',
    'ion-progress-bar',
    'ion-skeleton-text',
    'ion-spinner',
    'ion-radio',
    'ion-radio-group',
    'ion-range',
    'ion-refresher',
    'ion-refresher-content',
    'ion-reorder',
    'ion-reorder-group',
    'ion-router',
    'ion-router-link',
    'ion-router-outlet',
    'ion-route',
    'ion-route-redirect',
    'ion-searchbar',
    'ion-segment',
    'ion-segment-button',
    'ion-tabs',
    'ion-tab',
    'ion-tab-bar',
    'ion-tab-button',
    'ion-toast',
    'ion-toggle',
    'ion-toolbar',
    'ion-header',
    'ion-footer',
    'ion-title',
    'ion-buttons',
    'ion-back-button',
    'ion-text',
];
async function autoFixImports(document, component) {
    let framework = Framework.Unknown;
    // Validate that the file changed was a .html file that also has a .ts file which uses @ionic standalone
    if (document.fileName.endsWith('.html')) {
        const tsFile = document.fileName.replace(new RegExp('.html$'), '.ts');
        if ((0, fs_1.existsSync)(tsFile)) {
            framework = Framework.Angular;
        }
    }
    if (document.fileName.endsWith('.tsx')) {
        framework = Framework.React; // React already has import completion (so we dont do anything with it)
    }
    switch (framework) {
        case Framework.Angular:
            return await (0, imports_angular_1.autoFixAngularImports)(document, component);
        default:
            return false;
    }
}
//# sourceMappingURL=imports-auto-fix.js.map