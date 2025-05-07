import { Typography, Toolbar, Button } from "@mui/material";
import Menu from "./Menu";

export default function TabToolBar({ children, title = "", tools = null, hiddenTools = null }) {

    /*
        // const hiddenTools = [
        const tools = [
            {
                text: "Help",
                handler: () => {
                    console.log("App menu bar -> Help");
                },
            },
            ...
        ];
    */
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "2px solid rgb(239,239,239)",
                width: "100%",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "left",
                    flex: 1,
                }}
            >
                <Typography component="p" sx={{ marginLeft: "10pt" }}>
                    {title}
                </Typography>
            </div>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "left",
                }}
            >
                <Toolbar variant="dense" disableGutters={true} sx={{ minHeight: "35px", maxHeight: "35px" }}>
                    {children}
                    {tools ? (
                        tools.map((tool) => (
                            <Button onClick={tool.handler} key={tool.text}>
                                {tool.text}
                            </Button>
                        ))
                    ) : (
                        <></>
                    )}
                    {hiddenTools ? <Menu label="⋮" options={hiddenTools} /> : <></>}
                </Toolbar>
            </div>
        </div>
    );
}
