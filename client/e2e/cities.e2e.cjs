const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { createServer } = require("node:http");
const { access, readFile } = require("node:fs/promises");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { chromium } = require("playwright");

const clientRoot = path.resolve(__dirname, "..");
const serverRoot = path.resolve(clientRoot, "../server");
const mimeTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
};

let apiProcess;
let browser;
let staticServer;

async function startStaticServer() {
  staticServer = createServer(async (request, response) => {
    try {
      const requestPath = new URL(request.url, "http://localhost").pathname;
      const relativePath = requestPath === "/" ? "index.html" : requestPath.slice(1);
      const filePath = path.resolve(clientRoot, relativePath);

      if (!filePath.startsWith(`${clientRoot}${path.sep}`)) {
        response.writeHead(403).end();
        return;
      }

      const content = await readFile(filePath);
      response.writeHead(200, {
        "Content-Type": mimeTypes[path.extname(filePath)] ?? "application/octet-stream",
      });
      response.end(content);
    } catch {
      response.writeHead(404).end();
    }
  });

  await new Promise((resolve, reject) => {
    staticServer.once("error", reject);
    staticServer.listen(4173, "127.0.0.1", resolve);
  });
}

async function waitForApi() {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    if (apiProcess.exitCode !== null) {
      throw new Error("The API server exited before becoming ready.");
    }

    try {
      const response = await fetch("http://localhost:3000/cities");
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error("The API server did not become ready in time.");
}

before(async () => {
  await access(path.join(clientRoot, "dist/index.js"));

  apiProcess = spawn(
    process.execPath,
    ["--experimental-strip-types", "src/index.ts"],
    { cwd: serverRoot, env: { ...process.env, PORT: "3000" } },
  );
  await waitForApi();
  await startStaticServer();
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  if (staticServer?.listening) {
    await new Promise((resolve, reject) => {
      staticServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
  if (apiProcess && apiProcess.exitCode === null) {
    apiProcess.kill("SIGTERM");
    await new Promise((resolve) => apiProcess.once("exit", resolve));
  }
});

test("loads cities and updates the selected city status", async () => {
  const page = await browser.newPage();

  await page.goto("http://127.0.0.1:4173/");
  const citySelect = page.locator("#city-select");
  const status = page.locator("#status");

  await assert.doesNotReject(() => citySelect.waitFor({ state: "visible" }));
  await page.waitForFunction(
    () => document.querySelector("#city-select")?.disabled === false,
  );
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll("#city-select option")).some(
      (option) => option.value === "Anchor Point",
    ),
  );
  const initialStatus = await status.textContent();
  assert.match(initialStatus, /^\d[\d.,\s]* ciudades disponibles$/);

  await citySelect.selectOption({ label: "Anchor Point" });
  await page.waitForFunction(
    () =>
      document.querySelector("#status")?.textContent ===
      "Ciudad seleccionada: Anchor Point",
  );

  await citySelect.selectOption("");
  assert.equal(await status.textContent(), initialStatus);
  await page.close();
});

test("shows an error when the cities request fails", async () => {
  const page = await browser.newPage();
  await page.route("http://localhost:3000/cities", (route) => route.abort());

  await page.goto("http://127.0.0.1:4173/");
  await page.getByText("Comprueba que el servidor esté activo.").waitFor();

  assert.equal(await page.locator("#city-select").isDisabled(), true);
  assert.equal(
    await page.locator("#city-select option").textContent(),
    "No se pudieron cargar las ciudades",
  );
  await page.close();
});
