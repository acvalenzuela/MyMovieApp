"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uncolor = uncolor;
function uncolor(s) {
    // eslint-disable-next-line no-control-regex
    return s.replace(/[\x1b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}
//# sourceMappingURL=uncolor.js.map