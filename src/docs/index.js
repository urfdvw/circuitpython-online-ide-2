import home from "./Home.md";
import getting_started from "./Getting Started.md";
import layout from "./Layout.md";
import folder_view from "./Folder View.md";
import editor from "./Editor.md";
import serial_console from "./Serial Console.md";
import data_serial from "./Data Serial.md";
import settings from "./Settings.md";
import plot from "./Plot.md";
import backup from "./Backup.md";
import camera from "./Camera.md";
import use_without_internet from "./Use without Internet.md";
import feedback_and_code_contribution from "./Feedback and Code Contribution.md";
import version_history from "./Version history.md";
import troubleshooting from "./Troubleshooting.md";
import related_projects from "./Related projects.md";
import lib_management from "./Lib Management.md";
import debugger_help from "./Debugger.md";
import widgets from "./Widgets.md";
import agent_bridge from "../components/agentBridge/Agent Bridge.md";
import { version } from "../../package.json";

// `kind` controls whether a doc appears in the Help tab:
//   - "tool":      shown in the Help tab (its "## How to Use" section, or the full
//                  body when it has none) and in the full documentation page (#/docs).
//   - "reference": shown only in the full documentation page (#/docs).
// `group` controls which sidebar section the doc lands in on the full documentation
// page, and the order of the array controls the order within each section. The
// sidebar renders the groups in `docGroups` order; the feature groups mirror the
// grouping on the Home page.
const docs = [
    {
        name: "home",
        title: "Home",
        body: home.replace("{{version}}", version),
        kind: "reference",
        group: "start",
    },
    {
        name: "quick_start",
        title: "Getting Started",
        body: getting_started,
        kind: "tool",
        group: "start",
    },
    {
        name: "layout",
        title: "Layout",
        body: layout,
        kind: "tool",
        group: "start",
    },
    {
        name: "folder_view",
        title: "Folder View",
        body: folder_view,
        kind: "tool",
        group: "essential",
    },
    {
        name: "editor",
        title: "Editor",
        body: editor,
        kind: "tool",
        group: "essential",
    },
    {
        name: "serial_console",
        title: "Serial Console",
        body: serial_console,
        kind: "tool",
        group: "essential",
    },
    {
        name: "lib_management",
        title: "Library Management",
        body: lib_management,
        kind: "tool",
        group: "assist",
    },
    {
        name: "debugger",
        title: "Debugger",
        body: debugger_help,
        kind: "tool",
        group: "assist",
    },
    {
        // "reference" keeps this off the in-IDE Help tab (the Agent Bridge tab
        // already shows it) while still listing it on the full documentation page.
        name: "agent_bridge",
        title: "AI Agent Bridge",
        body: agent_bridge,
        kind: "reference",
        group: "assist",
    },
    {
        name: "plot",
        title: "Plot",
        body: plot,
        kind: "tool",
        group: "helper",
    },
    {
        name: "data_serial",
        title: "Data Serial",
        body: data_serial,
        kind: "tool",
        group: "helper",
    },
    {
        name: "widgets",
        title: "Connected Variable Widgets",
        body: widgets,
        kind: "tool",
        group: "helper",
    },
    {
        name: "camera",
        title: "Camera",
        body: camera,
        kind: "tool",
        group: "helper",
    },
    {
        name: "backup",
        title: "Backup",
        body: backup,
        kind: "tool",
        group: "helper",
    },
    {
        name: "settings",
        title: "Settings",
        body: settings,
        kind: "tool",
        group: "reference",
    },
    {
        name: "use_without_internet",
        title: "Use without Internet",
        body: use_without_internet,
        kind: "reference",
        group: "reference",
    },
    {
        name: "feedback_and_code_contribution",
        title: "Feedback",
        body: feedback_and_code_contribution,
        kind: "reference",
        group: "reference",
    },
    {
        name: "troubleshooting",
        title: "Troubleshooting",
        body: troubleshooting,
        kind: "reference",
        group: "reference",
    },
    {
        name: "version_history",
        title: "Version history",
        body: version_history,
        kind: "reference",
        group: "reference",
    },
    {
        name: "related_projects",
        title: "Related projects",
        body: related_projects,
        kind: "reference",
        group: "reference",
    },
];

// Sidebar sections for the full documentation page, rendered in this order. The
// items within each section follow the order of the `docs` array above.
export const docGroups = [
    { key: "start", title: "Introduction" },
    { key: "essential", title: "Essential coding tools" },
    { key: "assist", title: "Coding assistance" },
    { key: "helper", title: "Helpful tools" },
    { key: "reference", title: "Reference" },
];

// Docs shown in the Help tab: tool docs only (the Help tab renders just their
// "## How to Use" section). Exported so the Help tab and its tab-selection state
// stay indexed against the same list.
export const helpDocs = docs.filter((doc) => doc.kind === "tool");

export default docs;
