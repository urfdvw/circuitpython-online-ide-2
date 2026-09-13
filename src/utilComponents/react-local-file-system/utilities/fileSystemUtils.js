import { sleep } from "../../../utilFunctions/sleep";

// Re-exported for existing import sites; the single source of truth is utilFunctions/sleep.js.
export { sleep };

// path level ====================================

export function normalizePath(rawPath) {
    return String(rawPath || "")
        .replace(/\\/g, "/")
        .split("/")
        .filter(Boolean);
}

/**
 * Walk `rawPath` from `directoryHandle` and return { dirHandle, fileHandle }.
 * If the last segment looks like a file (or `treatLastAsFile` is set), fileHandle
 * is set and dirHandle is its parent; otherwise dirHandle is the target folder.
 * WARNING: `create` defaults to true — missing folders/files are created along
 * the way. Pass { create: false } (or use getFromPathIfExists) for pure reads.
 */
export async function path2Handles(directoryHandle, rawPath, opt = {}) {
    const { create = true, treatLastAsFile = false, treatLastAsDirectory = false } = opt;

    const levels = normalizePath(rawPath);

    if (levels.length === 0) {
        return { dirHandle: directoryHandle, fileHandle: null };
    }

    const looksLikeFile = (name) => /\.[^./\\]+$/.test(name) && !/^\.[^/\\]+$/.test(name);

    let curDir = directoryHandle;
    for (let i = 0; i < levels.length - 1; i++) {
        const seg = levels[i];
        curDir = await curDir.getDirectoryHandle(seg, { create });
    }

    const last = levels[levels.length - 1];
    const lastIsFile = !treatLastAsDirectory && (treatLastAsFile || looksLikeFile(last));

    if (lastIsFile) {
        const fileHandle = await curDir.getFileHandle(last, { create });
        return { dirHandle: curDir, fileHandle };
    } else {
        const dirHandle = await curDir.getDirectoryHandle(last, { create });
        return { dirHandle, fileHandle: null };
    }
}

/** Write `text` to the file at `path`, creating intermediate folders. Failures show a confirm() dialog. */
export async function writeToPath(rootDirHandle, path, text) {
    const { fileHandle } = await path2Handles(rootDirHandle, path, { treatLastAsFile: true });
    return writeFileText(fileHandle, text);
}

// Like writeToPath, but always treats the last segment as a file and lets failures
// throw instead of popping a confirm() dialog. Creates intermediate folders.
export async function writeToPathStrict(rootDirHandle, path, text) {
    const { fileHandle } = await path2Handles(rootDirHandle, path, { create: true, treatLastAsFile: true });
    await writeFileData(fileHandle, String(text));
}

// Resolve the PARENT directory handle plus the target entry handle for a path.
// Needed for delete / rename / move where the operation runs from the parent.
export async function getParentAndHandleFromPath(rootDirHandle, rawPath) {
    const levels = normalizePath(rawPath);
    if (levels.length === 0) {
        throw new Error("Empty path");
    }
    const name = levels[levels.length - 1];
    const parentPath = levels.slice(0, -1).join("/");
    const { dirHandle: parent } = await path2Handles(rootDirHandle, parentPath, { create: false, treatLastAsDirectory: true });
    let handle;
    try {
        handle = await parent.getFileHandle(name);
    } catch {
        handle = await parent.getDirectoryHandle(name);
    }
    return { parent, handle, name };
}

// Whether a path exists under the root. The empty path is the root itself.
export async function checkPathExists(rootDirHandle, rawPath) {
    if (!rootDirHandle) return false;
    const levels = normalizePath(rawPath);
    if (levels.length === 0) return true;
    const name = levels[levels.length - 1];
    const parentPath = levels.slice(0, -1).join("/");
    try {
        const { dirHandle: parent } = await path2Handles(rootDirHandle, parentPath, { create: false, treatLastAsDirectory: true });
        return await checkEntryExists(parent, name);
    } catch {
        return false;
    }
}

/** Read a file without creating missing files or folders. */
export async function getFromPath(rootDirHandle, path) {
    const { fileHandle } = await path2Handles(rootDirHandle, path, { create: false, treatLastAsFile: true });
    return getFileText(fileHandle);
}

// Optional read: returns null when a file is missing or cannot be read.
export async function getFromPathIfExists(rootDirHandle, path) {
    try {
        const { fileHandle } = await path2Handles(rootDirHandle, path, { create: false, treatLastAsFile: true });
        return await getFileText(fileHandle);
    } catch {
        return null;
    }
}
// file level ====================================

// Retain the historical pacing for mounted drives until real-board testing can
// establish that it is unnecessary. Serial handles already sequence REPL writes.
async function settleDriveMutation(handle) {
    if (typeof handle.devicePath !== "string") await sleep(200);
}

