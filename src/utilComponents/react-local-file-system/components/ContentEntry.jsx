import { useContext } from "react";

import { ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";

import {
    DescriptionOutlined as FileIcon,
    FolderOutlined as FolderIcon,
    KeyboardReturnOutlined as ReturnIcon,
} from "@mui/icons-material";
import CurFolderContext from "../contexts/CurFolderContext";
import DragContext from "../contexts/DragContext";
import ApplyContextMenu from "./ApplyContextMenu";
import ApplyDrop from "./ApplyDrop";
import { isFolder, renameEntry, copyEntry, removeEntry } from "../utilities/fileSystemUtils";
import { promptUniqueName, getDuplicateName } from "../utilities/uiUtils";

export default function ContentEntry({ entryHandle }) {
    const { currentFolderHandle, onFileClick, showFolderView, setIsLoading } = useContext(CurFolderContext);
    const { setEntryOnDrag, handleDrop } = useContext(DragContext);

    const entryName = entryHandle.isParent ? ".." : entryHandle.name;
    const isDraggable = !entryHandle.isParent;

    const iconSize = 20;

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
                try {
                    await removeEntry(currentFolderHandle, entryHandle);
                } catch {
                    console.warn("remove file failed");
                }
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
        <ListItem onContextMenu={(e) => e.preventDefault()} disablePadding dense>
            <ListItemButton onClick={onClickHandler}>
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
