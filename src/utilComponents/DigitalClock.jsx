import { Tooltip, Typography } from "@mui/material";
import { useState, useEffect } from "react";

export default function DigitalClock() {
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
        <Tooltip title={timeFull}>
            <Typography component={"span"} sx={{ padding: "5px" }}>
                &nbsp;{time}
            </Typography>
        </Tooltip>
    );
}
