import { defineConfig } from "vite";

/**
 * Builds src/scripts/module.ts into the flat files Foundry loads:
 *   scripts/module.js   (ES module, referenced by module.json "esmodules")
 *   styles/module.css   (referenced by module.json "styles")
 *
 * Foundry serves the module folder as static files, so the output has to keep
 * these exact names and stay unhashed.
 */
export default defineConfig({
  build: {
    outDir: ".",
    emptyOutDir: false,
    sourcemap: true,
    minify: false,
    target: "es2022",
    lib: {
      entry: "src/scripts/module.ts",
      formats: ["es"],
      fileName: () => "scripts/module.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: (asset) =>
          asset.names?.[0]?.endsWith(".css") ? "styles/module.css" : "assets/[name][extname]",
      },
    },
  },
});