/** Commit a write, releasing the stream on failure without hiding the original error. */
export async function writeFileData(fileHandle, data) {
    const writable = await fileHandle.createWritable();
    try {
        await writable.write(data);
        await writable.close();
        await settleDriveMutation(fileHandle);
    } catch (error) {
        try {
            await writable.abort?.();
        } catch {
            // A failed close may already have released the stream.
        }
        throw error;
    }
}

/** Report save errors to the user; return true only after the write commits. */
export async function writeFileText(fileHandle, text) {
    try {
        await writeFileData(fileHandle, text);
        return true;
    } catch (error) {
        confirm("Write to file failed. " + error.message);
        return false;
    }
}

/** Read a file handle's full contents as a string. */
export async function getFileText(fileHandle) {
    const file = await fileHandle.getFile();
    const contents = await file.text();
    return String(contents);
}

// folder level ================================

// Read -------------------------------

export function isFolder(entryHandle) {
    return entryHandle.kind === "directory";
}

/**
 * isSameEntry() that tolerates handles from different sources.
 *
 * A real FileSystemHandle's isSameEntry() is WebIDL-typed, so handing it the
 * duck-typed handle the serial file source produces rejects with a TypeError.
 * That case is also trivially answerable: a file on the board and a folder on
 * this computer are never the same entry.
 */
export async function isSameEntrySafe(a, b) {
    if (!a || !b) {
        return false;
    }
    try {
        return await a.isSameEntry(b);
    } catch {
        return false;
    }
}

