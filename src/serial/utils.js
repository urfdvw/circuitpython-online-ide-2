export function removeCommonIndentation(text) {
    // Split the text into lines, considering both Windows and Linux line endings.
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

    // Find the common indentation (minimum number of leading spaces or tabs).
    let commonIndent = null;
    lines.forEach((line) => {
        const leadingSpaces = line.match(/^[ \t]*/)[0].length;
        commonIndent = commonIndent === null ? leadingSpaces : Math.min(commonIndent, leadingSpaces);
    });

    // If there's no indentation, just join the non-empty lines.
    if (commonIndent === null) {
        return lines.join("\n");
    }

    // Remove the common indentation from each non-empty line and join them back into a single string.
    return lines.map((line) => line.substring(commonIndent)).join("\n");
}
