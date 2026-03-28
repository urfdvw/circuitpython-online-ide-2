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
    clearMarksTrigger = 0,
}) => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const isDrawingRef = useRef(false);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const [videoDeviceId, setVideoDeviceId] = useState(undefined);

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

    function getCanvasPos(e) {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height),
        };
    }

    function handleMouseDown(e) {
        if (!marking) return;
        isDrawingRef.current = true;
        const pos = getCanvasPos(e);
        lastPosRef.current = pos;
        const ctx = canvasRef.current.getContext("2d");
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 50, 50, 0.9)";
        ctx.fill();
    }

    function handleMouseMove(e) {
        if (!marking || !isDrawingRef.current) return;
        const pos = getCanvasPos(e);
        const ctx = canvasRef.current.getContext("2d");
        ctx.beginPath();
        ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = "rgba(255, 50, 50, 0.9)";
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
            wheel={{ step: 0.2 }}
            pinch={{ step: 5 }}
            doubleClick={{ disabled: true }}
            panning={{ disabled: marking }}
        >
            <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                    <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{
                            facingMode: "user",
                            deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined,
                        }}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            transform: transformStyle,
                        }}
                    />
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
            </TransformComponent>
        </TransformWrapper>
    );
};

export default WebcamViewer;
