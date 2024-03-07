import { useState, createContext, useContext, useEffect } from "react";

import {
    Backdrop,
    Breadcrumbs,
    Button,
    CircularProgress,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Toolbar,
    Tooltip,
    Typography,
} from "@mui/material";

import {
    CreateNewFolderOutlined as NewFolderIcon,
    DescriptionOutlined as FileIcon,
    FolderOutlined as FolderIcon,
    InsertDriveFileOutlined as BinaryFileIcon,
    KeyboardReturnOutlined as ReturnIcon,
    NoteAddOutlined as NewFileIcon,
    RefreshOutlined as RefreshIcon,
} from "@mui/icons-material";

// *****************************************
// COMPONENTS
// *****************************************

// wrapper

function ApplyContextMenu({ children, items }) {
    const [contextMenu, setContextMenu] = useState(null);

    const handleContextMenu = (event) => {
        event.preventDefault();
        setContextMenu(
            contextMenu === null
                ? {
                      mouseX: event.clientX,
                      mouseY: event.clientY,
                  }
                : // repeated contextmenu when it is already open closes it with Chrome 84 on Ubuntu
                  // Other native context menus might behave different.
                  // With this behavior we prevent contextmenu from the backdrop to re-locale existing context menus.
                  null
        );
    };

    const handleClose = () => {
        setContextMenu(null);
    };

    return (
        <>
            <div onContextMenu={handleContextMenu} style={{ cursor: "context-menu" }}>
                {children}
                <Menu
                    open={contextMenu !== null}
                    onClose={handleClose}
                    anchorReference="anchorPosition"
                    anchorPosition={
                        contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
                    }
                >
                    {items.map((item) => {
                        return (
                            <MenuItem
                                key={"local_file_system_menu_item_key_" + item.name}
                                onClick={(event) => {
                                    handleClose();
                                    item.handler(event);
                                }}
                            >
                                {item.name}
                            </MenuItem>
                        );
                    })}
                </Menu>
            </div>
        </>
    );
}

function ApplyDrop({ children, onDropHandler }) {
    return (
        <div
            onDrop={onDropHandler}
            onDragOver={(event) => {
                event.preventDefault(); // to allow drop
            }}
        >
            {children}
        </div>
    );
}

// Entry

function ContentEntry({ entryHandle }) {
    const { currentFolderHandle, onFileClick, showFolderView, setIsLoading } = useContext(CurFolderContext);
    const { setEntryOnDrag, handleDrop } = useContext(DragContext);

    const entryName = entryHandle.isParent ? ".." : entryHandle.name;
    const isDraggable = !entryHandle.isParent;

    const itemSize = 30;
    const iconSize = itemSize - 10;

    const iconSx = { width: `${iconSize}px`, height: `${iconSize}px` };
    let icon = <FileIcon sx={iconSx} />;
    if (entryHandle.isParent) {
        icon = <ReturnIcon sx={iconSx} />;
    } else if (isFolder(entryHandle)) {
        icon = <FolderIcon sx={iconSx} />;
    }
    // handler
    const items = [
        {
            name: "Rename",
            handler: async (event) => {
                console.log("ContentEntry rename handler called", event);
                const newName = await promptUniqueName(
                    currentFolderHandle,
                    "Rename from '" + entryHandle.name + "' to:",
                    entryHandle.name
                );
                if (!newName) {
                    return;
                }
                setIsLoading(true);
                await renameEntry(currentFolderHandle, entryHandle, newName);
                await showFolderView(currentFolderHandle);
                setIsLoading(false);
            },
        },
        {
            name: "Duplicate",
            handler: async (event) => {
                console.log("ContentEntry duplicate handler called", event);
                const cloneName = await getDuplicateName(currentFolderHandle, entryHandle);
                setIsLoading(true);
                await copyEntry(entryHandle, currentFolderHandle, cloneName);
                await showFolderView(currentFolderHandle);
                setIsLoading(false);
            },
        },
        {
            name: "Remove",
            handler: async (event) => {
                console.log("ContentEntry remove handler called", event);
                if (!confirm('Are you sure to remove "' + entryHandle.name + '"?\nThis is not revertible!')) {
                    return;
                }
                setIsLoading(true);
                await removeEntry(currentFolderHandle, entryHandle);
                await showFolderView(currentFolderHandle);
                setIsLoading(false);
            },
        },
    ];
    function onClickHandler(event) {
        console.log("ContentEntry onClickHandler called", event);
        if (isFolder(entryHandle)) {
            showFolderView(entryHandle);
        } else {
            onFileClick(entryHandle);
        }
    }
    function onDragHandler(event) {
        console.log("ContentEntry onDragHandler called", event);
        setEntryOnDrag(entryHandle);
    }
    function onDropHandler(event) {
        console.log("ContentEntry onDropHandler called", event);
        handleDrop(entryHandle);
    }

    const entry = (
        <ListItem onContextMenu={(e) => e.preventDefault()} disablePadding dense sx={{ height: `${itemSize}px` }}>
            <ListItemButton onClick={onClickHandler} sx={{ height: `${itemSize}px` }}>
                <ListItemIcon sx={{ minWidth: `${iconSize + 5}px` }}>{icon}</ListItemIcon>
                <ListItemText draggable={isDraggable} onDragStart={onDragHandler} primary={entryName} />
            </ListItemButton>
        </ListItem>
    );

    const entryContextMenu = !entryHandle.isParent ? <ApplyContextMenu items={items}>{entry}</ApplyContextMenu> : entry;

    return isFolder(entryHandle) ? (
        <ApplyDrop onDropHandler={onDropHandler}>{entryContextMenu}</ApplyDrop>
    ) : (
        entryContextMenu
    );
}

