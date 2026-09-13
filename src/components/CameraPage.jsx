import { useEffect, useRef, useState } from "react";
import { Box, Typography, CircularProgress, Button } from "@mui/material";

export default function CameraPage() {
    const idePeerId = new URLSearchParams(
        window.location.hash.split("?")[1] ?? ""
    ).get("token");

    const [status, setStatus] = useState("init"); // 'init' | 'connecting' | 'connected' | 'stopped' | 'error'
    const [errorMsg, setErrorMsg] = useState("");
    const stopRef = useRef(() => {});

    function handleStop() {
        stopRef.current();
        setStatus("stopped");
    }

    useEffect(() => {
        let cancelled = false;
        let stream;
        let peer;
        let wakeLock;
        const stop = () => {
            cancelled = true;
            stream?.getTracks().forEach((track) => track.stop());
            peer?.destroy();
            wakeLock?.release().catch(() => {});
        };
        stopRef.current = stop;
        const fail = (error) => {
            if (cancelled) return;
            setStatus("error");
            setErrorMsg(error.message);
            stop();
        };

        async function init() {
            try {
                if (!idePeerId) throw new Error("This camera link is missing its connection token.");
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
                    audio: false,
                });
                // Permission prompts and module loading can finish after the page closes.
                if (cancelled) { stop(); return; }
                const { Peer } = await import("peerjs");
                if (cancelled) { stop(); return; }
                peer = new Peer();
                peer.on("open", () => {
                    if (cancelled) return;
                    setStatus("connecting");
                    const call = peer.call(idePeerId, stream);
                    if (!call) { fail(new Error("Could not start the camera connection.")); return; }
                    call.on("stream", () => {
                        if (cancelled) return;
                        setStatus("connected");
                        call.peerConnection?.getSenders().forEach((sender) => {
                            if (sender.track?.kind !== "video") return;
                            const params = sender.getParameters();
                            if (params.encodings?.length) params.encodings[0].maxBitrate = 2500000;
                            sender.setParameters(params).catch((error) => console.warn("Could not set camera bitrate:", error));
                        });
                    });
                    call.on("close", () => {
                        if (cancelled) return;
                        setStatus("stopped");
                        stop();
                    });
                    call.on("error", fail);
                });
                peer.on("error", fail);
            } catch (error) {
                fail(error);
            }
        }
        init();
        if ("wakeLock" in navigator) {
            navigator.wakeLock.request("screen").then((lock) => {
                wakeLock = lock;
                if (cancelled) lock.release().catch(() => {});
            }).catch(() => {});
        }
        return stop;
    }, [idePeerId]);

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
                    <Button variant="outlined" color="error" onClick={handleStop}>
                        Stop
                    </Button>
                </>
            )}
            {status === "connected" && (
                <>
                    <Typography variant="h5" sx={{ color: "#4caf50" }}>
                        Connected
                    </Typography>
                    <Button variant="outlined" color="error" onClick={handleStop}>
                        Stop
                    </Button>
                </>
            )}
            {status === "stopped" && (
                <Typography variant="h6" sx={{ color: "#888" }}>
                    Camera stopped
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
