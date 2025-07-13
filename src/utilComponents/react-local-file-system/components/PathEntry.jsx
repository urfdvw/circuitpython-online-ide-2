import React, { useContext } from "react";
import { Button } from "@mui/material";
import ApplyDrop from "./ApplyDrop";
import { getPathEntryLabel } from "../utilities/uiUtils";
import CurFolderContext from "../contexts/CurFolderContext";
import DragContext from "../contexts/DragContext";

export default function PathEntry({ entryHandle }) {
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
