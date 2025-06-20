import { useContext } from "react";
import AppContext from "../AppContext";
import TabTemplate from "../utilComponents/TabTemplate";

export default function Placeholder({ node }) {
    const { testCount, setTestCount } = useContext(AppContext);
    const menuStructure = [
        {
            text: "Add",
            handler: () => {
                setTestCount((count) => count + 1);
            },
        },
        {
            label: "≡",
            options: [
                {
                    text: "Minus",
                    handler: () => {
                        setTestCount((count) => count - 1);
                    },
                },
            ],
        },
    ];
    const title = node.getName();
    return (
        <TabTemplate menuStructure={menuStructure} title={title}>
            <p>{testCount}</p>
        </TabTemplate>
    );
}
