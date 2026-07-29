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
        fetch: {
          // orval's built-in fetch client (which this type generation
          // defaults to modeling) resolves to { status, data, headers }.
          // Our custom mutator resolves to the bare parsed body instead
          // (see custom-fetch.ts's Promise<T> return), so every generated
          // response type needs to match THAT shape, not the built-in one.
          includeHttpResponseReturnType: false,
        },
      },
    },
  },
});
