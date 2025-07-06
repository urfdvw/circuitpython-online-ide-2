import { Box, Typography } from "@mui/material";
import { grey } from "@mui/material/colors";
import MenuBar from "./MenuBar";

export default function TabTemplate({ children, menuStructure = [], title = "" }) {
    const DARK_GREY = grey[300];
    return (
        <Box sx={{ display: "flex", height: "100%", flexDirection: "column" }}>
            <Box
                sx={{
                    flexGrow: 0,
                    display: "flex",
                    flexDirection: "row",
                    width: "100%",
                    borderBottom: `1px solid ${DARK_GREY}`,
                    margin: "0px",
                    padding: "0px",
                }}
            >
                <Box sx={{ flexGrow: 1, overflowX: "auto", alignContent: "center" }}>
                    <Typography sx={{ paddingLeft: "5px" }}>
                        {title}
                    </Typography>
                </Box>
                <Box sx={{ flexGrow: 0 }}>
                    <MenuBar menuStructure={menuStructure} />
                </Box>
            </Box>
            <Box sx={{ flexGrow: 1, overflowY: "auto" }}>{children}</Box>
        </Box>
    );
}
