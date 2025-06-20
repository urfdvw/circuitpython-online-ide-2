import { Tooltip, Typography, Box } from "@mui/material";
import AppContext from "../AppContext";
import { useState, useContext, useEffect } from "react";

export default function CornerIcons() {
    const { appConfig } = useContext(AppContext);

    const [time, setTime] = useState("");
    const [timeFull, setTimeFull] = useState("");
    useEffect(() => {
        const interval = setInterval(() => {
            var date = new Date();
            setTime(date.toLocaleTimeString([], { timeStyle: "short" }).slice(0, -3));
            setTimeFull(date.toLocaleString());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Box sx={{ height: "100%", alignContent: "center" }}>
            {appConfig.config.general.show_time ? (
                <Tooltip title={timeFull}>
                    <Typography component={"span"} sx={{ padding: "5px" }}>
                        &nbsp;{time}
                    </Typography>
                </Tooltip>
            ) : (
                <></>
            )}
        </Box>
    );
}
