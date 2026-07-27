import { Parser, Language } from "web-tree-sitter";
// Vite: import wasm as URL so dev server serves it with correct MIME type
import wasmUrl from "web-tree-sitter/tree-sitter.wasm?url";

async function createParser() {
    // Load the Python language grammar (tree-sitter compiled WASM) from either:
    // 1) `tree-sitter-python.wasm` in the `public/` folder (served at `/tree-sitter-python.wasm`), or
    // 2) `window.TREE_SITTER_PYTHON_WASM_URL` pointing to a hosted copy.
    // On any failure this resolves to undefined (never rejects) so callers can skip parsing.
    try {
        // Initialize Tree-sitter, locate wasm via Vite-served URL to ensure correct MIME
        await Parser.init({ locateFile: () => wasmUrl });
        const parser = new Parser();

        const globalWasmUrl = typeof window !== "undefined" && window.TREE_SITTER_PYTHON_WASM_URL;
        const languageUrl = globalWasmUrl || "./tree-sitter-python.wasm";
        const response = await fetch(languageUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} fetching ${languageUrl}`);
        }
        // Pass bytes rather than the URL: Language.load(url) does its own node-vs-browser
        // detection that crashes under the vite dev server when a partial `process`
        // global exists (it reads process.versions.node unguarded).
        const Python = await Language.load(new Uint8Array(await response.arrayBuffer()));

        parser.setLanguage(Python);
        return parser;
    } catch (e) {
        // Don't throw here; log a helpful message and gracefully return so the UI does not crash.
        // The calling code (UI) can show an error to the user if desired.
        console.warn(
            "Tree-sitter Python parser unavailable. To enable Python AST parsing, add a compiled `tree-sitter-python.wasm` to the `public/` folder (served at `/tree-sitter-python.wasm`), or set `window.TREE_SITTER_PYTHON_WASM_URL` to a hosted copy. Syntax checking and instrumentation will be skipped.",
            e
        );
        return undefined;
    }
}

// Single shared parser: Parser.init and the language wasm fetch must run only once,
// even if the first call resolved to undefined (missing wasm) — don't re-fetch per edit.
let parserPromise = null;

async function getParser() {
    if (!parserPromise) {
        parserPromise = createParser();
    }
    return parserPromise;
}

/**
 * Parses Python source and returns ACE editor annotations for syntax errors
 * (tree-sitter ERROR and "missing" nodes), one per row.
 * Returns [] when the code parses cleanly or the parser is unavailable.
 */
async function getPythonSyntaxAnnotations(codeText) {
    const parser = await getParser();
    if (!parser) return [];

    const tree = parser.parse(codeText);
    if (!tree) return [];
    try {
        if (!tree.rootNode.hasError) return [];

        const annotations = [];
        const seenRows = new Set();

        const traverse = (node) => {
            if (!node || !node.hasError) return;

            if (node.isError || node.isMissing) {
                const row = node.startPosition.row;
                if (!seenRows.has(row)) {
                    seenRows.add(row);
                    annotations.push({
                        row,
                        column: node.startPosition.column,
                        type: "error",
                        text: node.isMissing ? `Syntax error: missing "${node.type}"` : "Syntax error",
                    });
                }
                // An ERROR node's children are unparseable fragments; no finer detail inside
                if (node.isError) return;
            }

            for (let i = 0; i < node.childCount; i++) {
                traverse(node.child(i));
            }
        };

        traverse(tree.rootNode);
        return annotations;
    } finally {
        tree.delete();
    }
}

export { getParser, getPythonSyntaxAnnotations };
