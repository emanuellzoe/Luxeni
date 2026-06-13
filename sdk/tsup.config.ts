import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: false,
  // ABI JSON is bundled inline; viem stays external (peer dependency).
  external: ["viem"],
});
