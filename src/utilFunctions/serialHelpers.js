export function isPythonIncomplete(code) {
    if (!code.trim()) return false;

    // Rule 4: Ends with backslash (ignoring trailing spaces)
    if (code.trimEnd().endsWith("\\")) {
        return true;
    }

    // Rule 1: Line ends with colon at top level (no indent block yet)
    if (/:\s*$/.test(code) && balancedParens(code) && balancedQuotes(code)) {
        return true;
    }

    // Rule 2 & 3: Check brackets and quotes balance
    if (!balancedParens(code) || !balancedQuotes(code)) {
        return true;
    }

    return false;
}

function balancedParens(s) {
    const stack = [];
    const pairs = { "(": ")", "[": "]", "{": "}" };
    const openers = Object.keys(pairs);
    const closers = Object.values(pairs);
    let inString = null;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        const prev = s[i - 1];

        // Skip brackets if inside string
        if (inString) {
            if (ch === inString && prev !== "\\") {
                inString = null;
            }
            continue;
        }

        // String start
        if ((ch === '"' || ch === "'") && prev !== "\\") {
            inString = ch;
            continue;
        }

        if (openers.includes(ch)) {
            stack.push(pairs[ch]);
        } else if (closers.includes(ch)) {
            if (stack.pop() !== ch) return false;
        }
    }
    return stack.length === 0;
}

function balancedQuotes(s) {
    // Check for unclosed single/double/triple quotes
    // Simplified heuristic
    let single = 0,
        double = 0;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        const prev = s[i - 1];
        if (ch === "'" && prev !== "\\") single ^= 1;
        if (ch === '"' && prev !== "\\") double ^= 1;
    }
    return single === 0 && double === 0;
}
