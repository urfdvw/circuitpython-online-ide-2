import { useCallback, useContext, useState } from "react";
import AppContext from "../AppContext";
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";

/**
 * Guard for actions that require a connected CircuitPython board.
 *
 * Anywhere `boardInfo` is needed but null, call `requireBoard()`:
 *   - if a board is connected, it returns the current `boardInfo`.
 *   - otherwise it returns null and opens a dialog prompting the user to connect.
 *
 * The dialog message adapts to why no board is available:
 *   - no folder open        -> "No CIRCUITPY drive connected"
 *   - folder open, no board -> "boot_out.txt not found, restart and connect"
 * Confirming ("Connect") opens the directory picker.
 *
 * Render the returned `boardGuardDialog` node once in the consuming component.
 */
export function useBoardGuard() {
    const { boardInfo, rootFolderDirectoryReady, openDirectory } = useContext(AppContext);
    const [open, setOpen] = useState(false);

    const requireBoard = useCallback(() => {
        if (boardInfo) {
            return boardInfo;
        }
        setOpen(true);
        return null;
    }, [boardInfo]);

    const message = rootFolderDirectoryReady
        ? "boot_out.txt was not found in the open folder, so this doesn't look like a CircuitPython drive.\n\n" +
          "Please restart the board (unplug/replug or press its reset button) and connect to the CIRCUITPY drive."
        : "No CIRCUITPY drive connected.\n\nPlease connect to your CircuitPython drive to continue.";

    const boardGuardDialog = (
        <Dialog open={open} onClose={() => setOpen(false)}>
            <DialogTitle>Connect a CircuitPython drive</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ whiteSpace: "pre-line" }}>{message}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={() => {
                        setOpen(false);
                        openDirectory();
                    }}
                >
                    Connect
                </Button>
            </DialogActions>
        </Dialog>
    );

    return { requireBoard, boardGuardDialog };
}
