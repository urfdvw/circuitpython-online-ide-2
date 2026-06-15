/**
 * Extract a single top-level (`## `) section from a markdown string.
 *
 * Returns the heading line plus everything below it, up to (but not including)
 * the next `## ` heading of the same level. Nested `### ` subsections are kept.
 * Returns "" when the section is not found.
 *
 * Used by the Help tab to show only the "How to Use" portion of a doc, while the
 * full document is rendered on the standalone documentation page (#/docs).
 *
 * @param {string} markdown - the full markdown document
 * @param {string} title - the section title to extract, e.g. "How to Use"
 * @param {boolean} [includeHeading=true] - keep the `## title` heading line in the result
 * @returns {string}
 */
export function extractSection(markdown, title, includeHeading = true) {
    if (!markdown) {
        return "";
    }
    const lines = markdown.split("\n");
    const wanted = `## ${title}`.trim();
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === wanted) {
            start = i;
            break;
        }
    }
    if (start === -1) {
        return "";
    }
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
        // Stop at the next same-level heading (`## ` but not `### `).
        if (/^##\s/.test(lines[i]) && !/^###\s/.test(lines[i])) {
            end = i;
            break;
        }
    }
    return lines.slice(includeHeading ? start : start + 1, end).join("\n").trim();
}
