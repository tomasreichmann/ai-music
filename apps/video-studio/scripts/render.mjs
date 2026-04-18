import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const entryPoint = path.join(root, "src", "remotion", "entry.tsx");
const outputLocation = process.argv[2] ?? path.join(root, "dist", "pulse-demo.mp4");
const analysisMetadataPath = path.join(root, "public", "analysis", "pulse-demo.analysis.json");

const analysisMetadata = JSON.parse(await readFile(analysisMetadataPath, "utf8"));
const envelopeBinaryPath = path.join(root, "public", analysisMetadata.envelopes.binaryPath.replace(/^\//, ""));
const envelopeBytes = new Uint8Array(await readFile(envelopeBinaryPath));
const inputProps = {
  analysis: {
    ...analysisMetadata,
    envelopeBytes
  }
};

const serveUrl = await bundle({
  entryPoint
});

const composition = await selectComposition({
  serveUrl,
  id: "pulse-demo",
  inputProps
});

await renderMedia({
  codec: "h264",
  composition,
  serveUrl,
  outputLocation,
  inputProps
});

console.log(`Rendered demo video to ${outputLocation}`);
