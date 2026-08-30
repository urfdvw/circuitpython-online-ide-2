// The tree cache.
//
// Refreshing cannot cancel a walk that is already on the wire, so a stale walk
// must not publish its result over a newer one, and a write landing mid-walk
// must not be silently dropped. Both are reachable by double-clicking refresh,
// and a walk over serial takes seconds.

import { harness } from "./helpers/harness.js";
import { createFsCache } from "../src/serialFs/fsCache";

const t = harness("fs cache");
t.watch();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
    // ---- an invalidate during a walk retires that walk ----
    {
        let walks = 0;
        let releaseA;
        let releaseB;
        const gates = [new Promise((r) => (releaseA = r)), new Promise((r) => (releaseB = r))];
        const cache = createFsCache(async () => {
            const which = walks++;
            await gates[which];
            return which === 0
                ? [{ type: "f", path: "/gen1.py", size: 1 }]
                : [{ type: "f", path: "/gen2.py", size: 2 }];
        });

        const first = cache.ensure();
        let firstSettled = false;
        first.then(() => (firstSettled = true));
        await sleep(5);
        cache.invalidate(); // the user pressed refresh
        const second = cache.ensure();
        await sleep(5);

        releaseA(); // the stale walk lands first
        await sleep(20);
        // Had it published, `first` would have settled with gen1 data. Instead it
        // must still be pending, having joined the current generation.
        t.check("a stale walk does not publish", firstSettled === false);

        releaseB();
        const [a, b] = [await first, await second];
        t.check("both callers see the fresh tree", a.has("/gen2.py") && b.has("/gen2.py"));
        const names = (await cache.list("")).map((e) => e.name);
        t.check("the cache holds only fresh data", names.join() === "gen2.py", JSON.stringify(names));
        t.check("exactly two walks, not three", walks === 2, `walks=${walks}`);
    }

    // ---- a write during a walk is not lost ----
    {
        let walks = 0;
        let releaseWalk;
        const gate = new Promise((r) => (releaseWalk = r));
        const cache = createFsCache(async () => {
            walks++;
            if (walks === 1) await gate;
            // The device did not yet know about saved.py during the first walk.
            return walks === 1
                ? [{ type: "f", path: "/old.py", size: 1 }]
                : [
                      { type: "f", path: "/old.py", size: 1 },
                      { type: "f", path: "/saved.py", size: 9 },
                  ];
        });
        const pending = cache.ensure();
        await sleep(5);
        cache.noteFile("/saved.py", 9); // a save completes mid-walk
        releaseWalk();
        await pending.catch(() => {});
        await sleep(10);
        const names = (await cache.list("")).map((e) => e.name);
        t.check("a write during a walk survives", names.includes("saved.py"), JSON.stringify(names));
    }

    // ---- ordinary bookkeeping ----
    {
        const cache = createFsCache(async () => [
            { type: "d", path: "/lib", size: 0 },
            { type: "f", path: "/lib/a.py", size: 3 },
            { type: "f", path: "/code.py", size: 5 },
        ]);
        await cache.ensure();
        t.check("lists only direct children", (await cache.list("")).map((e) => e.name).join() === "code.py,lib");
        t.check("lists a subdirectory", (await cache.list("/lib")).map((e) => e.name).join() === "a.py");
        t.check("stat finds a file", (await cache.stat("/code.py"))?.type === "f");
        t.check("stat misses cleanly", (await cache.stat("/nope")) === null);
        cache.noteRemoved("/lib");
        t.check("removing a directory takes its subtree", (await cache.stat("/lib/a.py")) === null);
    }
} catch (error) {
    t.fail("unexpected error", error);
}

t.done();
