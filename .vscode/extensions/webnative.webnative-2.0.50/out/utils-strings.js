"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStringFrom = getStringFrom;
exports.setStringIn = setStringIn;
exports.setAllStringIn = setAllStringIn;
exports.replaceAllStringIn = replaceAllStringIn;
exports.replaceStringIn = replaceStringIn;
exports.isEmpty = isEmpty;
function getStringFrom(data, start, end) {
    if (data == undefined)
        return undefined;
    const foundIdx = data.lastIndexOf(start);
    if (foundIdx == -1) {
        return undefined;
    }
    const idx = foundIdx + start.length;
    const edx = data.indexOf(end, idx);
    if (edx == -1)
        return data.substring(idx);
    return data.substring(idx, edx);
}
function setStringIn(data, start, end, replacement) {
    const foundIdx = data.lastIndexOf(start);
    if (foundIdx == -1) {
        return data;
    }
    const idx = foundIdx + start.length;
    return data.substring(0, idx) + replacement + data.substring(data.indexOf(end, idx));
}
function setAllStringIn(data, start, end, replacement) {
    let position = 0;
    let result = data;
    let replaced = true;
    while (replaced) {
        const foundIdx = result.indexOf(start, position);
        if (foundIdx == -1) {
            replaced = false;
        }
        else {
            const idx = foundIdx + start.length;
            position = idx + replacement.length;
            const ndx = result.indexOf(end, idx);
            if (ndx == -1) {
                replaced = false;
            }
            else {
                result = result.substring(0, idx) + replacement + result.substring(ndx);
            }
        }
    }
    return result;
}
function replaceAllStringIn(data, start, end, replacement) {
    let position = 0;
    let result = data;
    let replaced = true;
    while (replaced) {
        const foundIdx = result.indexOf(start, position);
        if (foundIdx == -1) {
            replaced = false;
        }
        else {
            const idx = foundIdx;
            position = idx + replacement.length;
            result = result.substring(0, idx) + replacement + result.substring(result.indexOf(end, idx) + end.length);
        }
    }
    return result;
}
function replaceStringIn(data, start, end, replacement) {
    const foundIdx = data.lastIndexOf(start);
    if (foundIdx == -1) {
        return data;
    }
    const idx = foundIdx;
    return data.substring(0, idx) + replacement + data.substring(data.indexOf(end, idx) + end.length);
}
function isEmpty(value) {
    return value == undefined || value.trim().length == 0;
}
//# sourceMappingURL=utils-strings.js.map