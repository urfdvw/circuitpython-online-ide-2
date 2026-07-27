// aceJsonWorker.js
//
// Teaches ACE where to find its bundled JSON worker, which is what puts syntax-error
// annotations on .json files (Python is handled separately by useSyntaxCheck).
//
// The worker is registered from a blob URL built out of the inlined worker source
// rather than a served file path, because the production build is a single HTML file
// (vite-plugin-singlefile) with no separate asset to fetch.
//
// Registered here at import time rather than from a component: it has to be in place
// before the first JSON editor mounts, and module bodies run before anything renders.
// Import this module for the side effect; it exports nothing.

import { config as aceConfig } from "ace-builds/src-noconflict/ace";
import jsonWorkerSource from "ace-builds/src-noconflict/worker-json?raw";

// Kept for the lifetime of the page: ACE re-reads the URL every time a JSON editor
// mounts, so it must not be revoked.
const workerUrl = URL.createObjectURL(new Blob([jsonWorkerSource], { type: "application/javascript" }));

aceConfig.setModuleUrl("ace/mode/json_worker", workerUrl);
