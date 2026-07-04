// plotParser.js
//
// Pure parsing for the Plot tab. Turns the accumulated REPL serial text into
// Plotly `{ data, layout }`. Handles two modes off printed markers:
//   - "startplot:"      -> time-series plot (the original behavior)
//   - "startanimation:" -> frame animation (lines + dots, flipbook by frame)
// plus "plotsettings:" to configure either from code. Everything is guarded so a
// malformed/partial/huge stream yields { hasData:false } instead of throwing.

const MARK_REBOOT = "soft reboot";
const MARK_PLOT = "startplot:";
const MARK_ANIM = "startanimation:";
const MARK_SETTINGS = "plotsettings:";
const MARK_FRAME = "startframe:";
const MARK_DRAW = "drawframe:";
const MARK_LINE = "line:";
const MARK_DOT = "dot:";

// Pull every finite number out of a string (handles "1 2", " 1, 2", "(1, 2)",
// leading/trailing spaces, and floats/exponents). Regex extraction avoids the
// empty-token-from-split pitfall where Number("") === 0 injects spurious zeros.
function parseNums(s) {
    const matches = String(s).match(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g);
    return matches ? matches.map(Number).filter((n) => Number.isFinite(n)) : [];
}

// Strict numeric rows (used for plot data; skips label/garbage lines).
function textToRows(input) {
    return input
        .split("\n")
        .map((line) => line.trim())
        .filter(
            (line) =>
                /^-?\d+(\.\d+)?(\s+-?\d+(\.\d+)?)*$/.test(line) || // space-separated
                /^\((-?\d+(\.\d+)?\s*,\s*)*-?\d+(\.\d+)?\)$/.test(line) // (a, b, c)
        )
        .map((line) =>
            line.startsWith("(") ? parseNums(line) : line.split(/\s+/).map(Number)
        );
}

// Columns from ragged rows; missing cells become null (Plotly renders a gap).
function toColumns(rows) {
    const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
    const cols = [];
    for (let c = 0; c < width; c++) {
        cols.push(rows.map((r) => (Number.isFinite(r[c]) ? r[c] : null)));
    }
    return cols;
}

// Parse the JSON object printed after a marker on the same line (or null).
function jsonAfter(text, marker, fromLast = true) {
    const idx = fromLast ? text.lastIndexOf(marker) : text.indexOf(marker);
    if (idx === -1) return null;
    const line = text.slice(idx + marker.length).split("\n", 1)[0].trim();
    if (!line.startsWith("{")) return null;
    try {
        const obj = JSON.parse(line);
        return obj && typeof obj === "object" ? obj : null;
    } catch {
        return null;
    }
}

function buildLayout(cfg, dims, xLabel, applyXRange) {
    const layout = {
        showlegend: !!cfg.show_legend,
        xaxis: { title: xLabel },
        height: Math.max(1, (dims?.height ?? 300) - 50),
        width: Math.max(1, (dims?.width ?? 300) - 10),
        margin: { l: 30, r: 10, t: 20, b: 20 },
    };
    if (cfg.enable_axis_limits) {
        layout.yaxis = { range: [cfg.y_min, cfg.y_max] };
        if (applyXRange) layout.xaxis.range = [cfg.x_min, cfg.x_max];
    }
    return layout;
}

function parsePlot(seg, cfg, dims) {
    const after = seg.slice(MARK_PLOT.length);
    const firstLine = after.split("\n", 1)[0] || "";
    let labels = firstLine.trim().split(/\s+/).filter(Boolean);

    let rows = textToRows(after);
    if (cfg.truncate) {
        const keep = Math.max(1, Number(cfg.history_len) || 100);
        rows = rows.slice(-keep);
    }
    if (rows.length === 0) {
        return { mode: "plot", data: [], layout: buildLayout(cfg, dims, "index", false), hasData: false };
    }

    const cols = toColumns(rows);
    const data = [];
    let xLabel = "index";
    const useX = !!cfg.x_axis && labels.length > 1 && cols.length > 1;

    if (useX) {
        xLabel = labels[0];
        for (let i = 1; i < cols.length; i++) {
            data.push({ x: cols[0], y: cols[i], name: labels[i] || `Curve ${i}`, type: "scatter" });
        }
    } else {
        for (let i = 0; i < cols.length; i++) {
            data.push({ y: cols[i], name: labels[i] || `Curve ${i + 1}`, type: "scatter" });
        }
    }

    return { mode: "plot", data, layout: buildLayout(cfg, dims, xLabel, useX), hasData: data.length > 0 };
}

