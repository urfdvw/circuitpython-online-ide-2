import { useEffect, useState } from "react";
import { getFromPathIfExists } from "../utilComponents/react-local-file-system/utilities/fileSystemUtils";
import { parseCircuitPythonInfo } from "../utilFunctions/dataProcessing";

/**
 * Derives CircuitPython board info from the connected drive's boot_out.txt.
 *
 * Re-reads and re-parses whenever the open directory changes, returning:
 *   { cpy_version, cpy_datetime, board_id, device_id }  when a board is present,
 *   null  when no folder is open, boot_out.txt is missing, or it can't be parsed.
 *
 * boot_out.txt is read with create:false so that merely probing for it never drops
 * an empty boot_out.txt into a plain (non-CircuitPython) folder the user opens.
 *
 * @param {boolean} rootFolderDirectoryReady - whether a directory is currently open
 * @param {FileSystemDirectoryHandle | null} rootDirHandle - handle to the open directory
 * @returns {object | null} parsed board info, or null
 */
export default function useBoardInfo(rootFolderDirectoryReady, rootDirHandle) {
    const [boardInfo, setBoardInfo] = useState(null);

    useEffect(() => {
        async function getBoardInfo() {
            if (!rootFolderDirectoryReady) {
                setBoardInfo(null);
                return;
            }
            const boot_out_txt = await getFromPathIfExists(rootDirHandle, "boot_out.txt");
            // parseCircuitPythonInfo returns null when the contents can't be parsed.
            const board_info = boot_out_txt === null ? null : parseCircuitPythonInfo(boot_out_txt);
            console.log("board_info:", board_info);
            setBoardInfo(board_info);
        }
        getBoardInfo();
    }, [rootFolderDirectoryReady, rootDirHandle]);

    return boardInfo;
}
