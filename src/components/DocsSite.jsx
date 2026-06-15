import { useEffect, useState } from "react";
import { Box, List, ListItemButton, ListItemText, ListSubheader, Typography, Divider } from "@mui/material";
import DarkTheme from "react-lazy-dark-theme";
import MarkdownExtended from "../utilComponents/MarkdownExtended";
import docs, { docGroups } from "../docs";
import { useConfig } from "../utilComponents/react-user-config";
import schemas from "../configs";

// Standalone, full documentation page rendered at the `#/docs` hash route.
// Shows every doc (tool + reference) with a sidebar; the Help tab inside the IDE
// only shows the trimmed "How to Use" section of tool docs.

function nameFromHash() {
    // `#/docs/plot` -> "plot", `#/docs` -> "" , also strips any `?query`.
    const name = window.location.hash.replace(/^#\/docs\/?/, "").split("?")[0];
    return docs.some((doc) => doc.name === name) ? name : docs[0].name;
}

export default function DocsSite() {
    const [selected, setSelected] = useState(nameFromHash);

    // Follow the same theme setting as the IDE (shared via localStorage). The page
    // is light by default; <DarkTheme> inverts it to match the user's preference.
    const appConfig = useConfig(schemas);
    let dark = null; // null => follow the OS theme ("system")
    if (appConfig.ready) {
        if (appConfig.config.general.theme === "light") {
            dark = false;
        } else if (appConfig.config.general.theme === "dark") {
            dark = true;
        }
    }

    // Keep the selection in sync with the hash (back/forward, deep links).
    useEffect(() => {
        const onHashChange = () => setSelected(nameFromHash());
        window.addEventListener("hashchange", onHashChange);
        return () => window.removeEventListener("hashchange", onHashChange);
    }, []);

    const currentDoc = docs.find((doc) => doc.name === selected) ?? docs[0];

    useEffect(() => {
        document.title = "Docs · " + currentDoc.title + " · CircuitPython Online IDE";
    }, [currentDoc]);

    function openDoc(name) {
        window.location.hash = "#/docs/" + name;
        setSelected(name);
    }

    const groups = docGroups
        .map((group) => ({ title: group.title, items: docs.filter((doc) => doc.group === group.key) }))
        .filter((group) => group.items.length > 0);

    return (
        <Box sx={{ display: "flex", height: "100vh", overflow: "hidden", backgroundColor: "#fff" }}>
            <DarkTheme dark={dark} />
            <Box
                component="nav"
                sx={{
                    width: 280,
                    flexShrink: 0,
                    borderRight: 1,
                    borderColor: "divider",
                    overflowY: "auto",
                    backgroundColor: "#fafafa",
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Documentation
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        CircuitPython Online IDE
                    </Typography>
                </Box>
                <Divider />
                {groups.map((group) => (
                    <List
                        key={group.title}
                        dense
                        subheader={<ListSubheader sx={{ backgroundColor: "transparent" }}>{group.title}</ListSubheader>}
                    >
                        {group.items.map((doc) => (
                            <ListItemButton
                                key={doc.name}
                                selected={doc.name === selected}
                                onClick={() => openDoc(doc.name)}
                            >
                                <ListItemText primary={doc.title} />
                            </ListItemButton>
                        ))}
                    </List>
                ))}
            </Box>
            <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
                <Box sx={{ maxWidth: 820, mx: "auto", px: 4, py: 3 }}>
                    <MarkdownExtended>{currentDoc.body}</MarkdownExtended>
                </Box>
            </Box>
        </Box>
    );
}
