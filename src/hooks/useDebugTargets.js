import { useCallback, useEffect, useRef, useState } from "react";
import { isSameEntrySafe } from "../utilComponents/react-local-file-system/utilities/fileSystemUtils";

export default function useDebugTargets(root, ready, listFiles, onSourceChanged) {
    const [files, setFiles] = useState([]);
    const [error, setError] = useState(null);
    const previousRoot = useRef(null);
    const requestId = useRef(0);
    const refresh = useCallback(async () => {
        if (!root || !ready) return false;
        const request = ++requestId.current;
        try {
            const sameSource = previousRoot.current === root ||
                (previousRoot.current && await isSameEntrySafe(previousRoot.current, root));
            if (request !== requestId.current) return false;
            if (!sameSource) {
                previousRoot.current = root;
                setFiles([]);
                onSourceChanged();
            }
            const nextFiles = await listFiles(root);
            if (request !== requestId.current) return false;
            setFiles((previous) => previous.length === nextFiles.length &&
                previous.every((file, index) => file === nextFiles[index]) ? previous : nextFiles);
            setError(null);
            return true;
        } catch (error) {
            if (request === requestId.current) setError(error.message);
            return false;
        }
    }, [root, ready, listFiles, onSourceChanged]);

    useEffect(() => {
        refresh();
        return () => { requestId.current = requestId.current + 1; };
    }, [refresh]);
    return { files, error, refresh };
}
