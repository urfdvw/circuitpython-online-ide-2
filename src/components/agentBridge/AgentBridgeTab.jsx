// AgentBridgeTab.jsx
//
// "Agent Bridge" tab (opened from the Tools menu). Shows the Agent Bridge help
// info, a button to toggle the bridge on/off, and a button to copy the system
// prompt (single source of truth) to the clipboard.

import { useContext, useState } from "react";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AppContext from "../../AppContext";
import MarkdownExtended from "../../utilComponents/MarkdownExtended";
import agentBridgeDoc from "./Agent Bridge.md";
import AGENT_SYSTEM_PROMPT from "./systemPrompt.md";

// Split the doc into the main body and the "## Appendix:" section so the
// appendix can be rendered as a collapsible accordion.
const APPENDIX_INDEX = agentBridgeDoc.indexOf("## Appendix:");
const MAIN_DOC = APPENDIX_INDEX === -1 ? agentBridgeDoc : agentBridgeDoc.slice(0, APPENDIX_INDEX).trimEnd();
const APPENDIX_TITLE =
    APPENDIX_INDEX === -1 ? "" : agentBridgeDoc.slice(APPENDIX_INDEX).split("\n", 1)[0].replace(/^#+\s*/, "");
const APPENDIX_BODY =
    APPENDIX_INDEX === -1 ? "" : agentBridgeDoc.slice(APPENDIX_INDEX).split("\n").slice(1).join("\n").trim();

export default function AgentBridgeTab() {
    const { appConfig } = useContext(AppContext);
    const [copied, setCopied] = useState(false);

    const enabled = Boolean(appConfig?.config?.general?.enable_agent_bridge);

    function toggleBridge() {
        appConfig.setConfigField("general", "enable_agent_bridge", !enabled);
    }

    async function copyPrompt() {
        try {
            await navigator.clipboard.writeText(AGENT_SYSTEM_PROMPT);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (err) {
            console.error("[cpyAgent] failed to copy system prompt:", err);
        }
    }

    return (
        <div style={{ height: "100%", width: "100%", overflow: "auto", padding: "16px 24px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                <Tooltip
                    title={enabled ? "Disable window.__cpyAgent" : "Enable window.__cpyAgent"}
                    placement="bottom"
                    arrow
                >
                    <Button variant="contained" color={enabled ? "success" : "inherit"} onClick={toggleBridge}>
                        {enabled ? "Agent Bridge: ON" : "Agent Bridge: OFF"}
                    </Button>
                </Tooltip>
                <Tooltip title="Copy the agent system prompt to the clipboard" placement="bottom" arrow>
                    <Button variant="contained" onClick={copyPrompt}>
                        {copied ? "Copied!" : "Copy System Prompt"}
                    </Button>
                </Tooltip>
            </div>
            <MarkdownExtended>{MAIN_DOC}</MarkdownExtended>
            {APPENDIX_BODY && (
                <Accordion disableGutters sx={{ mt: 2 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ fontWeight: 600 }}>{APPENDIX_TITLE}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <MarkdownExtended>{APPENDIX_BODY}</MarkdownExtended>
                    </AccordionDetails>
                </Accordion>
            )}
        </div>
    );
}
