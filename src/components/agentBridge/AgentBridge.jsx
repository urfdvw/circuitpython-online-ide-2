// AgentBridge.jsx
//
// Mounts inside <AppContext.Provider>. Keeps the shared `store` in
// cpyAgentBridge.js pointing at the latest handles / serial instances, maintains
// the two serial buffers via registerReaderCallback, and attaches/detaches the
// window.__cpyAgent API based on the `enable_agent_bridge` General config flag.

import { useContext, useEffect, useState } from "react";
import Tooltip from "@mui/material/Tooltip";
import AppContext from "../../AppContext";
import { store, attachAgentBridge, detachAgentBridge } from "./cpyAgentBridge";
import AGENT_SYSTEM_PROMPT from "./systemPrompt.md";

const READER_ID = "agentBridge";

export default function AgentBridge() {
    const {
        appConfig,
        // files
        rootDirHandle,
        rootFolderDirectoryReady,
        // REPL serial
        serial,
        serialReady,
        sendDataToSerialPort,
        sendCode,
        sendCtrlC,
        sendCtrlD,
        // data serial
        dataSerial,
        dataSerialReady,
        sendToDataSerialPort,
        clearDataSerialOutput,
        // board
        boardInfo,
    } = useContext(AppContext);

    const enabled = Boolean(appConfig?.config?.general?.enable_agent_bridge);
    const [copied, setCopied] = useState(false);

    async function copyPrompt() {
        try {
            await navigator.clipboard.writeText(AGENT_SYSTEM_PROMPT);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (err) {
            console.error("[cpyAgent] failed to copy system prompt:", err);
        }
    }

    // Keep the shared store pointing at the latest references on every render.
    store.rootDirHandle = rootDirHandle;
    store.rootFolderReady = Boolean(rootFolderDirectoryReady);
    store.serial = serial;
    store.serialReady = Boolean(serialReady);
    store.sendDataToSerialPort = sendDataToSerialPort;
    store.sendCode = sendCode;
    store.sendCtrlC = sendCtrlC;
    store.sendCtrlD = sendCtrlD;
    store.dataSerial = dataSerial;
    store.dataSerialReady = Boolean(dataSerialReady);
    store.sendToDataSerialPort = sendToDataSerialPort;
    store.clearDataSerialOutput = clearDataSerialOutput;
    store.boardInfo = boardInfo;

    // Attach / detach window.__cpyAgent based on the config flag.
    useEffect(() => {
        if (enabled) {
            attachAgentBridge();
        } else {
            detachAgentBridge();
        }
        return () => detachAgentBridge();
    }, [enabled]);

    // Maintain the REPL serial buffer independently of React render timing, so
    // the agent can see every byte via getSerialSince(cursor).
    useEffect(() => {
        if (!enabled || !serial) return undefined;
        serial.registerReaderCallback(READER_ID, (chunk) => {
            store.replBuf += chunk;
        });
        return () => serial.unregisterReaderCallback(READER_ID);
    }, [enabled, serial]);

    // Maintain the data-channel buffer.
    useEffect(() => {
        if (!enabled || !dataSerial) return undefined;
        dataSerial.registerReaderCallback(READER_ID, (chunk) => {
            store.dataBuf += chunk;
        });
        return () => dataSerial.unregisterReaderCallback(READER_ID);
    }, [enabled, dataSerial]);

    if (!enabled) return null;

    // Hidden marker so Claude in Chrome can discover the bridge by reading the
    // DOM, plus a small clickable indicator for the user.
    return (
        <>
            <div data-cpy-agent-bridge="active" hidden />
            <Tooltip
                title={copied ? "Copied!" : "Click to copy the system prompt to clipboard"}
                placement="top"
                arrow
            >
                <div
                    onClick={copyPrompt}
                    style={{
                        position: "fixed",
                        bottom: 4,
                        right: 6,
                        zIndex: 9999,
                        fontSize: 10,
                        lineHeight: "14px",
                        padding: "1px 6px",
                        borderRadius: 6,
                        background: copied ? "rgba(40, 110, 200, 0.9)" : "rgba(60, 130, 90, 0.85)",
                        color: "white",
                        cursor: "pointer",
                        userSelect: "none",
                    }}
                >
                    {copied ? "Prompt copied!" : "Agent bridge: ON"}
                </div>
            </Tooltip>
        </>
    );
}
