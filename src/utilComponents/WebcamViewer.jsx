import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const WebcamViewer = ({
    rotation = 0,
    flipH = false,
    flipV = false,
    selectedDeviceId = undefined,
    setDeviceIdList = () => {},
    marking = false,
    markColor = "rgba(255, 50, 50, 0.9)",
    clearMarksTrigger = 0,
    resetViewTrigger = 0,
    paused = false,
    captureTrigger = 0,
    onCaptureResult = () => {},
    externalStream = null,
}) => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const transformRef = useRef(null);
    const containerRef = useRef(null);
    const externalVideoRef = useRef(null);
    const isDrawingRef = useRef(false);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const pausedFrameRef = useRef(null);
    const [videoDeviceId, setVideoDeviceId] = useState(undefined);
    const [pausedFrameUrl, setPausedFrameUrl] = useState(null);

    const transformStyle = `
    rotate(${rotation}deg)
    scaleX(${flipH ? -1 : 1})
    scaleY(${flipV ? -1 : 1})
  `;

    useEffect(() => {
        let previousDevices = [];

        const updateDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = devices
                    .filter((d) => d.kind === "videoinput")
                    .map((d) => ({
                        deviceId: d.deviceId,
                        label: d.label || "Camera", // fallback for privacy-restricted labels
                    }));

                const changed =
                    videoInputs.length !== previousDevices.length ||
                    videoInputs.some(
                        (dev, i) =>
                            dev.deviceId !== previousDevices[i]?.deviceId || dev.label !== previousDevices[i]?.label
                    );

                if (changed) {
                    previousDevices = videoInputs;
                    setDeviceIdList(videoInputs);
                }
            } catch (err) {
                console.warn("Could not enumerate devices:", err);
            }
        };

        updateDevices();

        navigator.mediaDevices.addEventListener("devicechange", updateDevices);
        const intervalId = setInterval(updateDevices, 2000);

        return () => {
            navigator.mediaDevices.removeEventListener("devicechange", updateDevices);
            clearInterval(intervalId);
        };
    }, [setDeviceIdList]);

    // Update internal videoDeviceId when selectedDeviceId changes
    useEffect(() => {
        setVideoDeviceId(selectedDeviceId);
    }, [selectedDeviceId]);

    // Clear canvas when triggered
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, [clearMarksTrigger]);

    // Reset zoom/pan so the video fits the tab area again
    useEffect(() => {
        if (resetViewTrigger === 0) return;
        transformRef.current?.resetTransform();
    }, [resetViewTrigger]);

    // Attach external stream to video element
    useEffect(() => {
        const el = externalVideoRef.current;
        if (!el || !externalStream) return;
        el.srcObject = externalStream;
        el.play().catch(() => {});
    }, [externalStream]);

    // Pause/resume the displayed video (the MediaStream keeps running, so resume is instant)
    useEffect(() => {
        const video = externalStream ? externalVideoRef.current : webcamRef.current?.video;
        if (!video) return;
        if (paused) {
            // Snapshot the frame before pausing: a paused MediaStream video can go
            // black on any later repaint or canvas draw, so both the frozen display
            // and capture use this snapshot instead of the video element.
            if (video.videoWidth && video.videoHeight) {
                const frame = document.createElement("canvas");
                frame.width = video.videoWidth;
                frame.height = video.videoHeight;
                frame.getContext("2d").drawImage(video, 0, 0);
                pausedFrameRef.current = frame;
                setPausedFrameUrl(frame.toDataURL("image/png"));
            }
            video.pause();
        } else {
            pausedFrameRef.current = null;
            setPausedFrameUrl(null);
            video.play().catch(() => {});
        }
    }, [paused, externalStream, videoDeviceId]);

    // Capture the full frame (video + marks) to the clipboard when triggered
    useEffect(() => {
        if (captureTrigger === 0) return;
        const video = externalStream ? externalVideoRef.current : webcamRef.current?.video;
        const container = containerRef.current;
        // While paused, draw from the snapshot taken at pause time (a paused
        // MediaStream video draws black on some browsers)
        const source = paused && pausedFrameRef.current ? pausedFrameRef.current : video;
        const srcWidth = source === video ? video?.videoWidth : source.width;
        const srcHeight = source === video ? video?.videoHeight : source.height;
        if (!source || !container || !srcWidth || !srcHeight) {
            onCaptureResult(false, "No video frame available to capture");
            return;
        }

        const w = container.clientWidth;
        const h = container.clientHeight;
        const scale = window.devicePixelRatio || 1;
        const capture = document.createElement("canvas");
        capture.width = w * scale;
        capture.height = h * scale;
        const ctx = capture.getContext("2d");
        ctx.scale(scale, scale);

        // Source crop matching the on-screen object-fit: cover
        const videoAspect = srcWidth / srcHeight;
        const containerAspect = w / h;
        let sx = 0,
            sy = 0,
            sw = srcWidth,
            sh = srcHeight;
        if (videoAspect > containerAspect) {
            sw = srcHeight * containerAspect;
            sx = (srcWidth - sw) / 2;
        } else {
            sh = srcWidth / containerAspect;
            sy = (srcHeight - sh) / 2;
        }

        // Same rotate/flip transform as the CSS wrapper; marks live inside the
        // transformed wrapper on screen, so they get the same treatment here
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        ctx.drawImage(source, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
        ctx.drawImage(canvasRef.current, -w / 2, -h / 2, w, h);
        ctx.restore();

        capture.toBlob((blob) => {
            if (!blob) {
                onCaptureResult(false, "Failed to encode the captured image");
                return;
            }
            if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
                onCaptureResult(false, "Copying images to the clipboard is not supported in this context");
                return;
            }
            navigator.clipboard
                .write([new ClipboardItem({ "image/png": blob })])
                .then(() => onCaptureResult(true, "Image copied to clipboard"))
                .catch((err) => onCaptureResult(false, "Copy failed: " + err.message));
        }, "image/png");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [captureTrigger]);

    function getCanvasPos(e) {
        const canvas = canvasRef.current;
        // The canvas rotates/flips with the video, so map the pointer position from
        // the transformed element's bounding box back into untransformed canvas space
        const rect = canvas.getBoundingClientRect();
        const p = (e.clientX - rect.left) / rect.width;
        const q = (e.clientY - rect.top) / rect.height;
        const rot = ((rotation % 360) + 360) % 360;
        let u, v;
        if (rot === 90) {
            u = q;
            v = 1 - p;
        } else if (rot === 180) {
            u = 1 - p;
            v = 1 - q;
        } else if (rot === 270) {
            u = 1 - q;
            v = p;
        } else {
            u = p;
            v = q;
        }
        if (flipH) u = 1 - u;
        if (flipV) v = 1 - v;
        return { x: u * canvas.width, y: v * canvas.height };
    }

    function handleMouseDown(e) {
        if (!marking) return;
        isDrawingRef.current = true;
        const pos = getCanvasPos(e);
        lastPosRef.current = pos;
        const ctx = canvasRef.current.getContext("2d");
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = markColor;
        ctx.fill();
    }

    function handleMouseMove(e) {
        if (!marking || !isDrawingRef.current) return;
        const pos = getCanvasPos(e);
        const ctx = canvasRef.current.getContext("2d");
        ctx.beginPath();
        ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = markColor;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.stroke();
        lastPosRef.current = pos;
    }

    function handleMouseUp() {
        isDrawingRef.current = false;
    }

    return (
        <TransformWrapper
            ref={transformRef}
            wheel={{ step: 0.2 }}
            pinch={{ step: 5 }}
            doubleClick={{ disabled: true }}
            panning={{ disabled: marking }}
        >
            <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
                <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%" }}>
                    {/* Shared wrapper so the video, frozen frame, and marks rotate/flip together.
                        Stays in normal flow: the video's intrinsic size drives the layout */}
                    <div
                        style={{
                            position: "relative",
                            width: "100%",
                            height: "100%",
                            transform: transformStyle,
                        }}
                    >
                        {externalStream ? (
                            <video
                                ref={externalVideoRef}
                                autoPlay
                                playsInline
                                muted
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                }}
                            />
                        ) : (
                            <Webcam
                                ref={webcamRef}
                                audio={false}
                                screenshotFormat="image/jpeg"
                                videoConstraints={{
                                    facingMode: "user",
                                    deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined,
                                    width: { ideal: 1920 },
                                    height: { ideal: 1080 },
                                }}
                                onUserMedia={(stream) => {
                                    const s = stream.getVideoTracks()[0]?.getSettings();
                                    if (s && (s.width < 1920 || s.height < 1080)) {
                                        console.log(
                                            `[Webcam quality] Requested 1920x1080, got ${s.width}x${s.height}`
                                        );
                                    }
                                }}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                }}
                            />
                        )}
                        {paused && pausedFrameUrl && (
                            <img
                                src={pausedFrameUrl}
                                alt=""
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                }}
                            />
                        )}
                        <canvas
                            ref={canvasRef}
                            width={1280}
                            height={960}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                cursor: marking ? "crosshair" : "default",
                                pointerEvents: marking ? "auto" : "none",
                            }}
                        />
                    </div>
                </div>
            </TransformComponent>
        </TransformWrapper>
    );
};

export default WebcamViewer;
