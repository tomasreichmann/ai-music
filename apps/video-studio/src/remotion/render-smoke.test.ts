import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

describe("render smoke", () => {
  it(
    "renders the demo composition to an mp4",
    async () => {
      const tempDir = mkdtempSync(path.join(tmpdir(), "video-studio-render-"));
      const outputPath = path.join(tempDir, "pulse-demo.mp4");
      const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
      const cwd = process.cwd();

      try {
        await execFileAsync(npmCommand, ["run", "render", "--", outputPath], {
          cwd,
          windowsHide: true,
          shell: process.platform === "win32"
        });
        expect(existsSync(outputPath)).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    },
    180_000
  );
});
