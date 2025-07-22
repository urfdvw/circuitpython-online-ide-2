import TabTemplate from "../utilComponents/TabTemplate";
import { useContext } from "react";
import { AppContext } from "../AppContext";
import { getFromPath, checkFileExists } from "../utilComponents/react-local-file-system/utilities/fileSystemUtils";

const LIB_PATH = ".lib"; // move to const

async function getInstalledLibs(rootDirHandle) {
    const libFileExists = await checkFileExists(rootDirHandle, LIB_PATH);
    if (!libFileExists) {
        return "no such file";
        // need better corner case handle in a higher level
    }
    const text = await getFromPath(rootDirHandle, LIB_PATH);
    return text;
}

export default function LibManagement() {
    const { appConfig, rootFolderDirectoryReady, rootDirHandle } = useContext(AppContext);
    const menuStructure = [
        {
            text: "Upgrade all libs",
            handler: async () => {
                console.log("Upgrade all libraries clicked");
                if (!rootFolderDirectoryReady) {
                    console.log("no root dir yet");
                    return;
                }
                const installedLibs = await getInstalledLibs(rootDirHandle);
                console.log(installedLibs);
            },
        },
    ];

    return <TabTemplate menuStructure={menuStructure} title="Library Management"></TabTemplate>;
}
