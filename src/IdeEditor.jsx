/* eslint-disable react/prop-types */

// ace
import AceEditor from "react-ace";

export default function IdeEditor({ fileKey, fileLookUp, setFileLookUp }) {
    return (
        <AceEditor
            value={fileLookUp[fileKey].userText}
            // onChange={(newValue) => {
            //     setFileLookUp((cur) => {
            //         return { ...cur, [fileKey]: { ...cur[fileKey], userText: newValue } };
            //     });
            // }} // this will make the editor very slow
        />
    );
}
