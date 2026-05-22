import WebcamViewer from "../utilComponents/WebcamViewer";
import TabTemplate from "../utilComponents/TabTemplate";
import { useState, useEffect, useRef, useContext } from "react";
import { NoTheme } from "react-lazy-dark-theme";
import PopUp from "../utilComponents/PopUp";
import { selectTabById } from "../layout/layoutUtils";
import AppContext from "../AppContext";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    CircularProgress,
    Box,
} from "@mui/material";
import QRCode from "react-qr-code";
import Peer from "peerjs";

export default function DocCam() {
    const { flexModel, helpTabSelection } = useContext(AppContext);

    const [rotation, setRotation] = useState(0);
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);
    const [deviceIds, setDeviceIds] = useState([]);
    const [selectedId, setSelectedId] = useState();
    const [popped, setPopped] = useState(false);
    const [marking, setMarking] = useState(false);
    const [clearMarksTrigger, setClearMarksTrigger] = useState(0);

    // null | 'webcam' | 'phone'
    const [cameraSource, setCameraSource] = useState(null);
    const [externalStream, setExternalStream] = useState(null);

    // Phone camera dialog state
    const [phoneCamOpen, setPhoneCamOpen] = useState(false);
    const [phoneCamReady, setPhoneCamReady] = useState(false);
    const [idePeerId, setIdePeerId] = useState(null);
    const [peerError, setPeerError] = useState("");
    const idePeerRef = useRef(null);
    const activeCallRef = useRef(null);

    useEffect(() => {
        return () => {
            activeCallRef.current?.close();
            idePeerRef.current?.destroy();
        };
    }, []);

    function startWebcam() {
        setCameraSource("webcam");
    }

    function openPhoneCam() {
        setPeerError("");
        setPhoneCamReady(false);
        setPhoneCamOpen(true);

        const peer = new Peer();
        idePeerRef.current = peer;

        peer.on("open", (id) => {
            setIdePeerId(id);
            setPhoneCamReady(true);
            const url = `${window.location.href.split("#")[0]}#/camera?token=${id}`;
            console.log("[Phone Camera URL]", url);
        });

        peer.on("call", (call) => {
            activeCallRef.current = call;
            const canvas = document.createElement("canvas");
            canvas.width = 1;
            canvas.height = 1;
            call.answer(canvas.captureStream(1));
            call.on("stream", (remoteStream) => {
                setExternalStream(remoteStream);
                setCameraSource("phone");
                setPhoneCamOpen(false);
            });
            call.on("close", () => {
                setExternalStream(null);
                setCameraSource(null);
            });
            call.on("error", (err) => setPeerError(err.message));
        });

        peer.on("error", (err) => setPeerError(err.message));
    }

    function cancelPhoneCamDialog() {
        idePeerRef.current?.destroy();
        idePeerRef.current = null;
        setIdePeerId(null);
        setPhoneCamReady(false);
        setPhoneCamOpen(false);
        setPeerError("");
    }

    function stopCamera() {
        activeCallRef.current?.close();
        idePeerRef.current?.destroy();
        idePeerRef.current = null;
        activeCallRef.current = null;
        setIdePeerId(null);
        setExternalStream(null);
        setCameraSource(null);
        setSelectedId(undefined);
    }

    const qrUrl = idePeerId
        ? `${window.location.href.split("#")[0]}#/camera?token=${idePeerId}`
        : "";

    const menuStructure = [
        ...(cameraSource === null
            ? [
                  {
                      label: "Start Camera",
                      options: [
                          { text: "Webcam", handler: startWebcam },
                          { text: "Phone", handler: openPhoneCam },
                      ],
                  },
              ]
            : [{ text: "Stop Camera", handler: stopCamera }]),
        ...(cameraSource === "webcam"
            ? [
                  {
                      label: "Cameras",
                      options: deviceIds.map((device) => ({
                          text: device.label,
                          handler: () => setSelectedId(device.deviceId),
                      })),
                  },
              ]
            : []),
        {
            label: "Rotate",
            options: [
                { text: "0", handler: () => setRotation(0) },
                { text: "90", handler: () => setRotation(90) },
                { text: "-90", handler: () => setRotation(-90) },
                { text: "180", handler: () => setRotation(180) },
            ],
        },
        {
            label: "Flip",
            options: [
                { text: "Horizontal", handler: () => setFlipH((prev) => !prev) },
                { text: "Vertical", handler: () => setFlipV((prev) => !prev) },
            ],
        },
        {
            text: marking ? "Stop Marking" : "Mark",
            handler: () => setMarking((prev) => !prev),
        },
        {
            text: "Clear Marks",
            handler: () => setClearMarksTrigger((prev) => prev + 1),
        },
        {
            label: "≡",
            options: [
                {
                    text: "Help",
                    handler: () => {
                        selectTabById(flexModel, "help_tab");
                        helpTabSelection.setTabName("camera");
                    },
                },
                {
                    text: popped ? "Dock" : "Pop Up",
                    handler: () => setPopped((prev) => !prev),
                },
            ],
        },
    ];

    return (
        <>
            <PopUp popped={popped} setPopped={setPopped} title="Camera" parentStyle={{ width: "100%", height: "100%" }}>
                <TabTemplate title="Camera" menuStructure={menuStructure}>
                    <NoTheme>
                        {cameraSource !== null ? (
                            <WebcamViewer
                                rotation={rotation}
                                flipH={flipH}
                                flipV={flipV}
                                setDeviceIdList={setDeviceIds}
                                selectedDeviceId={selectedId}
                                marking={marking}
                                clearMarksTrigger={clearMarksTrigger}
                                externalStream={externalStream}
                            />
                        ) : (
                            <Box
                                sx={{
                                    width: "100%",
                                    height: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: "#000",
                                    color: "#555",
                                }}
                            >
                                <Typography variant="body2">Select a camera to start</Typography>
                            </Box>
                        )}
                    </NoTheme>
                </TabTemplate>
            </PopUp>

            <Dialog open={phoneCamOpen} onClose={cancelPhoneCamDialog} maxWidth="xs" fullWidth>
                <DialogTitle>Use Phone Camera</DialogTitle>
                <DialogContent sx={{ textAlign: "center", py: 3 }}>
                    {phoneCamReady ? (
                        <NoTheme>
                            <Box sx={{ display: "inline-block", border: "16px solid white", borderRadius: 1 }}>
                                <QRCode value={qrUrl} size={200} />
                            </Box>
                        </NoTheme>
                    ) : (
                        <CircularProgress />
                    )}
                    <Typography variant="body2" sx={{ mt: 2, color: peerError ? "error.main" : "text.secondary" }}>
                        {peerError || "Scan with your phone camera to connect"}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelPhoneCamDialog}>Cancel</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
