import { sleep } from "../../../utilFunctions/sleep";

// Re-exported for existing import sites; the single source of truth is utilFunctions/sleep.js.
export { sleep };

// path level ====================================

// 规范化路径：反斜杠 -> 斜杠，按 / 拆分并去掉空段
export function normalizePath(rawPath) {
    return String(rawPath || "")
        .replace(/\\/g, "/")
        .split("/")
        .map((s) => s.trim())
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
    const { create = true, treatLastAsFile = false } = opt;

    // 1) 规范化路径
    const levels = normalizePath(rawPath);

    // 边界：空路径，直接返回起点目录
    if (levels.length === 0) {
        return { dirHandle: directoryHandle, fileHandle: null };
    }

    // 简单的“看起来像文件名”判断：包含 . 且不是以 . 开头的隐藏目录
    const looksLikeFile = (name) => /\.[^./\\]+$/.test(name) && !/^\.[^/\\]+$/.test(name);

    // 2) 逐级进入到“最后一段的父目录”
    let curDir = directoryHandle;
    for (let i = 0; i < levels.length - 1; i++) {
        const seg = levels[i];
        curDir = await curDir.getDirectoryHandle(seg, { create });
    }

    // 3) 处理最后一段：可能是目录，也可能是文件
    const last = levels[levels.length - 1];
    const lastIsFile = treatLastAsFile || looksLikeFile(last);

    if (lastIsFile) {
        const fileHandle = await curDir.getFileHandle(last, { create });
        // 对于文件，返回父目录 + 文件句柄
        return { dirHandle: curDir, fileHandle };
    } else {
        const dirHandle = await curDir.getDirectoryHandle(last, { create });
        return { dirHandle, fileHandle: null };
    }
}

/** Write `text` to the file at `path`, creating intermediate folders. Failures show a confirm() dialog. */
export async function writeToPath(rootDirHandle, path, text) {
    const { fileHandle } = await path2Handles(rootDirHandle, path);
    await writeFileText(fileHandle, text);
}

// Like writeToPath, but always treats the last segment as a file and lets failures
// throw instead of popping a confirm() dialog. Creates intermediate folders.
export async function writeToPathStrict(rootDirHandle, path, text) {
    const { fileHandle } = await path2Handles(rootDirHandle, path, { create: true, treatLastAsFile: true });
    const writable = await fileHandle.createWritable();
    await writable.write(String(text));
    await writable.close();
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
    const { dirHandle: parent } = await path2Handles(rootDirHandle, parentPath, { create: false });
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
    const levels = normalizePath(rawPath);
    if (levels.length === 0) return true;
    const name = levels[levels.length - 1];
    const parentPath = levels.slice(0, -1).join("/");
    try {
        const { dirHandle: parent } = await path2Handles(rootDirHandle, parentPath, { create: false });
        return await checkEntryExists(parent, name);
    } catch {
        return false;
    }
}

/** Read the text of the file at `path`. NOTE: creates the file if missing (create:true default). */
export async function getFromPath(rootDirHandle, path) {
    const { fileHandle } = await path2Handles(rootDirHandle, path);
    return await getFileText(fileHandle);
}

// Read a file's text WITHOUT creating it (getFromPath defaults to create:true, so
// merely probing for a missing file would drop an empty one into the folder).
// Returns null when the file doesn't exist or can't be read.
export async function getFromPathIfExists(rootDirHandle, path) {
    try {
        const { fileHandle } = await path2Handles(rootDirHandle, path, { create: false });
        return await getFileText(fileHandle);
    } catch {
        return null;
    }
}
// file level ====================================

