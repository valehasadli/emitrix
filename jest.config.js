module.exports = {
    // Indicates whether the coverage information should be collected while executing the test
    collectCoverage: true,

    // The directory where Jest should output its coverage files
    coverageDirectory: "coverage",

    // Indicates whether each individual test should be reported during the run
    verbose: true,

    // The test environment that will be used for testing
    testEnvironment: "node",

    // The glob patterns Jest uses to detect test files
    testMatch: [
        "<rootDir>/tests/**/*.[jt]s?(x)",
        "<rootDir>/tests/?(*.)+(spec|test).[tj]s?(x)"
    ],

    // Stress/soak tests are long-running; they run via `npm run test:stress` only
    testPathIgnorePatterns: process.env.STRESS ? [] : ["<rootDir>/tests/stress/"],

    // A map from regular expressions to paths to transformers
    transform: {
        "^.+\\.(ts|tsx)?$": "babel-jest"
    },
};