function PathEntry({ entryHandle }) {
    const { showFolderView } = useContext(CurFolderContext);
    const { handleDrop } = useContext(DragContext);
    function onDropHandler(event) {
        console.log("PathEntry onDropHandler called", event);
        handleDrop(entryHandle);
    }
    function onClickHandler(event) {
        console.log("PathEntry onClickHandler called", event);
        showFolderView(entryHandle);
    }
    return (
        <ApplyDrop onDropHandler={onDropHandler}>
            <Button size="small" onClick={onClickHandler} sx={{ minWidth: 10, textTransform: "none" }}>
                {getPathEntryLabel(entryHandle.name)}
            </Button>
        </ApplyDrop>
    );
}

// over all

const CurFolderContext = createContext();
const DragContext = createContext();

export default function FolderView({ rootFolder, onFileClick }) {
    const [currentFolderHandle, setCurrentFolderHandle] = useState(rootFolder);
    const [entryOnDrag, setEntryOnDrag] = useState();
    const [path, setPath] = useState([rootFolder]);
    const [content, setContent] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    useEffect(() => {
        async function showRoot() {
            setCurrentFolderHandle(rootFolder);
            setContent(await getFolderContent(rootFolder));
            setPath([rootFolder]);
        }
        showRoot();
    }, [rootFolder]);

    async function showFolderView(folderHandle) {
        // set context
        setCurrentFolderHandle(folderHandle);
        // set content
        setContent(await getFolderContent(folderHandle, true));
        // set path
        // if folderHandle in path, cut what ever behind it
        for (var i = 0; i < path.length; i++) {
            if (await folderHandle.isSameEntry(path[i])) {
                setPath((curPath) => {
                    return curPath.slice(0, i + 1);
                });
                return;
            }
        }
        // else, append folderHandle at the back
        setPath((curPath) => {
            return [...curPath, folderHandle];
        });
    }

    async function handleDrop(targetFolder) {
        if (await targetFolder.isSameEntry(entryOnDrag)) {
            return;
        }
        if (await targetFolder.isSameEntry(currentFolderHandle)) {
            return;
        }
        if (await checkEntryExists(targetFolder, entryOnDrag.name)) {
            alert('"' + entryOnDrag.name + '" conflicts with another name in the target folder.');
            return;
        }
        setIsLoading(true);
        await moveEntry(currentFolderHandle, entryOnDrag, targetFolder);
        await showFolderView(currentFolderHandle);
        setIsLoading(false);
    }

    const toolbarItems = [
        {
            name: "new_file",
            title: "New file",
            icon: NewFileIcon,
            handler: async (event) => {
                console.log("FolderView new file called", event);
                const newName = await promptUniqueName(currentFolderHandle, "New file name:", "");
                if (!newName) {
                    return;
                }
                setIsLoading(true);
                const newFileHandle = await addNewFile(currentFolderHandle, newName);
                await showFolderView(currentFolderHandle);
                setIsLoading(false);
                newFileHandle.fullPath = (currentFolderHandle.fullPath || "") + "/" + newFileHandle.name;
                onFileClick(newFileHandle);
            },
        },
        {
            name: "new_folder",
            title: "New folder",
            icon: NewFolderIcon,
            handler: async (event) => {
                console.log("FolderView new folder called", event);
                const newName = await promptUniqueName(currentFolderHandle, "New folder name:", "");
                if (!newName) {
                    return;
                }
                setIsLoading(true);
                await addNewFolder(currentFolderHandle, newName);
                await showFolderView(currentFolderHandle);
                setIsLoading(false);
            },
        },
        {
            name: "refresh",
            title: "Refresh",
            icon: RefreshIcon,
            handler: async (event) => {
                console.log("Toolbar refresh called", event);
                setIsLoading(true);
                await showFolderView(currentFolderHandle);
                setIsLoading(false);
            },
        },
    ];

    return (
        <div
            style={{
                height: "100%",
                width: "100%",
                maxHeight: "100%",
                maxWidth: "100%",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <div
                style={{
                    flexGrow: 0,
                }}
            >
                <CurFolderContext.Provider value={{ currentFolderHandle, onFileClick, showFolderView, setIsLoading }}>
                    <DragContext.Provider value={{ setEntryOnDrag, handleDrop }}>
                        <Breadcrumbs aria-label="breadcrumb">
                            {path.map((entry) => (
                                <PathEntry entryHandle={entry} key={"local_file_system_path_key_" + entry.name} />
                            ))}
                        </Breadcrumbs>
                    </DragContext.Provider>
                </CurFolderContext.Provider>
                <Divider />
                <Toolbar variant="dense" disableGutters={true} sx={{ minHeight: "35px" }}>
                    <Typography component="div" noWrap={true} sx={{ flexGrow: 1, pl: 1, fontSize: "14px" }}>
                        {getPathEntryLabel(path[path.length - 1].name)}
                    </Typography>
                    {toolbarItems.map((item) => {
                        return (
                            <Tooltip
                                key={"local_file_system_toolbar_item_key_" + item.name}
                                id={item.name}
                                title={item.title}
                            >
                                <IconButton
                                    edge="start"
                                    size="small"
                                    style={{ borderRadius: 0 }}
                                    onClick={item.handler}
                                >
                                    <item.icon />
                                </IconButton>
                            </Tooltip>
                        );
                    })}
                </Toolbar>
                <Divider />
            </div>
            <div
                style={{
                    flexGrow: 1,
                    overflow: "auto",
                }}
            >
                <CurFolderContext.Provider value={{ currentFolderHandle, onFileClick, showFolderView, setIsLoading }}>
                    <DragContext.Provider value={{ setEntryOnDrag, handleDrop }}>
                        <List>
                            {content
                                .sort((a, b) => {
                                    if (a.isParent && !b.isParent) {
                                        return -1;
                                    }
                                    if (!a.isParent && b.isParent) {
                                        return 1;
                                    }
                                    if (isFolder(a) && !isFolder(b)) {
                                        return -1;
                                    }
                                    if (!isFolder(a) && isFolder(b)) {
                                        return 1;
                                    }
                                    if (a.name < b.name) {
                                        return -1;
                                    }
                                    if (a.name > b.name) {
                                        return 1;
                                    }
                                    return 0;
                                })
                                .filter((entry) => {
                                    return !entry.name.startsWith(".");
                                })
                                .map((entry) => (
                                    <ContentEntry entryHandle={entry} key={"file_system_content_key_" + entry.name} />
                                ))}
                        </List>
                    </DragContext.Provider>
                </CurFolderContext.Provider>
            </div>
            <div
                style={{
                    flexGrow: 0,
                }}
            >
                <Divider />
            </div>
            <Backdrop sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }} open={isLoading}>
                <CircularProgress color="inherit" />
            </Backdrop>
        </div>
    );
}

