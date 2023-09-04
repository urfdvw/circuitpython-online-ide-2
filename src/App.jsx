import { useState } from "react";
import "./App.css";
import Ide from "./Ide";

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
