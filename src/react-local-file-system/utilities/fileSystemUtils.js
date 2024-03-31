// file level ====================================

export async function writeFileText(fileHandle, text) {
    // Create a FileSystemWritableFileStream to write to.
    const writable = await fileHandle.createWritable();
    // Write the contents of the file to the stream.
    await writable.write(text);
    // Close the file and write the contents to disk.
    await writable.close();
    console.log("Successfully wrote to", fileHandle.name);
}

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

export async function isfileSame(entryHandle, text) {
    if (entryHandle === null) {
        return false;
    }
    try {
        const fileText = await getFileText(entryHandle);
        return text === fileText;
    } catch {
        return false;
    }
}

export async function getFolderContent(folderHandle, withParent = false) {
    const layer = [];
    if (withParent && folderHandle.parent) {
        const parentEntry = folderHandle.parent;
        parentEntry.isParent = true;
        layer.push(parentEntry);
    }
    for await (const entry of await folderHandle.values()) {
        const matchExtension = entry.name.match(/\.([^\.]+)$/i);

        entry.parent = folderHandle;
        entry.isParent = false;
        entry.fullPath = (folderHandle.fullPath || "") + "/" + entry.name;
        entry.extension = matchExtension ? matchExtension[1].toLowerCase() : null;

        layer.push(entry);
    }
    return layer;
}

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

export function compareFolderTrees(tree1, tree2) {
    // Check if both trees are empty/null
    if (!tree1 && !tree2) return true;

    // If one of them is null but not both, they are not the same
    if (!tree1 || !tree2) return false;

    // Check if the number of nodes at the current level is the same
    if (tree1.length !== tree2.length) return false;

    // Recursively compare each node in the tree
    for (let i = 0; i < tree1.length; i++) {
        // Compare current node's properties other than children
        if (tree1[i].handle.fullPath !== tree2[i].handle.fullPath) {
            console.log(tree1[i].handle.fullPath, tree2[i].handle.fullPath, "not eq");
            return false;
        }

        // If both nodes have children, compare them recursively
        if (tree1[i].children && tree2[i].children) {
            if (!compareFolderTrees(tree1[i].children, tree2[i].children)) return false;
        } else if (tree1[i].children || tree2[i].children) {
            // If one has children but the other does not, they are not the same
            return false;
        }
    }

    // If all checks passed, the trees are the same
    return true;
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

// Create -------------------------------------

export async function addNewFolder(parentHandle, newFolderName) {
    return await parentHandle.getDirectoryHandle(newFolderName, {
        create: true,
    });
}

export async function addNewFile(parentHandle, newFileName) {
    return await parentHandle.getFileHandle(newFileName, {
        create: true,
    });
}

export async function addRandomFolderTree(folderHandle, numLayers, numEntries) {
    // this function is mostly for testing
    var layerFolders = [folderHandle];
    for (let layerIndex = 0; layerIndex < numLayers; layerIndex++) {
        const nextLayerFolder = [];
        for (const curFolderHandle of layerFolders) {
            for (let entryIndex = 0; entryIndex < numEntries; entryIndex++) {
                const randomNumber = Math.random();
                if (randomNumber < 0.7) {
                    // make folder
                    nextLayerFolder.push(await addNewFolder(curFolderHandle, String(randomNumber)));
                } else {
                    await addNewFile(curFolderHandle, String(randomNumber));
                }
            }
        }
        layerFolders = nextLayerFolder;
    }
}

// Delete -----------------------------------------

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
    await parentHandle.removeEntry(folderHandle.name);
}

export async function _removeFile(parentHandle, fileHandle) {
    await parentHandle.removeEntry(fileHandle.name);
}

// Copy --------------------------------------

export async function copyEntry(entryHandle, targetFolderHandle, newName) {
    if (isFolder(entryHandle)) {
        return await _copyFolder(entryHandle, targetFolderHandle, newName);
    } else {
        return await _copyFile(entryHandle, targetFolderHandle, newName);
    }
}

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
    const fileData = await fileHandle.getFile();
    const newFileHandle = await addNewFile(targetFolderHandle, newName);
    const writable = await newFileHandle.createWritable();
    await writable.write(fileData);
    await writable.close();
    return newFileHandle;
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
