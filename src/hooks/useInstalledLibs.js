import { path2Handles } from "../utilComponents/react-local-file-system/utilities/fileSystemUtils";
import { getInstalledLibVersions } from "../utilFunctions/installedLibUtils";

/**
 * Reads the libraries currently installed on the connected CIRCUITPY drive.
 *
 * `getInstalled()` opens the board's `lib/` folder and returns
 *   [{ name, version: { major, minor, patch } }, ...]
 * for every child that yields a valid version. Callers are responsible for the
 * board/bundle preconditions (see useLibInstaller.analyzeMcu).
 *
 * @param {FileSystemDirectoryHandle | null} rootDirHandle
 * @param {(fn: () => Promise<any>, opts?: object) => Promise<any>} [batchFileOps]
 *   groups the scan into one device session; see useFileSource. Optional so the
 *   hook still works standalone.
 */
export function useInstalledLibs(rootDirHandle, batchFileOps) {
    async function getInstalled() {
        // getInstalledLibVersions reads a version out of every installed library,
        // which over serial is a round trip each. Batching turns twenty
        // interruptions of the running program into one.
        const scan = async () => {
            const { dirHandle: libFolderHandle } = await path2Handles(rootDirHandle, "lib/");
            return await getInstalledLibVersions(libFolderHandle);
        };
        return batchFileOps ? await batchFileOps(scan, { label: "scanned installed libraries" }) : await scan();
    }

    return { getInstalled };
}
