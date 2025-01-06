import fs from "fs-extra";

import { run } from "./utils.mjs";

(async () => {
    console.info("[ESM compile post-processing started]");
    await fs.copy("./src/dirname/package.json", "./esm/dirname/package.json");
    await run("resolve-tspaths", ["--project", "tsconfig.esm.json"]);
    console.info("Resolved TypeScript import paths");
    console.info("[ESM compile post-processing ended]");
})();
