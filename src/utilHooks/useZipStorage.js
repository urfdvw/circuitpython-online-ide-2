import { useCallback } from 'react';
import JSZip from 'jszip';
import { openDB } from 'idb';

const DB_NAME = 'zip_storage';
const STORE_NAME = 'files';

async function initDB() {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'path' });
                store.createIndex('path', 'path', { unique: true });
            }
        },
    });
}

export function useZipStorage() {
    const openZipFile = useCallback(() => {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.zip';

            input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return reject(new Error('No file selected'));

                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const zip = await JSZip.loadAsync(arrayBuffer);
                    const db = await initDB();

                    // Step 1: Find common root folder (if all files share a prefix)
                    const allPaths = Object.keys(zip.files);
                    let commonPrefix = null;

                    if (allPaths.length > 0) {
                        const firstPathParts = allPaths[0].split('/');
                        const candidateRoot = firstPathParts[0];

                        const allShareRoot = allPaths.every(p => p.startsWith(candidateRoot + '/'));
                        if (allShareRoot) {
                            commonPrefix = candidateRoot + '/';
                        }
                    }

                    // Step 2: Normalize entries
                    const fileEntries = allPaths.map(async (path) => {
                        const zipEntry = zip.files[path];
                        const normalizedPath = commonPrefix ? path.slice(commonPrefix.length) : path;

                        if (!normalizedPath) return null; // Skip root folder itself

                        if (zipEntry.dir) {
                            return { path: normalizedPath, type: 'folder' };
                        } else {
                            const content = await zipEntry.async('uint8array');
                            return { path: normalizedPath, type: 'file', content };
                        }
                    });

                    const entries = (await Promise.all(fileEntries)).filter(Boolean);

                    const tx = db.transaction(STORE_NAME, 'readwrite');
                    const store = tx.objectStore(STORE_NAME);
                    await store.clear();

                    console.log(entries)

                    for (const entry of entries) {
                        await store.put(entry);
                    }

                    await tx.done;
                    resolve();
                } catch (err) {
                    reject(err);
                }
            };

            input.click();
        });
    }, []);

    const getItem = useCallback(async (relativePath) => {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const entry = await store.get(relativePath);
        if (!entry) throw new Error(`Path not found: ${relativePath}`);

        if (entry.type === 'file') {
            return {
                async getFile() {
                    return new File([entry.content], relativePath.split('/').pop() || 'file');
                },
            };
        }

        if (entry.type === 'folder') {
            return {
                async *entries() {
                    const allKeys = await store.getAllKeys();
                    const prefix = relativePath.endsWith('/') ? relativePath : `${relativePath}/`;
                    const seen = new Set();

                    for (const key of allKeys) {
                        if (typeof key !== 'string') continue;
                        if (key.startsWith(prefix)) {
                            const rest = key.slice(prefix.length);
                            const top = rest.split('/')[0];
                            if (!seen.has(top)) {
                                seen.add(top);
                                const child = await store.get(`${prefix}${top}`);
                                yield [top, child?.type || 'file'];
                            }
                        }
                    }
                },
            };
        }
    }, []);

    return { openZipFile, getItem };
}
