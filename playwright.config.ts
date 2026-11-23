import { defineConfig, devices } from "@playwright/test";

/**
 * E2E de fumaça. Usa o Chromium pré-instalado do ambiente (executablePath),
 * pois a versão do @playwright/test aqui pode diferir do navegador do sistema.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "off",
    launchOptions: {
      executablePath: "/opt/pw-browsers/chromium",
      args: ["--no-sandbox"],
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- -p 3100",
    url: "http://127.0.0.1:3100",
    timeout: 120_000,
    reuseExistingServer: true,
  },
});
