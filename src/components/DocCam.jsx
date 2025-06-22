import WebcamViewer from "../utilComponents/WebcamViewer";
import TabTemplate from "../utilComponents/TabTemplate";
import { useState, useEffect } from "react";

export default function DocCam() {
    const [rotation, setRotation] = useState(0);
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);
    const [deviceIds, setDeviceIds] = useState([]);
    const [selectedId, setSelectedId] = useState();

    useEffect(() => {
        console.log(deviceIds);
    }, [deviceIds]);

    const menuStructure = [
        {
            label: "Cameras",
            options: deviceIds.map((id, index) => ({
                text: "camera " + index,
                handler: () => {
                    setSelectedId(id);
                },
            })),
        },
        {
            label: "Rotate",
            options: [
                {
                    text: "0",
                    handler: () => {
                        setRotation(0);
                    },
                },
                {
                    text: "90",
                    handler: () => {
                        setRotation(90);
                    },
                },
                {
                    text: "-90",
                    handler: () => {
                        setRotation(-90);
                    },
                },
                {
                    text: "180",
                    handler: () => {
                        setRotation(180);
                    },
                },
            ],
        },
        {
            label: "Flip",
            options: [
                {
                    text: "Horizontal",
                    handler: () => {
                        setFlipH((prev) => !prev);
                    },
                },
                {
                    text: "Vertical",
                    handler: () => {
                        setFlipV((prev) => !prev);
                    },
                },
            ],
        },
        {
            label: "≡",
            options: [
                {
                    text: "Help",
                    handler: () => {
                        console.log("clicked on menu item `Help`");
                    },
                },
            ],
        },
    ];
    return (
        <TabTemplate title="Document Camera" menuStructure={menuStructure}>
            <WebcamViewer
                rotation={rotation}
                flipH={flipH}
                flipV={flipV}
                setDeviceIdList={setDeviceIds}
                selectedDeviceId={selectedId}
            />
        </TabTemplate>
    );
}
