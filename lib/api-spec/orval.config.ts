import { defineConfig } from "orval";

export default defineConfig({
  zod: {
    input: { target: "./openapi.yaml" },
    output: {
      target: "../api-zod/src/generated/api.ts",
      client: "zod",
      mode: "single",
    },
  },
  reactClient: {
    input: { target: "./openapi.yaml" },
    output: {
      target: "../api-client-react/src/generated/api.ts",
      schemas: "../api-client-react/src/generated/models",
      client: "react-query",
      mode: "single",
      httpClient: "fetch",
      override: {
        mutator: {
          path: "../api-client-react/src/custom-fetch.ts",
          name: "customFetch",
        },
        query: {
          useQuery: true,
        },
      },
    },
  },
});
