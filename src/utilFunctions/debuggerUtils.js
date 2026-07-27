import { sleep } from "./sleep";
import { getParser } from "./astUtils";

// Helper: Constants for file system operations
const PREFIX = "ide_debug_";
const STATE_FILENAME = "ide_debug_state.py";
import * as constants from "../constants";

/**
 * AST Logic: Identifies rows that should be instrumented.
 * Takes the parser instance and raw code string.
 * Returns a Set of 0-indexed row numbers.
 */
async function identifyCodeRows(codeText) {
    const parser = await getParser();
    if (!parser) return new Set(); // Return empty if parser failed to load

    const tree = parser.parse(codeText);
    const codeRows = new Set();

    const targetTypes = [
        "expression_statement",
        "assignment",
        "return_statement",
        "if_statement",
        "for_statement",
        "while_statement",
        "try_statement",
        "with_statement",
        "function_definition",
        "class_definition",
        "break_statement",
        "continue_statement",
        "pass_statement",
        "match_statement",
    ];

    const exclusionTypes = ["else_clause", "elif_clause", "except_clause", "finally_clause", "case_clause"];

    const traverse = (node) => {
        if (!node) return;

        let isCodeRow = false;
        const type = node.type;

        if (exclusionTypes.includes(type)) {
            isCodeRow = false;
        } else if (targetTypes.includes(type)) {
            isCodeRow = true;

            // --- NEW LOGIC START ---
            // If this is a function or class definition, check if it's decorated.
            // If it is, the 'decorated_definition' node will handle the row marking.
            if (
                (type === "function_definition" || type === "class_definition") &&
                node.parent &&
                node.parent.type === "decorated_definition"
            ) {
                isCodeRow = false;
            }
            // --- NEW LOGIC END ---

            // Filtering: Docstrings
            if (type === "expression_statement") {
                if (node.childCount === 1 && node.firstChild.type === "string") {
                    isCodeRow = false;
                }
            }
        } else if (type === "decorated_definition") {
            // This marks the row of the first decorator
            isCodeRow = true;
        }

        if (isCodeRow) {
            codeRows.add(node.startPosition.row);
        }

        // Standard Child Traversal
        // We still traverse children so that statements inside the function body are identified
        for (let i = 0; i < node.childCount; i++) {
            traverse(node.child(i));
        }
    };

    traverse(tree.rootNode);
    return codeRows;
}

/**
 * 9. Cleanup Function (Standalone)
 * Removes all files/folders starting with 'ide_debug_' in the root directory.
 */
async function cleanupDebugFiles(rootDir) {
    for await (const [name] of rootDir.entries()) {
        if (name.startsWith(PREFIX)) {
            await rootDir.removeEntry(name, { recursive: true });
        }
    }
}

/**
 * Extra 1: Get All Python Files
 * Scans root directory for .py files, excluding hidden, boot.py, and debug files.
 */
async function getAllPythonFiles(rootDir) {
    const files = [];
    for await (const [name, handle] of rootDir.entries()) {
        if (handle.kind !== "file") continue;

        // Skip hidden files
        if (name.startsWith(".")) continue;

        // Skip debug files
        if (name.startsWith(PREFIX)) continue;

        // Skip boot.py
        if (name === "boot.py") continue;

        // Only accept .py files
        if (name.endsWith(".py")) {
            files.push(name);
        }
    }
    return files;
}

/**
 * Main Function: Instrument Code
 */