// *****************************************
// HOOK
// *****************************************

export const useFileSystem = () => {
    const [rootDirHandle, setRootDirHandle] = useState(null);
    const [directoryReady, setDirectoryReady] = useState(false);
    const [statusText, setStatusText] = useState("");

    // directoryReady
    useEffect(() => {
        const interval = setInterval(async () => {
            setDirectoryReady(await isEntryHealthy(rootDirHandle));
        }, 1000);
        return () => clearInterval(interval);
    }, [rootDirHandle]);

    // statusText
    useEffect(() => {
        setStatusText(() => {
            if (!rootDirHandle) {
                return "No Directory Connected";
            }
            if (!directoryReady) {
                return "Connecting";
            } else {
                const info = "Connected to " + rootDirHandle.name;
                return info;
            }
        });
    }, [rootDirHandle, directoryReady]);

    // Open dir
    async function openDirectory() {
        try {
            const dirHandle = await window.showDirectoryPicker({
                mode: "readwrite",
            });
            if (dirHandle) {
                console.log("Directory handle opened.");
                setRootDirHandle(dirHandle);
            } else {
                throw new Error("Failed to open directory handle. `dirHandle` created but empty"); // not sure wether this is reachiable
            }
        } catch (error) {
            alert(error);
            console.error(error);
        }
    }

    // Get Handles under root
    async function path2FolderHandles(path = "", create = false) {
        // change windows path to the world standard
        path.replace("\\", "/");
        // split path to levels
        const levels = path.split("/").map((level) => level.trim());
        // get dir handle
        let folderHandle = rootDirHandle;
        for (const level of levels) {
            if (level.length !== 0) {
                try {
                    folderHandle = await folderHandle.getDirectoryHandle(level, { create: create });
                } catch {
                    // if not found
                    console.log(path + " does not exist");
                    return;
                }
            }
        }
        return folderHandle;
    }

    return {
        openDirectory,
        directoryReady,
        statusText,
        rootDirHandle,
        path2FolderHandles,
    };
};

// *****************************************
// UTILITIES
// *****************************************

async function promptUniqueName(folderHandle, promptLabel, actualName) {
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

export async function backupFolder(folderHandle, newFolderHandle, clean = false) {
    if (clean) {
        await cleanFolder(newFolderHandle);
    }
    for (const entry of await getFolderContent(folderHandle)) {
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
