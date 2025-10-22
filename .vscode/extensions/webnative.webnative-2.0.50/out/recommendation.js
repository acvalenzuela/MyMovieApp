"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Recommendation = void 0;
const path_1 = require("path");
const vscode_1 = require("vscode");
class Recommendation extends vscode_1.TreeItem {
    constructor(tooltip, title, label, collapsibleState, command, tip, url) {
        super(label, collapsibleState);
        this.tooltip = tooltip;
        this.title = title;
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.command = command;
        this.tip = tip;
        this.url = url;
        this.iconPath = undefined;
        this.contextValue = 'recommendation';
        this.tooltip = `${this.tooltip}`;
        this.description = this.title;
    }
    setIcon(name) {
        if (name === 'none') {
            this.iconPath = undefined;
            return;
        }
        this.iconName = name;
        this.iconPath = {
            light: (0, path_1.join)(__filename, '..', '..', 'resources', 'light', name + '.svg'),
            dark: (0, path_1.join)(__filename, '..', '..', 'resources', 'dark', name + '.svg'),
        };
    }
    setSingleIcon(name) {
        if (name === 'none') {
            this.iconPath = undefined;
            return;
        }
        this.iconName = name;
        this.iconPath = {
            light: (0, path_1.join)(__filename, '..', '..', 'resources', name + '.svg'),
            dark: (0, path_1.join)(__filename, '..', '..', 'resources', name + '.svg'),
        };
    }
    setData(data) {
        this.data = data;
        return this;
    }
    getData() {
        return this.data;
    }
    // Animated icons need to have an equivalent filename with -anim that contains animated svg
    animate() {
        this.setIcon(this.iconName + '-anim');
    }
    setContext(value) {
        this.contextValue = value;
    }
}
exports.Recommendation = Recommendation;
//# sourceMappingURL=recommendation.js.map