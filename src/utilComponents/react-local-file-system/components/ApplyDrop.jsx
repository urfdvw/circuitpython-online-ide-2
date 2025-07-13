import React from "react";

export default function ApplyDrop({ children, onDropHandler }) {
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
