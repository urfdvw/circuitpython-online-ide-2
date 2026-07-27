// aceJsonWorker.js
//
// Teaches ACE where to find its bundled JSON worker, which is what puts syntax-error
// annotations on .json files (Python is handled separately by useSyntaxCheck).
//
// The worker is registered from a blob URL built out of the inlined worker source
// rather than a served file path, because the production build is a single HTML file
// (vite-plugin-singlefile) with no separate asset to fetch.

import { config as aceConfig } from "ace-builds/src-noconflict/ace";
import jsonWorkerSource from "ace-builds/src-noconflict/worker-json?raw";

let workerUrl = null;

/**
 * Point ACE at the JSON worker. Idempotent: the blob URL is created at most once and
 * then intentionally kept for the lifetime of the page, since ACE re-reads it every
 * time a JSON editor mounts. Safe to call from a component body.
 */
export function registerAceJsonWorker() {
    if (workerUrl) return;
    workerUrl = URL.createObjectURL(new Blob([jsonWorkerSource], { type: "application/javascript" }));
    aceConfig.setModuleUrl("ace/mode/json_worker", workerUrl);
}
