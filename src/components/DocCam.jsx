import WebcamViewer from "../utilComponents/WebcamViewer";
import CameraToolbar from "../utilComponents/CameraToolbar";
import TabTemplate from "../utilComponents/TabTemplate";
import { useState, useEffect, useRef, useContext } from "react";
import { NoTheme } from "react-lazy-dark-theme";
import PopUp from "../utilComponents/PopUp";
import { selectTabById } from "../layout/layoutUtils";
import AppContext from "../AppContext";
import { store } from "./agentBridge/cpyAgentBridge";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    CircularProgress,
    Box,
    Snackbar,
    Alert,
} from "@mui/material";
import QRCode from "react-qr-code";
import Peer from "peerjs";

const MARK_COLORS = [
    { name: "Red", value: "rgba(255, 50, 50, 0.9)" },
    { name: "Yellow", value: "rgba(255, 220, 0, 0.9)" },
    { name: "Cyan", value: "rgba(0, 220, 220, 0.9)" },
    { name: "Green", value: "rgba(0, 200, 80, 0.9)" },
    { name: "Magenta", value: "rgba(255, 0, 255, 0.9)" },
];

export default function DocCam() {
    const { flexModel, helpTabSelection } = useContext(AppContext);

    const [rotation, setRotation] = useState(0);
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);
    const [deviceIds, setDeviceIds] = useState([]);
    const [selectedId, setSelectedId] = useState();
    const [popped, setPopped] = useState(false);
    const [marking, setMarking] = useState(false);
    const [markColor, setMarkColor] = useState(MARK_COLORS[0].value);
    const [clearMarksTrigger, setClearMarksTrigger] = useState(0);
    const [resetViewTrigger, setResetViewTrigger] = useState(0);
    const [paused, setPaused] = useState(false);
    const [captureTrigger, setCaptureTrigger] = useState(0);
    const [captureMsg, setCaptureMsg] = useState(null);

    // null | 'webcam' | 'phone'
    const [cameraSource, setCameraSource] = useState(null);
    const [externalStream, setExternalStream] = useState(null);

    const viewerRef = useRef(null);

    // Camera controller for the agent bridge. Rebuilt every render so the
    // closures capture the latest state (same pattern as AgentLibBridge);
    // nulled on unmount so a closed Camera tab reads as "not ready".
    store.camera = {
        isReady: () => cameraSource !== null && Boolean(viewerRef.current?.isReady()),
        getCameraName: () => viewerRef.current?.getCameraName() ?? null,
        resetView: () => viewerRef.current?.resetView(),
    };
    useEffect(() => {
        return () => {
            store.camera = null;
        };
    }, []);

    // Phone camera dialog state
    const [phoneCamOpen, setPhoneCamOpen] = useState(false);
    const [phoneCamReady, setPhoneCamReady] = useState(false);
    const [idePeerId, setIdePeerId] = useState(null);
    const [peerError, setPeerError] = useState("");
    const [disconnectMsg, setDisconnectMsg] = useState("");
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
                setDisconnectMsg("Phone camera disconnected");
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
        setPaused(false);
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
                    {cameraSource !== null ? (
                        <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
                            <NoTheme>
                                <WebcamViewer
                                    ref={viewerRef}
                                    rotation={rotation}
                                    flipH={flipH}
                                    flipV={flipV}
                                    setDeviceIdList={setDeviceIds}
                                    selectedDeviceId={selectedId}
                                    marking={marking}
                                    markColor={markColor}
                                    clearMarksTrigger={clearMarksTrigger}
                                    resetViewTrigger={resetViewTrigger}
                                    paused={paused}
                                    captureTrigger={captureTrigger}
                                    onCaptureResult={(ok, text) =>
                                        setCaptureMsg({ severity: ok ? "success" : "error", text })
                                    }
                                    externalStream={externalStream}
                                />
                            </NoTheme>
                            <CameraToolbar
                                onFlipH={() => setFlipH((prev) => !prev)}
                                onFlipV={() => setFlipV((prev) => !prev)}
                                onRotateCw={() => setRotation((prev) => (prev + 90) % 360)}
                                onRotateCcw={() => setRotation((prev) => (prev + 270) % 360)}
                                onResetView={() => setResetViewTrigger((prev) => prev + 1)}
                                marking={marking}
                                onToggleMarking={() => setMarking((prev) => !prev)}
                                onClearMarks={() => setClearMarksTrigger((prev) => prev + 1)}
                                markColor={markColor}
                                markColors={MARK_COLORS}
                                onSelectMarkColor={setMarkColor}
                                paused={paused}
                                onTogglePause={() => setPaused((prev) => !prev)}
                                onCapture={() => setCaptureTrigger((prev) => prev + 1)}
                            />
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                Select a camera to start
                            </Typography>
                        </Box>
                    )}
                </TabTemplate>
            </PopUp>

            <Snackbar
                open={!!disconnectMsg}
                autoHideDuration={4000}
                onClose={() => setDisconnectMsg("")}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert severity="warning" onClose={() => setDisconnectMsg("")}>
                    {disconnectMsg}
                </Alert>
            </Snackbar>

            <Snackbar
                open={!!captureMsg}
                autoHideDuration={3000}
                onClose={() => setCaptureMsg(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert severity={captureMsg?.severity || "info"} onClose={() => setCaptureMsg(null)}>
                    {captureMsg?.text}
                </Alert>
            </Snackbar>

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
