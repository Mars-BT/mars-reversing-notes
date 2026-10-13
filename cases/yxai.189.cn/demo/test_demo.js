import { spawnSync } from "child_process";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { getCaptcha, getUrl } from "./utils.js";
import { submitOrder } from "./submitOrder.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const orderInfo = await getUrl();
    const result = await getCaptcha(false);
    const baseDir = path.join(__dirname, "验证", "auto");
    const caseDir = path.join(baseDir, `${Date.now()}`);
    await mkdir(caseDir, { recursive: true });
    await writeFile(path.join(caseDir, "background.png"), Buffer.from(result.background, "base64"));
    await writeFile(path.join(caseDir, "slider.png"), Buffer.from(result.slider, "base64"));

    const pythonScript = path.join(__dirname, "verify_slider.py");
    const run = spawnSync("python3", [pythonScript, "--dir", caseDir, "--id", result.id], {
        stdio: "inherit",
    });
    if (run.status !== 0) {
        process.exit(run.status ?? 1);
    }

    const resultJson = await readFile(path.join(caseDir, "result.json"), "utf-8");
    const parsed = JSON.parse(resultJson);
    const response = await submitOrder(parsed.validCaptcha, orderInfo);
    console.log(response);
}

main();
