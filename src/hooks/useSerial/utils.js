/** Dedent selected code without removing blank lines inside string literals. */
export function removeCommonIndentation(text) {
    const lines = text.split(/\r?\n/);
    const indents = lines.filter((line) => line.trim()).map((line) => line.match(/^[ \t]*/)[0].length);
    const indent = indents.length ? indents.reduce((minimum, value) => Math.min(minimum, value), Infinity) : 0;
    return lines.map((line) => line.slice(Math.min(indent, line.match(/^[ \t]*/)[0].length))).join("\n");
}

// Re-exported for existing import sites; the single source of truth is utilFunctions/sleep.js.
export { sleep } from "../../utilFunctions/sleep";
