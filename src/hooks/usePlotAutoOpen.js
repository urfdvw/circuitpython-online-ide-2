import { useEffect, useRef } from "react";
import { openTab } from "../layout/layoutUtils";

const PLOT_MARKER = /start(plot|animation):/g;

/**
 * Auto-open the Plot tab when the board emits a new plot/animation command.
 *
 * Scans only the NEWLY-arrived serial text on each update (with a small overlap so
 * a marker split across two updates is still caught), and opens the Plot tab once
 * per new `startplot:` / `startanimation:` command — reusing the same `openTab`
 * the Tools menu uses. It never re-counts old text (cheap, no quadratic growth) and
 * won't fight the user closing the tab; only a brand-new command reopens it.
 *
 * @param {string} serialOutput - accumulated REPL serial output
 * @param {object} flexModel - FlexLayout model
 */
export default function usePlotAutoOpen(serialOutput, flexModel) {
    const scannedLen = useRef(0);
    useEffect(() => {
        if (!flexModel) return;
        const text = String(serialOutput || "");
        // Buffer shrank (cleared / reconnected) -> rescan from the start.
        if (text.length < scannedLen.current) scannedLen.current = 0;

        const overlap = 20; // > any marker length, to catch one split across updates
        const from = Math.max(0, scannedLen.current - overlap);
        const slice = text.slice(from);
        PLOT_MARKER.lastIndex = 0;
        let m;
        while ((m = PLOT_MARKER.exec(slice)) !== null) {
            // Only act on a marker that FINISHED in the newly-arrived region.
            if (from + m.index + m[0].length > scannedLen.current) {
                openTab(flexModel, "Plot", "plot");
                break;
            }
        }
        scannedLen.current = text.length;
    }, [serialOutput, flexModel]);
}
