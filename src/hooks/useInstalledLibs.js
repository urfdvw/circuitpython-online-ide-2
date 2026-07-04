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
 */
export function useInstalledLibs(rootDirHandle) {
    async function getInstalled() {
        const { dirHandle: libFolderHandle } = await path2Handles(rootDirHandle, "lib/");
        return await getInstalledLibVersions(libFolderHandle);
    }

    return { getInstalled };
}
