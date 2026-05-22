import { useEffect, useRef, useState } from "react";
import { Box, Typography, CircularProgress, Button } from "@mui/material";

export default function CameraPage() {
    const idePeerId = new URLSearchParams(
        window.location.hash.split("?")[1] ?? ""
    ).get("token");

    const [status, setStatus] = useState("init"); // 'init' | 'connecting' | 'connected' | 'stopped' | 'error'
    const [errorMsg, setErrorMsg] = useState("");
    const peerRef = useRef(null);
    const streamRef = useRef(null);
    const wakeLockRef = useRef(null);

    function handleStop() {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        peerRef.current?.destroy();
        setStatus("stopped");
    }

    useEffect(() => {
        let cancelled = false;

        async function init() {
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: "environment" },
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                    },
                    audio: false,
                });
                streamRef.current = stream;
                const s = stream.getVideoTracks()[0]?.getSettings();
                if (s && (s.width < 1920 || s.height < 1080)) {
                    console.log(`[Phone camera quality] Requested 1920x1080, got ${s.width}x${s.height}`);
                }
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
                        if (!cancelled) {
                            setStatus("connected");
                            // Increase bitrate for better quality
                            call.peerConnection?.getSenders().forEach((sender) => {
                                if (sender.track?.kind === "video") {
                                    const params = sender.getParameters();
                                    if (params.encodings?.length > 0) {
                                        params.encodings[0].maxBitrate = 2500000;
                                    }
                                    sender.setParameters(params).catch((err) => {
                                        console.log(`[Phone camera quality] Could not set bitrate: ${err.message}`);
                                    });
                                }
                            });
                        }
                    });
                    call.on("close", () => {
                        if (!cancelled) setStatus("stopped");
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
