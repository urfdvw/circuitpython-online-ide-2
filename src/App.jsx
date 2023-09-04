import { useState } from "react";
import "./App.css";
import build_config from "../build-config.json";
import Ide from "./ide";

function App() {

    return (
        <div className="ide">
            <div className="ide-header">header</div>
            <div className="ide-body">
                <Ide></Ide>
            </div>
            <div className="ide-tail">tail</div>
        </div>
    );
}

export default App;
