module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverageFrom: [
    "routes/**/*.ts",
    "middleware/**/*.ts",
    "validators/**/*.ts",
    "!**/*.d.ts",
  ],
  coverageDirectory: "coverage",
  verbose: true,
};
