import { useCallback, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    CircularProgress,
    Box,
} from "@mui/material";
import RawReplSession from "../serialFs/rawRepl";
import {
    queryStorageState,
    giveWriteAccessToBoard,
    forceWriteAccessToBoard,
    giveWriteAccessToHost,
    DriveStillMountedError,
    BOOT_PY_FALLBACK,
    STATE,
} from "../serialFs/storageControl";

/**
 * The manual "filesystem write access" tool in the Navigation tab.
 *
 * Everything here is behind a button on purpose. Each call is a raw REPL round
 * trip that interrupts whatever the board is running, and handing write access
 * to the board additionally risks filesystem corruption if the host is
 * mid-write. So nothing is probed automatically and no state is displayed
 * unless the user asked for it.
 *
 * Shaped like useBoardGuard: returns actions plus one dialog node to render.
 *
 * @param {object} serial       shared SerialCommunication instance
 * @param {boolean} serialReady whether the port is open
 */
export default function useStorageControl(serial, serialReady) {
    const [dialog, setDialog] = useState(null);
    const [busy, setBusy] = useState(false);

    const run = useCallback(
        async (fn) => {
            const release = await serial.startTransaction();
            try {
                const session = new RawReplSession({
                    write: (data) => serial.writeNow(data),
                    readUntil: (match, timeout) => serial.readUntil(match, timeout),
                    readExactly: (count, timeout) => serial.readExactly(count, timeout),
                    drain: () => serial.drainExclusive(),
                });
                return await session.run(fn);
            } finally {
                release();
            }
        },
        [serial]
    );

    const needsSerial = useCallback(() => {
        if (serialReady) {
            return false;
        }
        setDialog({
            title: "Serial port not connected",
            body: "Connect the serial port first. This tool talks to the board over the REPL.",
        });
        return true;
    }, [serialReady]);

    // Opens a progress dialog up front, then replaces it with the outcome.
    //
    // The progress step matters: these calls take up to 15s (query) or 20s
    // (switching, which blocks ~2.5s on the device alone), and without it the
    // only feedback is the buttons going grey.
    //
    // Any failure ends with the boot.py fallback, which works on every firmware
    // even when nothing else here does.
    const withBusy = useCallback(async (progressTitle, fn) => {
        setBusy(true);
        setDialog({ title: progressTitle, body: "Talking to the board...", inProgress: true });
        try {
            await fn();
        } catch (error) {
            setDialog({
                title: "That didn't work",
                body: String(error?.message || error) + "\n\n---\n\n" + BOOT_PY_FALLBACK,
            });
        } finally {
            setBusy(false);
        }
    }, []);

    /** Button 1: ask the board who owns write access right now. */
    const queryState = useCallback(async () => {
        if (needsSerial()) return;
        await withBusy("Checking filesystem state", async () => {
            const info = await run((session) => queryStorageState(session));
            setDialog({ title: info.summary, body: info.detail });
        });
    }, [needsSerial, withBusy, run]);

    /**
     * Button 2: hand write access to CircuitPython.
     *
     * The safe path first: remount() only succeeds once the host has released the
     * drive, and requiring that eject is what removes the corruption risk. Only
     * if it refuses do we mention the no-eject override, and only on firmware
     * that actually has it.
     */
    const switchToBoard = useCallback(async () => {
        if (needsSerial()) return;
        await withBusy("Giving write access to CircuitPython", async () => {
            try {
                await run((session) => giveWriteAccessToBoard(session));
                setDialog({
                    title: "CircuitPython now has write access",
                    body:
                        "Saving files over serial will now work.\n\n" +
                        'Use "Return write access to this computer" when you want the drive back.',
                });
                return;
            } catch (error) {
                if (!(error instanceof DriveStillMountedError)) {
                    throw error;
                }
                // Ask the board whether it even has the override before offering it.
                const info = await run((session) => queryStorageState(session));
                setDialog({
                    title: "Eject the CIRCUITPY drive first",
                    body: error.message,
                    ...(info.canForce
                        ? {
                              confirmLabel: "Take it without ejecting",
                              onConfirm: () =>
                                  setDialog({
                                      title: "Take write access without ejecting?",
                                      body:
                                          "This pulls the drive away from your computer with no eject, the " +
                                          "same way physically unplugging it would.\n\n" +
                                          "If your computer is still writing to CIRCUITPY, this can corrupt " +
                                          "the board's filesystem. Only continue if you are sure nothing is " +
                                          "copying to the board.",
                                      confirmLabel: "I understand, take it anyway",
                                      onConfirm: () =>
                                          withBusy("Taking write access", async () => {
                                              await run((session) => forceWriteAccessToBoard(session));
                                              setDialog({
                                                  title: "CircuitPython now has write access",
                                                  body:
                                                      "The drive has been removed from this computer and " +
                                                      "saving over serial will now work.",
                                              });
                                          }),
                                  }),
                          }
                        : {}),
                });
            }
        });
    }, [needsSerial, withBusy, run]);

    /** Button 3: give it back; the drive reappears. */
    const switchToHost = useCallback(async () => {
        if (needsSerial()) return;
        await withBusy("Returning write access", async () => {
            await run((session) => giveWriteAccessToHost(session));
            setDialog({
                title: "Write access returned to this computer",
                body:
                    "The board is read-only to itself again.\n\n" +
                    "If the CIRCUITPY drive does not come back on its own, unplug and replug the board. " +
                    "Saving files over serial will fail again while the drive is mounted here.",
            });
        });
    }, [needsSerial, withBusy, run]);

    const close = () => setDialog(null);
    const inProgress = Boolean(dialog?.inProgress);

    const storageControlDialog = (
        // While an operation runs the dialog cannot be dismissed, so the result
        // always has somewhere to land.
        <Dialog open={Boolean(dialog)} onClose={inProgress ? undefined : close} maxWidth="sm" fullWidth>
            <DialogTitle>{dialog?.title}</DialogTitle>
            <DialogContent>
                {inProgress ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <CircularProgress size={18} />
                        <DialogContentText>{dialog?.body}</DialogContentText>
                    </Box>
                ) : (
                    <DialogContentText sx={{ whiteSpace: "pre-line" }}>{dialog?.body}</DialogContentText>
                )}
            </DialogContent>
            <DialogActions>
                {!inProgress && <Button onClick={close}>{dialog?.onConfirm ? "Cancel" : "Close"}</Button>}
                {!inProgress && dialog?.onConfirm && (
                    <Button
                        variant="contained"
                        color="warning"
                        onClick={() => {
                            const confirm = dialog.onConfirm;
                            setDialog(null);
                            confirm();
                        }}
                    >
                        {dialog.confirmLabel || "Continue"}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );

    return { queryState, switchToBoard, switchToHost, busy, storageControlDialog, STATE };
}
