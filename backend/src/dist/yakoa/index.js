"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yakoascanner_1 = require("./yakoascanner");
async function main() {
    try {
        const result = await (0, yakoascanner_1.registerToYakoa)();
        console.log("🎉 Registration completed successfully!");
        console.log("📋 Result:", result);
    }
    catch (error) {
        console.error("💥 Registration failed:", error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map