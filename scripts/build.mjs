import { copyFile, cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(rootDir, "dist");

const files = ["index.html", "market.html"];
const directories = ["public", "src"];

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

await Promise.all(
  files.map((file) => copyFile(join(rootDir, file), join(distDir, file))),
);

await Promise.all(
  directories.map((directory) =>
    cp(join(rootDir, directory), join(distDir, directory), {
      recursive: true,
    }),
  ),
);

console.log("Static build ready in dist/");
