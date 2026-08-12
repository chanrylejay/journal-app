import fs from "fs";
for (const p of [
  "C:/Users/Chanryle/Claude-Core/memory/MEMORY.md",
  "C:/Users/Chanryle/Claude-Core/DIRECTORY.md",
]) {
  const lines = fs.readFileSync(p, "utf8").split("\n");
  console.log("=== " + p + " (" + lines.length + " lines) ===");
  console.log(lines.slice(0, 40).join("\n"));
}