/** Whether the handle is still readable (detects revoked/detached handles, e.g. after unplugging). */
export async function isEntryHealthy(entryHandle) {
    if (!entryHandle) {
        return false;
    }
    if (isFolder(entryHandle)) {
        try {
            for await (const entry of entryHandle.entries()) {
                if (entry) return true;
            }
            return true;
        } catch {
            return false;
        }
    } else {
        try {
            await getFileText(entryHandle);
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * List a folder's direct children, annotating each handle with parent, isParent,
 * fullPath, and extension. With `withParent`, the parent entry is prepended.
 */
export async function getFolderContent(folderHandle, withParent = false) {
    const layer = [];
    if (withParent && folderHandle.parent) {
        const parentEntry = folderHandle.parent;
        parentEntry.isParent = true;
        layer.push(parentEntry);
    }
    for await (const entry of await folderHandle.values()) {
        const matchExtension = entry.name.match(/\.([^.]+)$/i);

        entry.parent = folderHandle;
        entry.isParent = false;
        entry.fullPath = (folderHandle.fullPath || "") + "/" + entry.name;
        entry.extension = matchExtension ? matchExtension[1].toLowerCase() : null;

        layer.push(entry);
    }
    return layer;
}

/** Recursively build a sorted tree: [{ parent, handle, children | null }]. */
export async function getFolderTree(folderHandle) {
    var out = [];
    for (const entry of await getFolderContent(folderHandle)) {
        out.push({
            parent: folderHandle,
            handle: entry,
            children: isFolder(entry) ? await getFolderTree(entry) : null,
        });
    }
    out.sort((a, b) => (a.handle.fullPath > b.handle.fullPath ? 1 : b.handle.fullPath > a.handle.fullPath ? -1 : 0));
    return out;
}

export async function checkFileExists(parentHandle, fileName) {
    try {
        await parentHandle.getFileHandle(fileName);
        return true;
    } catch {
        return false;
    }
}

export async function checkFolderExists(parentHandle, folderName) {
    try {
        await parentHandle.getDirectoryHandle(folderName);
        return true;
    } catch {
        return false;
    }
}

export async function checkEntryExists(parentHandle, entryName) {
    return (await checkFileExists(parentHandle, entryName)) || (await checkFolderExists(parentHandle, entryName));
}

/** Compare readable files and explicitly report paths whose contents are unknown. */
export async function compareFolders(sourceFolderHandle, targetFolderHandle, skipHidden = true) {
    const output = { newFiles: [], removedFiles: [], editedFiles: [], unreadable: [], complete: true };
    const unknown = [];
    const recordError = (side, path, directory, error) => {
        unknown.push({ path, directory });
        output.unreadable.push({ side, path: path || "/", directory, message: error.message });
        output.complete = false;
    };
    async function walkFolder(folderHandle, side, basePath = "") {
        const files = Object.create(null);
        let entries;
        try {
            entries = await getFolderContent(folderHandle);
        } catch (error) {
            recordError(side, basePath, true, error);
            return files;
        }
        for (const entry of entries) {
            if (skipHidden && entry.name.startsWith(".")) continue;
            const path = basePath + "/" + entry.name;
            if (isFolder(entry)) {
                Object.assign(files, await walkFolder(entry, side, path));
            } else {
                try {
                    files[path] = await getFileText(entry);
                } catch (error) {
                    recordError(side, path, false, error);
                }
            }
        }
        return files;
    }
    const sourceFiles = await walkFolder(sourceFolderHandle, "source");
    const targetFiles = await walkFolder(targetFolderHandle, "target");
    for (const path of new Set([...Object.keys(sourceFiles), ...Object.keys(targetFiles)])) {
        // An unreadable file/subtree is unknown, never evidence of deletion.
        if (unknown.some((entry) => path === entry.path || (entry.directory && path.startsWith(entry.path + "/")))) continue;
        const sourceText = sourceFiles[path];
        const targetText = targetFiles[path];
        if (sourceText === undefined) output.removedFiles.push({ path, text: targetText });
        else if (targetText === undefined) output.newFiles.push({ path, text: sourceText });
        else if (sourceText !== targetText) output.editedFiles.push({ path, sourceFileText: sourceText, targetFileText: targetText });
    }
    return output;
}

// Create -------------------------------------

export async function addNewFolder(parentHandle, newFolderName) {
    const handle = await parentHandle.getDirectoryHandle(newFolderName, { create: true });
    await settleDriveMutation(handle);
    return handle;
}

export async function addNewFile(parentHandle, newFileName) {
    const handle = await parentHandle.getFileHandle(newFileName, { create: true });
    await settleDriveMutation(handle);
    return handle;
}

/** Delete an entry, propagating errors to the caller. */
export async function removeEntry(parentHandle, entryHandle) {
    await parentHandle.removeEntry(entryHandle.name, { recursive: isFolder(entryHandle) });
    await settleDriveMutation(parentHandle);
}

export async function cleanFolder(parentHandle) {
    for (const entry of await getFolderContent(parentHandle)) {
        await removeEntry(parentHandle, entry);
    }
}

async function containsEntry(directory, entry) {
    if (await isSameEntrySafe(directory, entry)) return true;
    if (!directory.resolve) return false;
    try {
        return (await directory.resolve(entry)) !== null;
    } catch (error) {
        // Native handles reject handles from another file source.
        if (error.name === "TypeError") return false;
        throw error;
    }
}

/** Copy all contents, including hidden files. Never copy a folder into itself. */
export async function copyEntry(entryHandle, targetFolderHandle, newName, { skipHidden = false } = {}) {
    if (isFolder(entryHandle)) {
        if (await containsEntry(entryHandle, targetFolderHandle)) {
            throw new Error("Cannot copy a folder into itself or one of its subfolders.");
        }
        return _copyFolder(entryHandle, targetFolderHandle, newName, { skipHidden });
    }
    const fileData = await entryHandle.getFile();
    const newFileHandle = await addNewFile(targetFolderHandle, newName);
    if (await isSameEntrySafe(entryHandle, newFileHandle)) {
        throw new Error("Cannot copy a file onto itself.");
    }
    await writeFileData(newFileHandle, fileData);
    return newFileHandle;
}

/** Copy a folder's contents, optionally cleaning the destination and skipping dotfiles. */
export async function backupFolder(folderHandle, newFolderHandle, clean = false, skipHidden = true) {
    // Validate before cleaning: overlapping trees can delete the source or recurse forever.
    if (await containsEntry(folderHandle, newFolderHandle) || await containsEntry(newFolderHandle, folderHandle)) {
        throw new Error("Source and destination folders must not contain each other.");
    }
    const entries = await getFolderContent(folderHandle);
    if (clean) await cleanFolder(newFolderHandle);
    for (const entry of entries) {
        if (skipHidden && entry.name.startsWith(".")) continue;
        await copyEntry(entry, newFolderHandle, entry.name, { skipHidden });
    }
}

export async function _copyFolder(folderHandle, targetFolderHandle, newName, { skipHidden = false } = {}) {
    const newFolderHandle = await addNewFolder(targetFolderHandle, newName);
    await backupFolder(folderHandle, newFolderHandle, false, skipHidden);
    return newFolderHandle;
}

export async function renameEntry(parentHandle, entryHandle, newName) {
    if (entryHandle.name === newName) return entryHandle;
    if (await checkEntryExists(parentHandle, newName)) {
        throw new Error(`An entry named "${newName}" already exists.`);
    }
    const newEntryHandle = await copyEntry(entryHandle, parentHandle, newName);
    // A failed copy must never reach the deletion of the original.
    await removeEntry(parentHandle, entryHandle);
    return newEntryHandle;
}

export async function moveEntry(parentHandle, entryHandle, targetFolderHandle) {
    if (await isSameEntrySafe(parentHandle, targetFolderHandle)) return entryHandle;
    if (await checkEntryExists(targetFolderHandle, entryHandle.name)) {
        throw new Error(`An entry named "${entryHandle.name}" already exists.`);
    }
    const newEntryHandle = await copyEntry(entryHandle, targetFolderHandle, entryHandle.name);
    await removeEntry(parentHandle, entryHandle);
    return newEntryHandle;
}

/** Trigger a browser download and release its temporary object URL. */
export function downloadAsFile(filename, data) {
    const file = new Blob([data], { type: "application/octet-stream" });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
        anchor.remove();
        URL.revokeObjectURL(url);
    }, 0);
}
