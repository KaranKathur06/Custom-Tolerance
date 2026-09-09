import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appDir = path.join(root, "app");

function routeFromPage(filePath: string) {
  const relative = path.relative(appDir, filePath).replaceAll(path.sep, "/");
  const route = relative.replace(/(?:^|\/)page\.(tsx|ts|jsx|js)$/, "");
  return route ? `/${route}` : "/";
}

function collectPages(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectPages(fullPath);
    return /^page\.(tsx|ts|jsx|js)$/.test(entry.name) ? [fullPath] : [];
  });
}

const pages = new Set(collectPages(appDir).map(routeFromPage));
const requiredRoutes = [
  "/",
  "/dashboard",
  "/account/profile",
  "/account/settings",
  "/settings",
  "/buyer",
  "/seller",
  "/dashboard/seller/products",
  "/ops/admin",
  "/ops/crm",
  "/messages",
  "/onboarding",
];

const missing = requiredRoutes.filter((route) => !pages.has(route));
if (missing.length) {
  console.error("FAIL missing required routes:");
  missing.forEach((route) => console.error(`- ${route}`));
  process.exitCode = 1;
} else {
  console.log(`PASS ${requiredRoutes.length} critical route entry points exist`);
}

const sourceRoots = ["app", "components", "config", "hooks", "lib"]
  .map((directory) => path.join(root, directory))
  .filter(fs.existsSync);
const stalePatterns = [
  /["'`]\/account\/(?:profile|settings)(?:["'`?]|$)/,
  /["'`]\/messages\/\$\{/,
  /["'`]\/seller\/dashboard(?:["'`?]|$)/,
  /["'`]\/ops\/(?:verification|suppliers|onboarding)(?:["'`?]|$)/,
  /["'`]\/membership(?:["'`?]|$)/,
];
const staleMatches: string[] = [];

function scan(directory: string) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      scan(fullPath);
      continue;
    }
    if (!/\.(tsx?|jsx?|mjs|cjs)$/.test(entry.name)) continue;
    const contents = fs.readFileSync(fullPath, "utf8");
    contents.split(/\r?\n/).forEach((line, index) => {
      if (stalePatterns.some((pattern) => pattern.test(line))) {
        staleMatches.push(`${path.relative(root, fullPath)}:${index + 1}: ${line.trim()}`);
      }
    });
  }
}

sourceRoots.forEach(scan);
if (staleMatches.length) {
  console.error("FAIL stale page destinations detected:");
  staleMatches.forEach((match) => console.error(`- ${match}`));
  process.exitCode = 1;
} else {
  console.log("PASS no audited stale page destinations detected");
}
