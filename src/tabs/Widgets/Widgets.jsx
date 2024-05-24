import useConnectedVariables from "./useConnectedVariables";
import { useContext, useEffect } from "react";
import ideContext from "../../ideContext";

export default function Widgets() {
    const { serialOutput } = useContext(ideContext);
    const { setVariable, getVariable, connectedVariables } = useConnectedVariables(serialOutput);
    useEffect(() => {
        console.log(connectedVariables);
    }, [connectedVariables]);
    return <>Widgets Tab</>;
}
