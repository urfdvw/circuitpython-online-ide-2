import TabTemplate from "../utilComponents/TabTemplate";

export default function LibManagement() {
    const menuStructure = [
        {
            text: "Upgrade all libs",
            handler: () => {
                console.log("Upgrade all libraries clicked");
            },
        },
    ];

    return <TabTemplate menuStructure={menuStructure} title="Library Management"></TabTemplate>;
}