function parseAnimation(seg, dims, baseCfg) {
    // Optional settings JSON right after the startanimation: marker.
    const cfg = { ...baseCfg, ...(jsonAfter(seg.split("\n", 1)[0], MARK_ANIM, false) || {}) };

    // Render the last frame that has actually been drawn (ignore an in-progress one).
    // lastIndexOf scans from the end, so this stays cheap even on a long animation —
    // no splitting the whole frame history into an array each tick.
    const lastDraw = seg.lastIndexOf(MARK_DRAW);
    if (lastDraw === -1) {
        return { mode: "animation", data: [], layout: buildLayout(cfg, dims, "x", true), hasData: false };
    }
    const frameStart = seg.lastIndexOf(MARK_FRAME, lastDraw);
    if (frameStart === -1) {
        return { mode: "animation", data: [], layout: buildLayout(cfg, dims, "x", true), hasData: false };
    }
    const body = seg.slice(frameStart + MARK_FRAME.length, lastDraw);

    const data = [];
    const dotX = [];
    const dotY = [];
    for (const raw of body.split("\n")) {
        const line = raw.trim();
        if (line.startsWith(MARK_LINE)) {
            const nums = parseNums(line.slice(MARK_LINE.length));
            const xs = [];
            const ys = [];
            for (let k = 0; k + 1 < nums.length; k += 2) {
                xs.push(nums[k]);
                ys.push(nums[k + 1]);
            }
            if (xs.length) data.push({ x: xs, y: ys, mode: "lines", type: "scatter", showlegend: false });
        } else if (line.startsWith(MARK_DOT)) {
            const nums = parseNums(line.slice(MARK_DOT.length));
            if (nums.length >= 2) {
                dotX.push(nums[0]);
                dotY.push(nums[1]);
            }
        }
    }
    if (dotX.length) data.push({ x: dotX, y: dotY, mode: "markers", type: "scatter", showlegend: false });

    return { mode: "animation", data, layout: buildLayout(cfg, dims, "x", true), hasData: data.length > 0 };
}

/**
 * @param {string} serialText - accumulated REPL serial output
 * @param {object} plotConfig - appConfig.config.plot
 * @param {{height:number,width:number}} dims - plot area size
 * @returns {{ mode:string, data:Array, layout:object, hasData:boolean }}
 */
export function parsePlotInput(serialText, plotConfig, dims) {
    const cfg = { ...(plotConfig || {}) };
    try {
        const block = String(serialText || "").split(MARK_REBOOT).at(-1) || "";

        // plotsettings: (latest wins) merged over the config defaults.
        const settings = jsonAfter(block, MARK_SETTINGS, true);
        if (settings) Object.assign(cfg, settings);

        const plotIdx = block.lastIndexOf(MARK_PLOT);
        const animIdx = block.lastIndexOf(MARK_ANIM);

        if (animIdx === -1 && plotIdx === -1) {
            return { mode: "plot", data: [], layout: buildLayout(cfg, dims, "index", false), hasData: false };
        }
        if (animIdx > plotIdx) {
            return parseAnimation(block.slice(animIdx), dims, cfg);
        }
        return parsePlot(block.slice(plotIdx), cfg, dims);
    } catch (e) {
        console.error("plotParser: failed to parse", e);
        return { mode: "plot", data: [], layout: buildLayout(cfg, dims, "index", false), hasData: false };
    }
}
