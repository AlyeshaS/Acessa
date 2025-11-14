import { chromium } from "playwright";
import axe from "axe-core";

const axeSource = axe.source;

export async function runAxeOnUrl(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle" });

  await page.addScriptTag({ content: axeSource });

  const axeResults = await page.evaluate(async () => {
    // @ts-ignore
    return await axe.run({
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21aa"],
      },
    });
  });

  await browser.close();
  return axeResults;
}
