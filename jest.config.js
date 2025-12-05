/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest", // le indica a Jest que compile TS
  testEnvironment: "node", // necesario para NextRequest/NextResponse
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1", // si usás alias @
  },
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.ts$", // reconoce archivos .test.ts
};
