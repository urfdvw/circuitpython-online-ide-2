import home from "./Home.md";
import quick_start from "./Quick start.md";
import layout from "./Layout.md";
import folder_view from "./Folder View.md";
import editor from "./Editor.md";
import serial_console from "./Serial Console.md";
import settings from "./Settings.md";
import plot from "./Plot.md";
import backup from "./Backup.md";
import camera from "./Camera.md";
import use_without_internet from "./Use without Internet.md";
import about from "./About.md";
import feedback_and_code_contribution from "./Feedback and Code Contribution.md";
import version_history from "./Version history.md";
import troubleshooting from "./Troubleshooting.md";
import related_projects from "./Related projects.md";
import lib_management from "./Lib Management.md";
import debugger_help from "./Debugger.md";

// `kind` controls where a doc appears:
//   - "tool":      shown in the Help tab (only its "## How to Use" section) and in the
//                  full documentation page (#/docs).
//   - "reference": shown only in the full documentation page (#/docs).
const docs = [
    {
        name: "home",
        title: "Home",
        body: home,
        kind: "reference",
    },
    {
        name: "quick_start",
        title: "Quick start",
        body: quick_start,
        kind: "tool",
    },
    {
        name: "layout",
        title: "Layout",
        body: layout,
        kind: "reference",
    },
    {
        name: "folder_view",
        title: "Folder View",
        body: folder_view,
        kind: "tool",
    },
    {
        name: "editor",
        title: "Editor",
        body: editor,
        kind: "tool",
    },
    {
        name: "serial_console",
        title: "Serial Console",
        body: serial_console,
        kind: "tool",
    },
    {
        name: "settings",
        title: "Settings",
        body: settings,
        kind: "tool",
    },
    {
        name: "plot",
        title: "Plot",
        body: plot,
        kind: "tool",
    },
    {
        name: "lib_management",
        title: "Library Management",
        body: lib_management,
        kind: "tool",
    },
    {
        name: "debugger",
        title: "Debugger",
        body: debugger_help,
        kind: "tool",
    },
    {
        name: "camera",
        title: "Camera",
        body: camera,
        kind: "tool",
    },
    {
        name: "backup",
        title: "Backup",
        body: backup,
        kind: "tool",
    },
    {
        name: "use_without_internet",
        title: "Use without Internet",
        body: use_without_internet,
        kind: "reference",
    },
    {
        name: "feedback_and_code_contribution",
        title: "Feedback",
        body: feedback_and_code_contribution,
        kind: "reference",
    },
    {
        name: "troubleshooting",
        title: "Troubleshooting",
        body: troubleshooting,
        kind: "reference",
    },
    {
        name: "about",
        title: "About",
        body: about,
        kind: "reference",
    },
    {
        name: "version_history",
        title: "Version history",
        body: version_history,
        kind: "reference",
    },
    {
        name: "related_projects",
        title: "Related projects",
        body: related_projects,
        kind: "reference",
    },
];

// Docs shown in the Help tab: tool docs only (the Help tab renders just their
// "## How to Use" section). Exported so the Help tab and its tab-selection state
// stay indexed against the same list.
export const helpDocs = docs.filter((doc) => doc.kind === "tool");

export default docs;
