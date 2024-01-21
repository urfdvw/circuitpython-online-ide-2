// react
import { useEffect, useState, useRef, useContext } from "react";
// plotly
import Plot from "react-plotly.js";
// context
import ideContext from "../ideContext";

function text_to_data(text) {
    var lines = text.split("\n");
    for (var i = 0; i < lines.length; i++) {
        lines[i] = lines[i].trim().split(" ");
    }
    return lines;
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
    const { config, serialOutput } = useContext(ideContext);
    if (!serialOutput) {
        return <></>;
    }
    const height = node.getRect().height;
    const width = node.getRect().width;

    var data = [];
    var xLabel = "index";

    try {
        var plot_raw_list = serialOutput.split("startplot:").slice(1);
        var plot_raw_text = plot_raw_list.at(-1);
        var plot_raw_lines = text_to_data(plot_raw_text);
        var plot_labels = plot_raw_lines[0];
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
    } catch (e) {
        console.error("Exception thrown", e.stack);
        return <></>;
    }
    var layout = {
        showlegend: true,
        xaxis: {
            title: xLabel,
        },
        height: height - 10,
        width: width - 10,
    };

    return <Plot data={data} layout={layout} />;
}
