export default {
    // If you’re using ESM in Node, you’ll generally want this environment:
    testEnvironment: "node",

    // Opt in to using the test runner with ESM support (since Jest 28+):
    transform: {
        "^.+\\.[tj]sx?$": "babel-jest",
    },

    // If your source files are .js or .mjs, you usually don’t need a transform,
    // *unless* you’re using Babel for additional features not yet in Node (e.g. JSX)
    // In that case, you can add a Babel transform. For example:
    // transform: {
    //   '^.+\\.[tj]sx?$': [
    //     'babel-jest',
    //     { /* Babel config here if not using .babelrc */ }
    //   ]
    // }

    // If you’re using TypeScript in ESM mode, you might use ts-jest:
    // transform: {
    //   '^.+\\.(ts|tsx)$': [
    //     'ts-jest',
    //     {
    //       useESM: true
    //     }
    //   ]
    // }
};
