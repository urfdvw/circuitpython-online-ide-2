import { useEffect } from "react";
import { getPythonSyntaxAnnotations } from "../utilFunctions/astUtils";

// How long to wait after the last keystroke before parsing
const DEBOUNCE_MS = 400;

/**
 * Live Python syntax checking for an ACE editor.
 *
 * Debounces edits, parses the buffer with tree-sitter, and shows syntax errors
 * as gutter annotations. Only active for python mode; JSON files are checked by
 * ACE's built-in json worker instead, and other modes are left untouched.
 *
 * @param {object|null} editor - the current ACE instance, including pop-out replacements
 * @param {string} text - current editor content
 * @param {string} mode - ACE mode of the open file ("python", "json", ...)
 */
export default function useSyntaxCheck(editor, text, mode) {
    useEffect(() => {
        if (mode !== "python") {
            // Drop anything an earlier python pass left on the session: ACE's json
            // worker owns the annotations in json mode, and other modes show none.
            editor?.session.clearAnnotations();
            return;
        }
        let cancelled = false;
        const timer = setTimeout(async () => {
            const annotations = await getPythonSyntaxAnnotations(text);
            if (cancelled) return;
            editor?.session.setAnnotations(annotations);
        }, DEBOUNCE_MS);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [editor, text, mode]);
}
