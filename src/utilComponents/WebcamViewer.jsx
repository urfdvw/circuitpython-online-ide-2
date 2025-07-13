import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const WebcamViewer = ({
    rotation = 0,
    flipH = false,
    flipV = false,
    selectedDeviceId = undefined,
    setDeviceIdList = () => {},
}) => {
    const webcamRef = useRef(null);
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

    return (
        <TransformWrapper wheel={{ step: 0.2 }} pinch={{ step: 5 }} doubleClick={{ disabled: true }}>
            <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
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
            </TransformComponent>
        </TransformWrapper>
    );
};

export default WebcamViewer;
