// context
import { useContext } from "react";
import AppContext from "../AppContext";
// UI
import { Box, Button } from "@mui/material";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import TabedPages from "../utilComponents/TabedPages";
import MarkdownExtended from "../utilComponents/MarkdownExtended";
// data
import { helpDocs } from "../docs";
import { extractSection } from "../utilFunctions/extractMarkdownSection";

export default function Help() {
    const { helpTabSelection } = useContext(AppContext);

    function openFullDocs(name) {
        // The #/docs route replaces the whole app view, so open it in a new browser
        // tab to keep the current IDE session. Deep-link to this doc's page.
        window.open(window.location.pathname + window.location.search + "#/docs/" + name, "_blank");
    }

    return (
        <TabedPages
            pages={helpDocs.map((doc) => {
                return {
                    ...doc,
                    body: (
                        <>
                            <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
                                <Button
                                    size="small"
                                    startIcon={<MenuBookIcon />}
                                    onClick={() => openFullDocs(doc.name)}
                                    sx={{ textTransform: "none" }}
                                >
                                    Open full documentation
                                </Button>
                            </Box>
                            <MarkdownExtended>{extractSection(doc.body, "How to Use", false)}</MarkdownExtended>
                        </>
                    ),
                };
            })}
            tabValue={helpTabSelection.tabValue}
            setTabValue={helpTabSelection.setTabValue}
        />
    );
}
