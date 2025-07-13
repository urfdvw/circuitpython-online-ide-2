// context
import { useContext } from "react";
import AppContext from "../AppContext";
// UI
import TabedPages from "../utilComponents/TabedPages";
import MarkdownExtended from "../utilComponents/MarkdownExtended";
// data
import docs from "../docs";

export default function Help() {
    const { helpTabSelection } = useContext(AppContext);
    return (
        <TabedPages
            pages={docs.map((doc) => {
                return {
                    ...doc,
                    body: <MarkdownExtended>{doc.body}</MarkdownExtended>,
                };
            })}
            tabValue={helpTabSelection.tabValue}
            setTabValue={helpTabSelection.setTabValue}
        />
    );
}
