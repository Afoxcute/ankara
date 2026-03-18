/**
 * Run after compile: npx hardhat run scripts/export-abi.ts
 * Copies SubscriptionManager ABI to app for frontend use.
 */
import fs from "fs";
import path from "path";

const artifactPath = path.join(__dirname, "../artifacts/contracts/SubscriptionManager.sol/SubscriptionManager.json");
const outDir = path.join(__dirname, "../../app/src/contracts");
const outPath = path.join(outDir, "SubscriptionManager.json");

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
fs.writeFileSync(outPath, JSON.stringify({ abi: artifact.abi }, null, 2));
console.log("Exported ABI to", outPath);
