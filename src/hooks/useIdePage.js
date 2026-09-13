import { useEffect } from "react";

export default function useIdePage(boardInfo, showBoardId) {
    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = previous; };
    }, []);

    useEffect(() => {
        document.title = showBoardId && boardInfo?.board_id
            ? "CPy: " + boardInfo.board_id.replaceAll("_", " ")
            : "CircuitPython Online IDE";
    }, [boardInfo, showBoardId]);
}
