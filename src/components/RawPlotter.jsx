// react
import { useContext } from "react";
// plotly
import Plot from "react-plotly.js";
// context
import AppContext from "../AppContext";

import { removeInBetween } from "../hooks/useSerial/textProcessor";
import * as constants from "../constants";

import TabTemplate from "../utilComponents/TabTemplate";
import { selectTabById } from "../layout/layoutUtils";
import { Typography } from "@mui/material";

function text_to_data(input) {
    return input
        .split("\n")
        .map((line) => line.trim())
        .filter(
            (line) =>
                /^-?\d+(\.\d+)?(\s+-?\d+(\.\d+)?)*$/.test(line) || // space-separated numbers
                /^\((-?\d+(\.\d+)?\s*,\s*)*-?\d+(\.\d+)?\)$/.test(line) // comma-separated in parentheses
        )
        .map((line) => {
            if (line.startsWith("(") && line.endsWith(")")) {
                return line
                    .slice(1, -1) // remove parentheses
                    .split(",")
                    .map((s) => Number(s.trim()));
            } else {
                return line.split(/\s+/).map(Number);
            }
        });
}

function transpose(array) {
    return array[0].map((_, colIndex) => array.map((row) => parseFloat(row[colIndex])));
}

export default function RawPlotter({ node }) {
    const { appConfig, flexModel, serialOutput, configTabSelection, helpTabSelection } = useContext(AppContext);
    const config = appConfig.config;

    const height = node.getRect().height;
    const width = node.getRect().width;

    var data = [];
    var xLabel = "index";
    var showlegend = config.plot.show_legend;

    const output = removeInBetween(serialOutput, constants.CV_JSON_START, constants.CV_JSON_END);

    try {
        const last_active_block = output.split("soft reboot").at(-1);
        // console.log("RawPlotter", "Last active block:", last_active_block);
        const last_plot_text = last_active_block.split("startplot:").at(-1);
        console.log("RawPlotter", "Last plot data:", last_plot_text);

        var plot_labels = last_plot_text.split("\n").at(0).trim().split(" ");
        console.log("Plot labels:", plot_labels);

        var plot_data_lines = text_to_data(last_plot_text);

        if (plot_labels.length === 0 || plot_labels[0] === "") {
            showlegend = false;
        }
        console.log("Plot labels:", plot_labels);

        if (config.plot.truncate) {
            plot_data_lines = plot_data_lines.slice(-config.plot.history_len);
        }
        var plot_data = transpose(plot_data_lines);

        if (config.plot.x_axis & (plot_labels.length > 1)) {
            xLabel = plot_labels[0];
            for (var i = 1; i < plot_data.length; i++) {
                var curve = {};
                curve["x"] = plot_data[0];
                curve["y"] = plot_data[i];
                curve["name"] = plot_labels[i];
                curve["type"] = "scatter";
                data.push(curve);
            }
        } else {
            for (var i = 0; i < plot_data.length; i++) {
                var curve = {};
                curve["x"] = i;
                curve["y"] = plot_data[i];
                curve["name"] = plot_labels[i];
                curve["type"] = "scatter";
                data.push(curve);
            }
        }
        var layout = {
            showlegend: showlegend,
            xaxis: {
                title: xLabel,
            },
            height: height - 50,
            width: width - 10,
            padding: "0px",

            margin: {
                l: 30, // left
                r: 10, // right
                t: 20, // top
                b: 20, // bottom
            },
        };

        if (config.plot.enable_axis_limits) {
            layout.yaxis = { range: [config.plot.y_min, config.plot.y_max] };
            if (config.plot.x_axis) {
                layout.xaxis.range = [config.plot.x_min, config.plot.x_max];
            }
        }
    } catch (e) {
        console.error("Exception thrown", e.stack);
    }

    const menuStructure = [
        {
            label: "≡",
            options: [
                {
                    text: "Settings",
                    handler: () => {
                        console.log("Editor -> Settings");
                        selectTabById(flexModel, "settings_tab");
                        configTabSelection.setTabName("plot");
                    },
                },
                {
                    text: "Help",
                    handler: () => {
                        console.log("Editor -> Help");
                        selectTabById(flexModel, "help_tab");
                        helpTabSelection.setTabName("plot");
                    },
                },
            ],
        },
    ];

    return (
        <TabTemplate title="Plot" menuStructure={menuStructure}>
            {serialOutput && plot_data_lines.length > 0 ? (
                <Plot data={data} layout={layout} />
            ) : (
                <Typography style={{ padding: "20px" }}>No data to plot</Typography>
            )}
        </TabTemplate>
    );
}
