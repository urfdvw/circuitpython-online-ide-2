import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

/** Header deadline becomes an idle deadline while streaming; progress extends it. */
export function createTransferTimeout(controller, { headersMs = 30000, idleMs = 60000 } = {}) {
    let timer;
    const arm = (duration) => {
        clearTimeout(timer);
        timer = setTimeout(() => controller.abort(new Error("Upstream transfer timed out.")), duration);
    };
    arm(headersMs);
    return {
        progress: () => arm(idleMs),
        dispose: () => clearTimeout(timer),
    };
}

export async function pipeRelease(body, destination, { signal, progress }) {
    await pipeline(Readable.fromWeb(body), new Transform({
        transform(chunk, encoding, callback) {
            progress();
            callback(null, chunk);
        },
    }), destination, { signal });
}
