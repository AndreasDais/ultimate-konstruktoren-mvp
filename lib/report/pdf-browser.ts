type PuppeteerModule = {
  default?: {
    launch: (options: Record<string, unknown>) => Promise<PdfBrowser>;
    defaultArgs?: (options?: Record<string, unknown>) => string[] | Promise<string[]>;
  };
  launch?: (options: Record<string, unknown>) => Promise<PdfBrowser>;
  defaultArgs?: (options?: Record<string, unknown>) => string[] | Promise<string[]>;
};

type ChromiumRuntime = {
  args?: string[];
  executablePath: () => Promise<string>;
};

type ChromiumModule = ChromiumRuntime & {
  default?: ChromiumRuntime;
};

export type PdfBrowser = {
  newPage: () => Promise<PdfPage>;
  close: () => Promise<void>;
};

export type PdfPage = {
  setExtraHTTPHeaders: (headers: Record<string, string>) => Promise<void>;
  setViewport: (viewport: { width: number; height: number; deviceScaleFactor?: number }) => Promise<void>;
  goto: (url: string, options?: Record<string, unknown>) => Promise<unknown>;
  setContent: (html: string, options?: Record<string, unknown>) => Promise<void>;
  waitForSelector: (selector: string, options?: Record<string, unknown>) => Promise<unknown>;
  emulateMediaType: (type: "screen" | "print") => Promise<void>;
  evaluate: <T>(pageFunction: () => T | Promise<T>) => Promise<T>;
  pdf: (options: Record<string, unknown>) => Promise<Buffer>;
};

async function loadPuppeteer(packageName: "puppeteer" | "puppeteer-core"): Promise<PuppeteerModule> {
  try {
    const moduleName = packageName;
    return (await import(moduleName)) as PuppeteerModule;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `PDF-motoren manglar. Installer ${packageName} først. Detalj: ${message}`,
    );
  }
}

function isServerlessRuntime(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.AWS_EXECUTION_ENV,
  );
}

async function loadServerlessChromium(): Promise<ChromiumRuntime> {
  const moduleName = "@sparticuz/chromium";
  const chromiumModule = (await import(moduleName)) as ChromiumModule;
  return chromiumModule.default ?? chromiumModule;
}

function classifyLaunchError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/input directory.+does not exist/i.test(message)) return "chromium_bin_missing";
  if (/spawn.+enoent/i.test(message)) return "browser_spawn_enoent";
  if (/eacces|permission/i.test(message)) return "browser_permission";
  if (/loading shared libraries|lib.+\.so/i.test(message)) return "browser_missing_library";
  if (/executable/i.test(message)) return "browser_executable";
  return "browser_launch_unknown";
}

function launchError(error: unknown): Error {
  const code = classifyLaunchError(error);
  const wrapped = new Error(`pdf_browser_launch_failed:${code}`);
  wrapped.name = `PdfBrowserLaunchError:${code}`;
  return wrapped;
}

export async function launchPdfBrowser(): Promise<PdfBrowser> {
  const serverless = isServerlessRuntime();
  const puppeteerModule = await loadPuppeteer(serverless ? "puppeteer-core" : "puppeteer");
  const launcher = puppeteerModule.default?.launch ?? puppeteerModule.launch;
  if (!launcher) {
    throw new Error("Kunne ikkje starte puppeteer: launch() manglar.");
  }

  if (serverless) {
    try {
      const chromium = await loadServerlessChromium();
      const defaultArgs = puppeteerModule.default?.defaultArgs ?? puppeteerModule.defaultArgs;
      const chromiumArgs = chromium.args ?? [];
      const args = defaultArgs
        ? await defaultArgs({ args: chromiumArgs, headless: "shell" })
        : chromiumArgs;

      return await launcher({
        args,
        executablePath: await chromium.executablePath(),
        headless: "shell",
      });
    } catch (error) {
      throw launchError(error);
    }
  }

  return launcher({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=medium",
    ],
  });
}
