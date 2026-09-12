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
    const connection = await db();
    try {
        return (await connection.get(STORE, uid)) ?? null;
    } finally {
        connection.close();
    }
}

export async function getBackupDirHandle(uid) {
    const record = await getBoardRecord(uid);
    return record?.backupDirHandle ?? null;
}

export async function setBackupDirHandle(uid, handle) {
    if (!uid) return;
    const d = await db();
    try {
        const transaction = d.transaction(STORE, "readwrite");
        await Promise.all([
            (async () => {
                const record = (await transaction.store.get(uid)) || { uid };
                record.backupDirHandle = handle;
                record.backupDirName = handle?.name ?? null;
                record.updatedAt = Date.now();
                await transaction.store.put(record);
            })(),
            transaction.done,
        ]);
    } finally {
        d.close();
    }
}

export async function clearBackupDirHandle(uid) {
    if (!uid) return;
    const d = await db();
    try {
        const transaction = d.transaction(STORE, "readwrite");
        await Promise.all([
            (async () => {
                const record = await transaction.store.get(uid);
                if (record) {
                    delete record.backupDirHandle;
                    delete record.backupDirName;
                    record.updatedAt = Date.now();
                    await transaction.store.put(record);
                }
            })(),
            transaction.done,
        ]);
    } finally {
        d.close();
    }
}