/** Write `text` into an existing file handle. Failures show a confirm() dialog instead of throwing. */
export async function writeFileText(fileHandle, text) {
    try {
        // Create a FileSystemWritableFileStream to write to.
        const writable = await fileHandle.createWritable();
        // Write the contents of the file to the stream.
        await writable.write(text);
        // Close the file and write the contents to disk.
        await writable.close();
        console.log("Successfully wrote to", fileHandle.name);
        await sleep(200); // chill down
    } catch (error) {
        confirm("Write to file failed. " + error.message);
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

/** Whether the handle is still readable (detects revoked/detached handles, e.g. after unplugging). */
export async function isEntryHealthy(entryHandle) {
    if (entryHandle === null) {
        return false;
    }
    if (isFolder(entryHandle)) {
        try {
            // eslint-disable-next-line no-unused-vars
            for await (const [key, value] of entryHandle.entries()) {
                break;
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

/** Diff two folders by file text -> { newFiles, removedFiles, editedFiles } (paths + contents). */
export async function compareFolders(sourceFolderHandle, targetFolderHandle, skipHidden = true) {
    const output = {
        newFiles: [],
        removedFiles: [],
        editedFiles: [],
    };

    async function walkFolder(folderHandle, basePath = "") {
        const files = {};
        for await (const entry of await getFolderContent(folderHandle)) {
            if (skipHidden && entry.name.startsWith(".")) continue;
            const fullPath = basePath + "/" + entry.name;
            if (isFolder(entry)) {
                const subFiles = await walkFolder(entry, fullPath);
                Object.assign(files, subFiles);
            } else {
                try {
                    const content = await getFileText(entry);
                    files[fullPath] = content;
                } catch {
                    // skip unreadable files
                }
            }
        }
        return files;
    }

    const sourceFiles = await walkFolder(sourceFolderHandle);
    const targetFiles = await walkFolder(targetFolderHandle);

    const allPaths = new Set([...Object.keys(sourceFiles), ...Object.keys(targetFiles)]);

    for (const path of allPaths) {
        const sourceText = sourceFiles[path];
        const targetText = targetFiles[path];

        if (sourceText === undefined) {
            output.removedFiles.push({ path, text: targetText });
        } else if (targetText === undefined) {
            output.newFiles.push({ path, text: sourceText });
        } else if (sourceText !== targetText) {
            output.editedFiles.push({
                path,
                sourceFileText: sourceText,
                targetFileText: targetText,
            });
        }
    }

    return output;
}

// Create -------------------------------------

export async function addNewFolder(parentHandle, newFolderName) {
    try {
        const newFolder = await parentHandle.getDirectoryHandle(newFolderName, {
            create: true,
        });
        await sleep(200); // chill down
        return newFolder;
    } catch (error) {
        confirm("Folder creation failed. " + error.message);
    }
}

export async function addNewFile(parentHandle, newFileName) {
    try {
        const newFile = await parentHandle.getFileHandle(newFileName, {
            create: true,
        });
        await sleep(200); // chill down
        return newFile;
    } catch (error) {
        confirm("File creation failed. " + error.message);
    }
}

// Delete -----------------------------------------

/** Delete a file or folder (recursively). Requires a secure context (https). */
export async function removeEntry(parentHandle, entryHandle) {
    // Will not work without https
    if (isFolder(entryHandle)) {
        await _removeFolder(parentHandle, entryHandle);
    } else {
        await _removeFile(parentHandle, entryHandle);
    }
}

export async function cleanFolder(parentHandle) {
    const folder_content = await getFolderContent(parentHandle);
    folder_content.sort((a, b) => {
        if (a.name.startsWith(".")) {
            return -1;
        }
        if (b.name.startsWith(".")) {
            return 1;
        }
        return 0;
    });
    for (var i = 0; i < folder_content.length; i++) {
        await removeEntry(parentHandle, folder_content[i]);
    }
}

export async function _removeFolder(parentHandle, folderHandle) {
    await cleanFolder(folderHandle);
    try {
        await parentHandle.removeEntry(folderHandle.name);
        await sleep(200); // chill down
    } catch (error) {
        confirm("Failed to remove folder. " + error.message);
    }
}

export async function _removeFile(parentHandle, fileHandle) {
    try {
        await parentHandle.removeEntry(fileHandle.name);
        await sleep(200); // chill down
    } catch (error) {
        confirm("Failed to remove file. " + error.message);
    }
}

// Copy --------------------------------------

/** Copy a file or folder (recursively) into `targetFolderHandle` under `newName`. */
export async function copyEntry(entryHandle, targetFolderHandle, newName) {
    if (isFolder(entryHandle)) {
        return await _copyFolder(entryHandle, targetFolderHandle, newName);
    } else {
        return await _copyFile(entryHandle, targetFolderHandle, newName);
    }
}

/** Copy a folder's contents into another folder, optionally emptying it first and skipping dotfiles. */
export async function backupFolder(folderHandle, newFolderHandle, clean = false, skipHidden = true) {
    if (clean) {
        await cleanFolder(newFolderHandle);
    }
    for (const entry of await getFolderContent(folderHandle)) {
        if (skipHidden) {
            if (entry.name.startsWith(".")) {
                continue;
            }
        }
        await copyEntry(entry, newFolderHandle, entry.name);
    }
}

export async function _copyFolder(folderHandle, targetFolderHandle, newName) {
    const newFolderHandle = await addNewFolder(targetFolderHandle, newName);
    await backupFolder(folderHandle, newFolderHandle);
    return newFolderHandle;
}

async function _copyFile(fileHandle, targetFolderHandle, newName) {
    try {
        const fileData = await fileHandle.getFile();
        const newFileHandle = await addNewFile(targetFolderHandle, newName);
        const writable = await newFileHandle.createWritable();
        await writable.write(fileData);
        await writable.close();
        await sleep(200); // chill down
        return newFileHandle;
    } catch (error) {
        confirm("Write to file failed. " + error.message);
    }
}

// Compound (Copy then Delete) ----------------------------------

export async function renameEntry(parentHandle, entryHandle, newName) {
    const newEntryHandle = await copyEntry(entryHandle, parentHandle, newName);
    await removeEntry(parentHandle, entryHandle);
    return newEntryHandle;
}

export async function moveEntry(parentHandle, entryHandle, targetFolderHandle) {
    const newEntryHandle = await copyEntry(entryHandle, targetFolderHandle, entryHandle.name);
    await removeEntry(parentHandle, entryHandle);
    return newEntryHandle;
}

// MISC
/** Trigger a browser download of `data` as `filename`. */
export function downloadAsFile(filename, data) {
    // Function to download data to a file
    var file = new Blob([data], { type: "text" });
    if (window.navigator.msSaveOrOpenBlob)
        // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else {
        // Others
        var a = document.createElement("a"),
            url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}
