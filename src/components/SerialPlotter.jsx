// react
import { useContext, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
// plotly
const Plot = lazy(() => import("react-plotly.js"));
// context
import AppContext from "../AppContext";

import { parsePlotInput } from "../utilFunctions/plotParser";
import TabTemplate from "../utilComponents/TabTemplate";
import { selectTabById } from "../layout/layoutUtils";
import { Typography } from "@mui/material";

export default function SerialPlotter({ node }) {
    const { appConfig, flexModel, serialOutput, configTabSelection, helpTabSelection } = useContext(AppContext);

    const height = node.getRect().height;
    const width = node.getRect().width;

    // Throttle: the serial output changes on every byte, but we only re-parse and
    // re-plot ~10x/sec. Keep the latest output in a ref and snapshot it on an interval,
    // so parse/Plotly work is decoupled from the per-byte re-render storm.
    const latest = useRef(serialOutput);
    latest.current = serialOutput;
    const [snapshot, setSnapshot] = useState(serialOutput);
    useEffect(() => {
        const id = setInterval(() => setSnapshot(latest.current), 100);
        return () => clearInterval(id);
    }, []);

    // Pure, guarded parse -> { data, layout, hasData }. Memoized so byte-level
    // re-renders (from the serialOutput context) don't recompute it.
    const { data, layout, hasData } = useMemo(
        () => parsePlotInput(snapshot, appConfig.config.plot, { height, width }),
        [snapshot, appConfig.config.plot, height, width]
    );

    const menuStructure = [
        {
            label: "≡",
            options: [
                {
                    text: "Settings",
                    handler: () => {
                        selectTabById(flexModel, "settings_tab");
                        configTabSelection.setTabName("plot");
                    },
                },
                {
                    text: "Help",
                    handler: () => {
                        selectTabById(flexModel, "help_tab");
                        helpTabSelection.setTabName("plot");
                    },
                },
            ],
        },
    ];

    return (
        <TabTemplate title="Plot" menuStructure={menuStructure}>
            {hasData ? (
                <Suspense fallback={<div>Loading...</div>}>
                    <Plot data={data} layout={layout} />
                </Suspense>
            ) : (
                <Typography style={{ padding: "20px" }}>No data to plot</Typography>
            )}
        </TabTemplate>
    );
}
