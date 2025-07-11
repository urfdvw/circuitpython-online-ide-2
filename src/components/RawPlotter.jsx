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

function text_to_data(input) {
    return input
        .split("\n") // split into lines
        .map((line) => line.trim())
        .filter((line) => /^-?\d+(\.\d+)?(\s+-?\d+(\.\d+)?)*$/.test(line)) // only lines with numbers separated by spaces
        .map((line) => line.split(/\s+/).map(Number)); // convert to array of numbers
}

function plot_lines_find_end(lines) {
    var start = 1; // first line is title
    var end = lines.length - 1;
    while (start + 1 < end) {
        var mid = parseInt((start + end) / 2);
        if (isNaN(parseFloat(lines[mid][0]))) {
            end = mid;
        } else {
            start = mid;
        }
    }
    return start;
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

    const output = removeInBetween(serialOutput, constants.CV_JSON_START, constants.CV_JSON_END);

    try {
        var plot_raw_list = output.split("startplot:").slice(1);
        var plot_raw_text = plot_raw_list.at(-1);

        var plot_labels = plot_raw_text.split("\n").at(0).trim().split(" ");

        var plot_raw_lines = text_to_data(plot_raw_text);
        var plot_data_lines = plot_raw_lines.slice(1, plot_lines_find_end(plot_raw_lines) + 1);

        if (config.plot.truncate) {
            plot_data_lines = plot_data_lines.slice(-config.plot.history_len);
        }
        var plot_data = transpose(plot_data_lines);

        if (config.plot.x_axis & (plot_labels.length > 1)) {
            xLabel = plot_labels[0];
            for (var i = 1; i < plot_labels.length; i++) {
                var curve = {};
                curve["x"] = plot_data[0];
                curve["y"] = plot_data[i];
                curve["name"] = plot_labels[i];
                curve["type"] = "scatter";
                data.push(curve);
            }
        } else {
            for (var i = 0; i < plot_labels.length; i++) {
                var curve = {};
                curve["x"] = i;
                curve["y"] = plot_data[i];
                curve["name"] = plot_labels[i];
                curve["type"] = "scatter";
                data.push(curve);
            }
        }
        var layout = {
            showlegend: true,
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
        return <></>;
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
            <Plot data={data} layout={layout} />
        </TabTemplate>
    );
}
