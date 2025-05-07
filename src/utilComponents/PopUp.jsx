import NewWindow from "react-new-window";

export default function PopUp({ children, altChildren = <></>, popped, setPopped, title = "", parentStyle }) {
    return popped ? (
        <>
            {altChildren}
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
        <div style={parentStyle}>{children}</div>
    );
}
