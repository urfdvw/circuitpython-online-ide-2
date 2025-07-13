import WebcamViewer from "../utilComponents/WebcamViewer";
import TabTemplate from "../utilComponents/TabTemplate";
import { useState, useEffect, useContext } from "react";
import { NoTheme } from "react-lazy-dark-theme";
import PopUp from "../utilComponents/PopUp";
import { selectTabById } from "../layout/layoutUtils";
import AppContext from "../AppContext";

export default function DocCam() {
    const { flexModel, helpTabSelection } = useContext(AppContext);

    const [rotation, setRotation] = useState(0);
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);
    const [deviceIds, setDeviceIds] = useState([]);
    const [selectedId, setSelectedId] = useState();
    const [popped, setPopped] = useState(false);

    useEffect(() => {
        console.log(deviceIds);
    }, [deviceIds]);

    const menuStructure = [
        {
            label: "Cameras",
            options: deviceIds.map((device, index) => ({
                text: device.label,
                handler: () => {
                    setSelectedId(device.deviceId);
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
                        selectTabById(flexModel, "help_tab");
                        helpTabSelection.setTabName("camera");
                    },
                },
                {
                    text: popped ? "Dock" : "Pop Up",
                    handler: () => {
                        setPopped((prev) => !prev);
                    },
                },
            ],
        },
    ];
    return (
        <PopUp popped={popped} setPopped={setPopped} title="Camera" parentStyle={{ width: "100%" }}>
            <TabTemplate title="Camera" menuStructure={menuStructure}>
                <NoTheme>
                    <WebcamViewer
                        rotation={rotation}
                        flipH={flipH}
                        flipV={flipV}
                        setDeviceIdList={setDeviceIds}
                        selectedDeviceId={selectedId}
                    />
                </NoTheme>
            </TabTemplate>
        </PopUp>
    );
}