async function instrumentCode(rootDir, pythonFileNames, debugFileNames, watchExpressions, conditionalBreakpoints) {
    // 1. & 5. Helper to generate debug blocks
    const generateDebugBlock = (indent, isBreakpoint, fileName, lineNum) => {
        const globalWatches = watchExpressions[""] || [];
        const localWatches = watchExpressions[fileName] || [];

        const globalCBP = conditionalBreakpoints[""] || [];
        const localCBP = conditionalBreakpoints[fileName] || [];

        // Combine unique watches
        const allWatches = [...new Set([...globalWatches, ...localWatches])];
        const allCBP = [...new Set([...globalCBP, ...localCBP])];

        let block = "";

        // If it is a STEP debug block (not a breakpoint), wrap in condition
        if (!isBreakpoint) {
            // add conditional breakpoints
            allCBP.forEach((expr) => {
                // Escape quotes in the expression key string if necessary
                block += `${indent}try:\n`;
                block += `${indent}    _ds.us(${expr})\n`;
                block += `${indent}except:\n`;
                block += `${indent}    pass\n`;
            });
            // check if break
            block += `${indent}if _ds.e():\n`;
            indent += "    "; // Increase indent for body
        } else {
            block += `${indent}_ds.us(True)\n`;
        }

        // Body head
        block += `${indent}_ds.sh("${fileName}", ${lineNum})\n`;

        // Watch expressions
        allWatches.forEach((expr) => {
            // Escape quotes in the expression key string if necessary
            const safeExprKey = expr.replace(/"/g, '\\"');
            block += `${indent}try:\n`;
            block += `${indent}    _ds.d["w"]["${safeExprKey}"] = str(${expr})\n`;
            block += `${indent}except Exception as _debug_e:\n`;
            block += `${indent}    _ds.d["w"]["${safeExprKey}"] = str(_debug_e)\n`;
        });

        // Body tail
        block += `${indent}_ds.st()\n`;

        return block;
    };

    // 2. Read Files
    const fileMap = new Map(); // fileName -> content string

    for (const name of pythonFileNames) {
        const fileHandle = await rootDir.getFileHandle(name);
        const file = await fileHandle.getFile();
        const content = await file.text();
        fileMap.set(name, content);
    }

    // Helper to get indentation of a line
    const getIndent = (line) => {
        const match = line.match(/^(\s*)/);
        return match ? match[1] : "";
    };

    // Storage for processed content
    const processedFiles = new Map();

    // Process files
    for (const fileName of pythonFileNames) {
        let originalContent = fileMap.get(fileName);
        let lines = originalContent.split(/\r?\n/);

        // We will build a map of insertions: lineNumber (0-based) -> string to insert before
        const insertions = new Map();

        const isDebugFile = debugFileNames.includes(fileName);

        // 6. Change Imports (Done via Regex on lines for simplicity, though AST is safer)
        // Applying to ALL pythonFileNames
        lines = lines.map((line) => {
            // Check for 'from module import ...'
            // Regex: from <module> import ...
            let fromMatch = line.match(/^(\s*)from\s+([a-zA-Z0-9_]+)\s+import/);
            if (fromMatch) {
                const modName = fromMatch[2];
                if (pythonFileNames.includes(modName + ".py")) {
                    return line.replace(`from ${modName}`, `from ${PREFIX}${modName}`);
                }
            }

            // Check for 'import module' or 'import module as alias'
            // Regex: import <module> [as ...]
            // Note: This is a simple regex and might miss complex multi-module imports like `import a, b`
            let importMatch = line.match(/^(\s*)import\s+([a-zA-Z0-9_]+)(\s+as\s+\w+)?$/);
            if (importMatch) {
                const modName = importMatch[2];
                const aliasPart = importMatch[3];
                if (pythonFileNames.includes(modName + ".py")) {
                    if (aliasPart) {
                        // import functions as fn -> import ide_debug_functions as fn
                        return line.replace(`import ${modName}`, `import ${PREFIX}${modName}`);
                    } else {
                        // import functions -> import ide_debug_functions as functions
                        return `${importMatch[1]}import ${PREFIX}${modName} as ${modName}`;
                    }
                }
            }
            return line;
        });

        // If we are debugging this file, run Tree-sitter and insert blocks
        if (isDebugFile) {
            // 3. Identify Code Rows via standalone AST function
            const codeRows = await identifyCodeRows(lines.join("\n"));
            console.log(codeRows);

            // 4. Identify Breakpoints
            // & 5. Add Debug Blocks
            // We iterate over the set of identified code rows
            const sortedRows = Array.from(codeRows).sort((a, b) => a - b);

            for (const row of sortedRows) {
                // Get the physical line content
                const lineContent = lines[row];

                // Skip if for some reason line is undefined (EOF edge cases)
                if (lineContent === undefined) continue;

                let isBreakpoint = false;

                // helper to check string
                const checkStr = (s) => {
                    const lower = s.toLowerCase();
                    const parts = lower.split("#");
                    if (parts.length > 1) {
                        const comment = parts[parts.length - 1].trim();
                        return comment === "●";
                    }
                    return false;
                };

                if (checkStr(lineContent)) {
                    isBreakpoint = true;
                }

                const indent = getIndent(lineContent);
                // Step 5: add debug block
                // row is 0-indexed, but prompt display uses 1-indexed for "line": X
                const displayLine = row + 1;

                const debugBlock = generateDebugBlock(indent, isBreakpoint, fileName, displayLine);

                insertions.set(row, debugBlock);
            }
        }

        // Reconstruct file content
        let finalContent = "";

        // 7. Add dependencies at beginning
        finalContent += "import ide_debug_state as _dbg\n";
        finalContent += "_ds = _dbg.DebugStates()\n";

        // 8. Add initial states (Specific to code.py or main.py)
        // Logic: If code.py exists, add to it. Else if main.py exists, add to it.
        // We need to know global existence.
        const hasCodePy = pythonFileNames.includes("code.py");

        let shouldAddInit = false;
        if (fileName === "code.py") shouldAddInit = true;
        else if (fileName === "main.py" && !hasCodePy) shouldAddInit = true;

        if (shouldAddInit) {
            finalContent += `print('${constants.DEBUG_START}')\n`;
        }

        // Merge lines and insertions
        for (let i = 0; i < lines.length; i++) {
            if (insertions.has(i)) {
                finalContent += insertions.get(i);
            }
            finalContent += lines[i] + "\n";
        }

        if (shouldAddInit) {
            finalContent += `print('${constants.DEBUG_END}')\n`;
        }

        processedFiles.set(fileName, finalContent);
    }

    // 9. Cleanup
    await cleanupDebugFiles(rootDir);

    // 10. Write to folder

    // Write state module
    const stateModuleContent = `""" Util lib for debugging """ 
try:
    from time import monotonic as _time_now
    time_unit = 1000
except ImportError:
    from time import ticks_ms as _time_now
    time_unit = 1
import gc
import json
from time import sleep

# private function
def _time():
    """ get current time in ms """
    return int(_time_now() * time_unit * 100) / 100

def _memory():
    """ get free memory """
    gc.collect()
    return gc.mem_free()

class DebugStates:
    _instance = None
    def __new__(cls, *args, **kwargs):
        # Check if an instance already exists
        if cls._instance is None:
            # If not, create the single instance
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """ self.s: finite state
        ${constants.DEBUG_SIGNAL_CO}: continue without out evaluate
        ${constants.DEBUG_SIGNAL_CW}: continue with out evaluate
        ${constants.DEBUG_SIGNAL_S}: halt, evaluate
        """
        self.t = _time() # time stamp
        self.s = "${constants.DEBUG_SIGNAL_S}" # stop on the first logical step
        self.d = {
            "t": _time(), # time since last pause
            "m": _memory(), # free memory
            "f": "", # current file name
            "l": 1, # current line number
            "w": {}, # watch expressions
            "h": False, # debugger halt
        } # data

    def sh(self, fileName, lineNum):
        """ step head """
        duration = _time() - self.t
        self.d = {
            "t": duration, # time since last pause
            "m": _memory(), # free memory
            "f": fileName, # current file name
            "l": lineNum, # current line number
            "w": {}, # watch expressions
            "h": False, # debugger halt
        }

    def e(self):
        """ should evaluate? """
        return not self.s == "${constants.DEBUG_SIGNAL_CO}"

    def us(self, condition):
        """ update state """
        if self.s == "${constants.DEBUG_SIGNAL_S}":
            return
        if condition:
            self.s = "${constants.DEBUG_SIGNAL_S}"

    def st(self):
        """ step tail """
        if self.s == "${constants.DEBUG_SIGNAL_CW}":
            self.d["h"] = False
            info = "${constants.DEBUG_OUT_START}" + json.dumps(self.d) + "${constants.DEBUG_OUT_END}"
            print(info, end="")
            sleep(len(info) * 0.001) # wait for the serial
        if self.s == "${constants.DEBUG_SIGNAL_S}":
            self.d["h"] = True
            info = "${constants.DEBUG_OUT_START}" + json.dumps(self.d) + "${constants.DEBUG_OUT_END}"
            signal = input(info)
            self.s = signal
        self.t = _time()
`;

    const stateFileHandle = await rootDir.getFileHandle(STATE_FILENAME, { create: true });
    const stateWriter = await stateFileHandle.createWritable();
    await stateWriter.write(stateModuleContent);
    await stateWriter.close();

    // Write modified python files
    for (const [name, content] of processedFiles) {
        const newName = PREFIX + name;
        const handle = await rootDir.getFileHandle(newName, { create: true });
        const writer = await handle.createWritable();
        await writer.write(content);
        await writer.close();
        await sleep(100);
    }
}


/**
 * Converts a number of bytes to a human-readable string.
 * @param {number} bytes - The number of bytes.
 * @param {number} decimals - How many decimal places to show (default 2).
 * @return {string} - The formatted string (e.g., "1.5 MB").
 */
function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return "0 B";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Exporting functions if used as a module
export { cleanupDebugFiles, getAllPythonFiles, instrumentCode, sleep, formatBytes, identifyCodeRows };
