import { useContext } from "react";
import AppContext from "../AppContext";

export default function Placeholder({ node }) {
    const { testCount, setTestCount } = useContext(AppContext);
    return (
        <div>
            <p>{node.getName()}</p>
            <button onClick={() => setTestCount((count) => count + 1)}>count is {testCount}</button>
        </div>
    );
}
