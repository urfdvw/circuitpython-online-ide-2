// AgentDialog.jsx
//
// Renders the active agent-bridge decision request (agentDecision.js) as a
// floating card above the bridge indicator. Deliberately NOT a MUI Dialog:
// there is no backdrop and no focus trap, so the user can keep using the IDE
// (e.g. open the Camera tab) while the card is up.

import { useEffect, useState } from "react";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { subscribe, getActive, resolveActive, rejectAll } from "./agentDecision";

export default function AgentDialog() {
    const [request, setRequest] = useState(getActive);

    useEffect(() => {
        const unsubscribe = subscribe(setRequest);
        return () => {
            unsubscribe();
            // Bridge disabled while a request is pending: resolve everything
            // as rejected so awaiting agent calls terminate.
            rejectAll();
        };
    }, []);

    if (!request) return null;

    return (
        <Paper
            elevation={6}
            sx={{ position: "fixed", bottom: 28, right: 8, zIndex: 10000, p: 1.5, maxWidth: 340 }}
        >
            <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                {request.title}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, mb: 1.5 }}>
                {request.message}
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button size="small" onClick={() => resolveActive(false)}>
                    {request.rejectLabel}
                </Button>
                <Button size="small" variant="contained" onClick={() => resolveActive(true)}>
                    {request.confirmLabel}
                </Button>
            </Stack>
        </Paper>
    );
}
