import { useEffect, useRef, useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";

export default function CameraPage() {
    const idePeerId = new URLSearchParams(
        window.location.hash.split("?")[1] ?? ""
    ).get("token");

    const [status, setStatus] = useState("init"); // 'init' | 'connecting' | 'connected' | 'error'
    const [errorMsg, setErrorMsg] = useState("");
    const peerRef = useRef(null);
    const streamRef = useRef(null);
    const wakeLockRef = useRef(null);

    useEffect(() => {
        let cancelled = false;

        async function init() {
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: "environment" } },
                    audio: false,
                });
                streamRef.current = stream;
            } catch (err) {
                if (!cancelled) {
                    setStatus("error");
                    setErrorMsg("Camera denied: " + err.message);
                }
                return;
            }

            const { Peer } = await import("peerjs");
            const peer = new Peer();
            peerRef.current = peer;

            peer.on("open", () => {
                if (!cancelled) {
                    setStatus("connecting");
                    const call = peer.call(idePeerId, stream);
                    call.on("stream", () => {
                        if (!cancelled) setStatus("connected");
                    });
                    call.on("close", () => {
                        if (!cancelled) setStatus("init");
                    });
                    call.on("error", (err) => {
                        if (!cancelled) {
                            setStatus("error");
                            setErrorMsg(err.message);
                        }
                    });
                }
            });

            peer.on("error", (err) => {
                if (!cancelled) {
                    setStatus("error");
                    setErrorMsg(err.message);
                }
            });
        }

        init();

        if ("wakeLock" in navigator) {
            navigator.wakeLock
                .request("screen")
                .then((lock) => {
                    wakeLockRef.current = lock;
                })
                .catch(() => {});
        }

        return () => {
            cancelled = true;
            streamRef.current?.getTracks().forEach((t) => t.stop());
            peerRef.current?.destroy();
            wakeLockRef.current?.release().catch(() => {});
        };
    }, []);

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#111",
                color: "#fff",
                padding: 3,
                gap: 2,
                textAlign: "center",
            }}
        >
            {status === "init" && (
                <>
                    <CircularProgress color="inherit" />
                    <Typography>Starting camera...</Typography>
                </>
            )}
            {status === "connecting" && (
                <>
                    <CircularProgress color="inherit" />
                    <Typography>Connecting to IDE...</Typography>
                </>
            )}
            {status === "connected" && (
                <Typography variant="h5" sx={{ color: "#4caf50" }}>
                    Connected
                </Typography>
            )}
            {status === "error" && (
                <Typography color="error" variant="h6">
                    {errorMsg}
                </Typography>
            )}
        </Box>
    );
}
