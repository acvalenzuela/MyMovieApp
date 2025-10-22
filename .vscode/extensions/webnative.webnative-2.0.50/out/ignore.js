"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignore = ignore;
exports.getIgnored = getIgnored;
exports.clearIgnored = clearIgnored;
exports.excludeIgnoredTips = excludeIgnoredTips;
/**
 * Allows recommendations to be ignored. We need to store the recommendation text from the tip
 * @param  {Tip} tip
 * @param  {vscode.ExtensionContext} context
 */
function ignore(tip, context) {
    const key = 'ignoredRecommendations';
    const txt = `${tip.message}+${tip.title}`;
    const listJSON = context.workspaceState.get(key);
    let list = [];
    if (listJSON) {
        list = JSON.parse(listJSON);
    }
    if (!list.includes(txt)) {
        list.push(txt);
    }
    context.workspaceState.update(key, JSON.stringify(list));
}
function getIgnored(context) {
    const key = 'ignoredRecommendations';
    const listJSON = context.workspaceState.get(key);
    let list = [];
    try {
        list = JSON.parse(listJSON);
        return list;
    }
    catch {
        return [];
    }
}
function clearIgnored(context) {
    const key = 'ignoredRecommendations';
    context.workspaceState.update(key, undefined);
}
function excludeIgnoredTips(tips, context) {
    const key = 'ignoredRecommendations';
    const listJSON = context.workspaceState.get(key);
    let list = [];
    if (listJSON) {
        try {
            list = JSON.parse(listJSON);
            return tips.filter((tip) => {
                return tip && !list.includes(`${tip.message}+${tip.title}`);
            });
        }
        catch {
            context.workspaceState.update(key, '[]');
            return tips;
        }
    }
    else {
        return tips;
    }
}
//# sourceMappingURL=ignore.js.map