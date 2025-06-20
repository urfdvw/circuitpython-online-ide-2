import { Box, Stack, Button } from "@mui/material";
import Menu from "./Menu";

export default function MenuBar({ menuStructure, additionalElement }) {
    /*
        const menuStructure = [
            {
                label: "App title",
                color: DARK_RED,
                options: [
                    {
                        text: "About",
                        handler: () => {
                            console.log("App menu bar -> About");
                        },
                    },
                    ...
                ],
            },
            {
                text: "Help",
                color: DARK_GREY,
                handler: () => {
                    console.log("App menu bar -> Help");
                },
            },
            ...
        ];
    */
    return (
        <Box sx={{ display: "flex", flexDirection: "row", width: "100%", height: "100%" }}>
            <Box sx={{ flexGrow: 1 }}>
                <Stack direction="row" spacing={0}>
                    {menuStructure.map((column) => {
                        if (column.label !== undefined) {
                            return (
                                <Menu
                                    label={column.label}
                                    options={column.options}
                                    color={column.color}
                                    key={"menu_key_" + column.label}
                                />
                            );
                        } else if (column.text !== undefined) {
                            return (
                                <Button
                                    onClick={column.handler}
                                    key={column.text}
                                    style={{
                                        textTransform: "none",
                                        color: column.color,
                                        minWidth: "30px",
                                    }}
                                >
                                    {column.text}
                                </Button>
                            );
                        }
                    })}
                </Stack>
            </Box>
            {additionalElement === undefined ? null : (
                <Box sx={{ flexGrow: 0, minWidth: "30px" }}>{additionalElement}</Box>
            )}
        </Box>
    );
}
