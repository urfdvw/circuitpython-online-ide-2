// Web Worker for the ACE Editor support for linting
// see IdeEditor.jsx
import { ServiceManager } from "ace-linters/build/service-manager";

let manager = new ServiceManager(self);

manager.registerService("python", {
    module: () => import("ace-python-ruff-linter/build/python-service"),
    className: "PythonService",
    modes: "python",
});

manager.registerService("json", {
    features: {signatureHelp: false, documentHighlight: false},
    module: () => import("ace-linters/build/json-service"),
    className: "JsonService",
    modes: "json",
});