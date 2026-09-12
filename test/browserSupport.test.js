// Browser support policy and guidance for unsupported browsers.
import { harness } from "./helpers/harness.js";
import { isBrowserSupported, describeUnsupportedBrowser } from "../src/utilFunctions/browserSupport";

const t = harness("browser support");
t.watch();

try {
    t.check("desktop Chromium remains supported", isBrowserSupported({ isFirefox: false, isSafari: false, isMobile: false }));
    t.check("Firefox 150 is unsupported", !isBrowserSupported({ isFirefox: true, browserVersion: "150.0" }));
    t.check("Firefox 151 is supported", isBrowserSupported({ isFirefox: true, browserVersion: "151.0" }));
    t.check("newer Firefox is supported", isBrowserSupported({ isFirefox: true, browserVersion: "153.0.1" }));
    t.check("Firefox with an unknown version is unsupported", !isBrowserSupported({ isFirefox: true }));
    t.check("Safari is unsupported", !isBrowserSupported({ isSafari: true }));
    t.check("mobile Chromium is unsupported", !isBrowserSupported({ isMobile: true }));
    t.check("mobile Firefox is unsupported", !isBrowserSupported({ isMobile: true, isFirefox: true, browserVersion: "151.0" }));

    // ---- what an unsupported browser is told ----
    const firefox = describeUnsupportedBrowser({ isFirefox: true });
    t.check("old firefox is told to update", /update firefox to the latest version/i.test(firefox.fix), firefox.fix);
    t.check(
        "and warned the drive will never work there",
        /cannot open the CIRCUITPY drive/i.test(firefox.fix),
        firefox.fix
    );
    t.check("old firefox is not told to switch browsers", !/use chrome/i.test(firefox.fix || ""), firefox.fix);

    const safari = describeUnsupportedBrowser({ isSafari: true });
    t.check("safari is told to switch browsers", /use chrome|edge|firefox/i.test(safari.fix), safari.fix);
    t.check("safari is not told to update, which would not help", !/update safari/i.test(safari.fix), safari.fix);

    const mobile = describeUnsupportedBrowser({ isMobile: true });
    t.check("mobile is told it needs a desktop", /desktop/i.test(mobile.reason), mobile.reason);
    t.check("mobile is offered no false fix", mobile.fix === null);

    const unknown = describeUnsupportedBrowser({});
    t.check("an unknown browser still gets advice", Boolean(unknown.reason && unknown.fix));
} catch (error) {
    t.fail("unexpected error", error);
}

t.done();
