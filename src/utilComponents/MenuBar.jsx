import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Menu from "./Menu";

export default function MenuBar({ menuStructure }) {
    /*
        const menuStructure = [
            {
                label: "Bible Presenter",
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
    );
}
