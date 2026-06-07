type PuppeteerModule = {
  default?: {
    launch: (options: Record<string, unknown>) => Promise<PdfBrowser>;
  };
  launch?: (options: Record<string, unknown>) => Promise<PdfBrowser>;
};

type ChromiumRuntime = {
  args?: string[];
  executablePath: () => Promise<string>;
  headless?: boolean | "shell";
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

async function loadPuppeteer(): Promise<PuppeteerModule> {
  try {
    const moduleName = "puppeteer";
    return (await import(moduleName)) as PuppeteerModule;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `PDF-motoren manglar. Installer puppeteer først: npm install puppeteer. Detalj: ${message}`,
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

async function serverlessChromiumOptions(): Promise<Record<string, unknown>> {
  if (!isServerlessRuntime()) {
    return {};
  }

  const moduleName = "@sparticuz/chromium";
  const chromiumModule = (await import(moduleName)) as ChromiumModule;
  const chromium = chromiumModule.default ?? chromiumModule;
  const executablePath = await chromium.executablePath();

  return {
    args: [
      ...(chromium.args ?? []),
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=medium",
    ],
    executablePath,
    headless: chromium.headless ?? true,
  };
}

export async function launchPdfBrowser(): Promise<PdfBrowser> {
  const puppeteerModule = await loadPuppeteer();
  const launcher = puppeteerModule.default?.launch ?? puppeteerModule.launch;
  if (!launcher) {
    throw new Error("Kunne ikkje starte puppeteer: launch() manglar.");
  }

  const serverlessOptions = await serverlessChromiumOptions();
  return launcher({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=medium",
    ],
    ...serverlessOptions,
  });
}
