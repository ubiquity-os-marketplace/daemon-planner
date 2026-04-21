import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: ["src/action.ts"],
  project: ["**/*.{js,ts}"],
  ignore: ["src/types/config.ts", "**/__mocks__/**", "**/__fixtures__/**", "jest.config.ts"],
  ignoreIssues: {
    "src/types/generated/**": ["types"],
  },
  ignoreExportsUsedInFile: true,
  // eslint can also be safely ignored as per the docs: https://knip.dev/guides/handling-issues#eslint--jest
  ignoreDependencies: [],
  eslint: true,
};

export default config;
