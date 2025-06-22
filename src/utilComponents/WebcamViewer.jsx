import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { NoTheme } from "react-lazy-dark-theme";

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

    // Handle webcam device list changes
    useEffect(() => {
        const updateDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = devices.filter((d) => d.kind === "videoinput");
                setDeviceIdList(videoInputs.map((d) => d.deviceId));
            } catch (err) {
                console.warn("Could not enumerate devices:", err);
            }
        };

        updateDevices();
        navigator.mediaDevices.addEventListener("devicechange", updateDevices);

        return () => {
            navigator.mediaDevices.removeEventListener("devicechange", updateDevices);
        };
    }, [setDeviceIdList]);

    // Update internal videoDeviceId when selectedDeviceId changes
    useEffect(() => {
        setVideoDeviceId(selectedDeviceId);
    }, [selectedDeviceId]);

    return (
        <NoTheme>
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
        </NoTheme>
    );
};

export default WebcamViewer;
