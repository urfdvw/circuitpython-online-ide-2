import { createRoot } from "react-dom/client";
import IdeEditor from "../../src/components/IdeEditor";
import AppContext from "../../src/AppContext";

window.TREE_SITTER_PYTHON_WASM_URL = "/tree-sitter-python.wasm";
const state = { errors: [], saved: [], popup: null };
window.editorReview = state;
window.addEventListener("error", (event) => state.errors.push(event.message));
window.addEventListener("unhandledrejection", (event) => state.errors.push(String(event.reason)));
window.alert = (message) => state.errors.push(String(message));
const file = {
    name: "code.py", fullPath: "/code.py",
    getFile: async () => new File(['print("original")\n'], "code.py"),
    createWritable: async () => ({ write: async (value) => state.saved.push(value), close: async () => {} }),
};
const model = { doAction() {} };
const node = { getConfig: () => ({ fileKey: "test" }), getRect: () => ({ height: 600 }),
    getModel: () => model, getId: () => "test" };
const noop = () => {};
const context = {
    appConfig: { config: { editor: { newline_mode: "unix", font: 12, live_autocompletion: false } } },
    fileLookUp: { test: file }, setFileDirty: noop, clearFileDirty: noop,
    setInstrumentationOutdated: noop, autoWatchFiles: false, sendCode: noop, sendCtrlC: noop, sendCtrlD: noop,
};
const open = window.open.bind(window);
window.open = (...args) => { state.popup = open(...args); return state.popup; };
createRoot(document.getElementById("root")).render(
    <AppContext.Provider value={context}><IdeEditor node={node} /></AppContext.Provider>
);
