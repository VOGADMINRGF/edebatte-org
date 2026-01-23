// tools/refactor-imports.js
const fs = require("fs");
const path = require("path");

const dir = path.resolve(__dirname, "../apps/web/src");

const walk = (dir) =>
  fs.readdirSync(dir).flatMap((file) => {
    const fullPath = path.join(dir, file);
    return fs.statSync(fullPath).isDirectory()
      ? walk(fullPath)
      : fullPath.endsWith(".tsx")
      ? [fullPath]
      : [];
  });

const replaceInFile = (filePath) => {
  let content = fs.readFileSync(filePath, "utf8");

  const updated = content
    .replace(/from ["']@\/components\//g, "from '@ui/components/")
    .replace(/from ["']@ui["']/g, "from '@ui/components'")
    .replace(/from ["']@\/context\//g, "from '@context/");

  if (content !== updated) {
    console.log("✔ Updated:", filePath);
    fs.writeFileSync(filePath, updated, "utf8");
  }
};

walk(dir).forEach(replaceInFile);
