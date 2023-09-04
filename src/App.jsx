import { useState } from "react";
import "./App.css";
import build_config from "../build-config.json";

function App() {
    const [count, setCount] = useState(0);

    return (
        <div className="ide">
            <div className="ide-header">header</div>
            <div className="ide-body">
                body
                <p>
                    {build_config["single-file"]
                        ? "Single file"
                        : "Github Release"}
                </p>
                <button onClick={() => setCount((count) => count + 1)}>
                    count is {count}
                </button>
            </div>
            <div className="ide-tail">tail</div>
        </div>
    );
}

export default App;
