import { checkEntryExists, isFolder } from "./fileSystemUtils";

export async function promptUniqueName(folderHandle, promptLabel, actualName) {
    const newName = prompt(promptLabel, actualName);
    if (!newName || newName === actualName) {
        return;
    }
    if (await checkEntryExists(folderHandle, newName)) {
        alert('"' + newName + '" is an existing name.\nPlease try again with another name.');
        return;
    }
    return newName;
}

export function getPathEntryLabel(entryName) {
    return entryName === "\\" ? "ROOT" : entryName;
}

export async function getDuplicateName(parentHandle, entry) {
    let cloneIndex = 0;
    let namePart = entry.name;
    let extensionPart = null;

    if (!isFolder(entry)) {
        const fileNameParts = entry.name.match(/^(.*)(\.[^\.]+)$/);
        if (fileNameParts) {
            namePart = fileNameParts[1];
            extensionPart = fileNameParts[2];
        }
    }

    let cloneName = namePart + "_copy" + (extensionPart || "");
    while (await checkEntryExists(parentHandle, cloneName)) {
        cloneIndex++;
        cloneName = namePart + "_copy_" + cloneIndex.toString() + (extensionPart || "");
    }

    return cloneName;
}
