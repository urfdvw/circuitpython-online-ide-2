import { useState } from "react";
import "./App.css";
import build_config from "../build-config.json";

function App() {
    const [count, setCount] = useState(0);

    return (
        <>
            <p>
                {build_config["single-file"] ? "Single file" : "Github Release"}
            </p>
            <button onClick={() => setCount((count) => count + 1)}>
                count is {count}
            </button>
        </>
    );
}

export default App;
