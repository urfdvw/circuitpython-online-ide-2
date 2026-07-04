// boardStore.js
//
// Per-board persistence keyed by the board UID (boardInfo.device_id). Stored in
// IndexedDB so values survive reloads. The store is intentionally general — the UID
// keys an extensible record so future per-board data can live alongside the backup
// directory handle, rather than the UID being a backup-only key.
//
// FileSystemDirectoryHandle is structured-cloneable, so the handle itself is stored
// directly; on a later session the caller re-checks permission before using it.

import { openDB } from "idb";

const DB_NAME = "circuitpython-online-ide";
const STORE = "boards"; // keyPath: "uid"; record: { uid, backupDirHandle, backupDirName, updatedAt }

function db() {
    return openDB(DB_NAME, 1, {
        upgrade(d) {
            if (!d.objectStoreNames.contains(STORE)) {
                d.createObjectStore(STORE, { keyPath: "uid" });
            }
        },
    });
}

export async function getBoardRecord(uid) {
    if (!uid) return null;
    return (await (await db()).get(STORE, uid)) ?? null;
}

export async function getBackupDirHandle(uid) {
    const record = await getBoardRecord(uid);
    return record?.backupDirHandle ?? null;
}

export async function setBackupDirHandle(uid, handle) {
    if (!uid) return;
    const d = await db();
    const record = (await d.get(STORE, uid)) || { uid };
    record.backupDirHandle = handle;
    record.backupDirName = handle?.name ?? null;
    record.updatedAt = Date.now();
    await d.put(STORE, record);
}

export async function clearBackupDirHandle(uid) {
    if (!uid) return;
    const d = await db();
    const record = await d.get(STORE, uid);
    if (record) {
        delete record.backupDirHandle;
        delete record.backupDirName;
        record.updatedAt = Date.now();
        await d.put(STORE, record);
    }
}
