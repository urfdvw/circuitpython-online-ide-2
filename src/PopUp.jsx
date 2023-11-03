import { useState } from "react";
import NewWindow from "react-new-window";

export default function PopUp({ children, title }) {
    const [popped, setPopped] = useState(false);
    return popped ? (
        <>
            <button
                onClick={() => {
                    setPopped(false);
                }}
            >
                dock the window
            </button>
            <NewWindow
                title={title}
                onUnload={() => {
                    setPopped(false);
                }}
            >
                {children}
            </NewWindow>
        </>
    ) : (
        <>
            <button
                onClick={() => {
                    setPopped(true);
                }}
            >
                pop the window
            </button>
            {children}
        </>
    );
}
