import MenuBar from "../utilComponents/MenuBar";
import { grey, red } from "@mui/material/colors";

export default function AppMenu() {
    const DARK_RED = red[900];
    const DARK_GREY = grey[900];

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
            ],
        },
        {
            text: "Help",
            color: DARK_GREY,
            handler: () => {
                console.log("App menu bar -> Help");
            },
        },
    ];
    return <MenuBar menuStructure={menuStructure} />;
}
