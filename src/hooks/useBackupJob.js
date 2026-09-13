import { useCallback, useRef, useState } from "react";

export default function useBackupJob() {
    const pending = useRef(false);
    const [error, setError] = useState(null);
    const runJob = useCallback(async (operation, { background = false } = {}) => {
        if (pending.current) return false;
        pending.current = true;
        try {
            await operation();
            setError(null);
            return true;
        } catch (error) {
            const message = "Backup operation failed. " + error.message;
            setError(message);
            if (background) console.warn(message);
            else alert(message);
            return false;
        } finally {
            pending.current = false;
        }
    }, []);
    return { runJob, error, clearError: useCallback(() => setError(null), []) };
}
