import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { Role } from "@prisma/client";
import { prisma } from "../../src/lib/prisma";
import { planQuestion } from "../../src/lib/services/ask.service";
import { executeQueryPlan } from "../../src/lib/services/ask.queries";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "public", "captures");
const base = "http://127.0.0.1:3000";
const accessToken = process.env.DEMO_ACCESS_TOKEN;
const question = "Which lecturers have been late this week?";

const fontCss = [
  face("Inter", "/tmp/fonts/woff/inter-400.woff2", 400),
  face("Inter", "/tmp/fonts/woff/inter-500.woff2", 500),
  face("Inter", "/tmp/fonts/woff/inter-600.woff2", 600),
  face("Inter", "/tmp/fonts/woff/inter-700.woff2", 700),
  face("Space Grotesk", "/tmp/fonts/woff/space-400.woff2", 400),
  face("Space Grotesk", "/tmp/fonts/woff/space-500.woff2", 500),
  face("Space Grotesk", "/tmp/fonts/woff/space-600.woff2", 600),
  face("Space Grotesk", "/tmp/fonts/woff/space-700.woff2", 700),
  `div.border-b.border-amber-200.bg-amber-50{display:none!important}`,
  `nextjs-portal{display:none!important}`
].join("\n");

function face(family: string, file: string, weight: number) {
  const data = readFileSync(file).toString("base64");
  return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${data}) format("woff2");font-weight:${weight};font-style:normal;font-display:block}`;
}

async function boot(context: BrowserContext) {
  await context.addInitScript(() => {
    try {
      localStorage.setItem("showup-theme", "light");
    } catch {
      /* ignore */
    }
  });
}

async function settle(page: Page) {
  await page.addStyleTag({ content: fontCss }).catch(() => undefined);
  await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
  await page.waitForTimeout(500);
}

async function shot(page: Page, name: string) {
  await settle(page);
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file });
  console.log("shot", name);
}

async function goto(page: Page, url: string) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(300);
}

async function asRole(page: Page, role: string) {
  const response = await page.request.patch(`${base}/api/demo/session`, { data: { role } });
  if (!response.ok()) throw new Error(`role ${role} failed ${response.status()} ${await response.text()}`);
}

function wordLateAnswer(rows: Array<{ lecturer?: string; course?: string; count?: number }>) {
  if (!rows.length) return "No lecturers were recorded late this week.";
  const bits = rows.map((row) => `${row.lecturer} for ${row.course}`);
  const list = bits.length === 1 ? bits[0] : `${bits.slice(0, -1).join(", ")}, and ${bits.at(-1)}`;
  if (rows.every((row) => row.count === 1)) {
    return `This week, ${rows.length} lecturers were each recorded late once: ${list}.`;
  }
  return `This week, lateness was recorded for ${list}.`;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  await prisma.identityLookup.deleteMany({});
  const plan = planQuestion(question);
  if (!plan) throw new Error("The late-this-week question did not match a local query plan");
  const rows = (await executeQueryPlan(plan, {
    id: "atu_profile_vc",
    role: Role.VC,
    universityId: "atu_university",
    departmentId: null
  })) as Array<{ lecturer?: string; course?: string; count?: number; period?: string }>;
  const answer = wordLateAnswer(rows);
  writeFileSync(path.join(outDir, "ask-answer.json"), JSON.stringify({ question, plan, rows, answer, groq: false }, null, 2));
  console.log(answer);

  if (!accessToken) throw new Error("Set DEMO_ACCESS_TOKEN before capturing.");
  const mobileOnly = process.env.CAPTURE_PART === "mobile";
  const browser = await chromium.launch({
    executablePath: "/usr/local/bin/google-chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });
  if (!mobileOnly) {
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "light"
  });
  await boot(desktop);
  const start = await desktop.request.post(`${base}/api/demo/session`, {
    data: { accessToken, role: "QA_OFFICER" }
  });
  if (!start.ok()) throw new Error(`demo session ${start.status()} ${await start.text()}`);

  const page = await desktop.newPage();
  page.setDefaultTimeout(60000);

  await page.route("**/api/ask", async (route) => {
    const body = route.request().postDataJSON() as { question?: string };
    if ((body.question ?? "").toLowerCase().includes("late")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ answer }) });
      return;
    }
    await route.continue();
  });

  await goto(page, `${base}/login`);
  await shot(page, "login");

  await goto(page, `${base}/dashboard`);
  await page.getByRole("heading", { name: "Command Center", exact: true }).waitFor();
  await shot(page, "qa-dashboard");

  await goto(page, `${base}/flags`);
  await page.getByRole("heading", { name: "Flags", exact: true }).waitFor();
  await shot(page, "qa-flags");
  await page.getByRole("button", { name: "Lateness", exact: true }).click();
  await page.waitForTimeout(400);
  await shot(page, "qa-flags-late");

  await goto(page, `${base}/courses/atu_course_ceng_1`);
  await page.getByRole("heading", { name: /CENG301/ }).waitFor();
  const coverageText = await page.locator("#coverage").innerText();
  writeFileSync(path.join(outDir, "coverage.txt"), coverageText);
  await page.locator("#coverage").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot(page, "course-coverage");

  await goto(page, `${base}/contests`);
  await page.getByRole("heading", { name: "Contests", exact: true }).waitFor();
  await shot(page, "contests");

  await goto(page, `${base}/reports/atu_report_1_5`);
  await page.getByText("Lecturer provided attendance evidence").waitFor();
  await shot(page, "contest-report");

  await goto(page, `${base}/lecturers`);
  await page.getByRole("heading", { name: "Lecturers", exact: true }).waitFor();
  await shot(page, "lecturers");

  await goto(page, `${base}/lecturers/atu_lect_ceng_1`);
  await page.getByRole("heading", { name: /Akua Mensah/ }).waitFor();
  await shot(page, "lecturer-profile");

  await goto(page, `${base}/reports`);
  await page.getByRole("link", { name: "Export" }).waitFor();
  const csv = await page.request.get(`${base}/api/export/reports`);
  if (!csv.ok()) throw new Error(`csv ${csv.status()}`);
  const csvText = await csv.text();
  const preview = csvText.trim().split("\n").slice(0, 7);
  writeFileSync(path.join(outDir, "csv-preview.txt"), preview.join("\n"));
  await shot(page, "reports-export");

  await goto(page, `${base}/students`);
  await page.getByRole("heading", { name: "Students", exact: true }).waitFor();
  await shot(page, "students-sealed");

  await goto(page, `${base}/discrepancies`);
  await page.getByRole("heading", { name: "Reporter discrepancies", exact: true }).waitFor();
  await shot(page, "discrepancies");

  const reveal = await page.request.get(
    `${base}/api/reps/identity/atu_profile_rep_1?reason=${encodeURIComponent("Quality review of a contested session")}`
  );
  if (!reveal.ok()) throw new Error(`reveal ${reveal.status()} ${await reveal.text()}`);
  writeFileSync(path.join(outDir, "reveal.json"), await reveal.text());
  await goto(page, `${base}/lookups`);
  await page.getByText("Quality review of a contested session").waitFor();
  await shot(page, "lookups");

  await asRole(page, "VC");
  await goto(page, `${base}/analytics`);
  await page.getByRole("heading", { name: "VC Dashboard", exact: true }).waitFor();
  await page.getByRole("heading", { name: "Analytics", exact: true }).waitFor();
  const analyticsBits = await page.locator("section").first().innerText().catch(() => "");
  const metrics = await page.locator("main").innerText();
  writeFileSync(path.join(outDir, "analytics.txt"), metrics.slice(0, 2500));
  await shot(page, "vc-analytics");
  await page.getByText("Flag type distribution").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await shot(page, "vc-analytics-charts");
  console.log("analytics header sample", analyticsBits.slice(0, 80));

  await page.getByRole("button", { name: "Open Meridiqa AI" }).click();
  await page.getByRole("heading", { name: "Meridiqa AI" }).waitFor();
  await shot(page, "ask-open");
  await page.getByRole("button", { name: question }).click();
  await page.waitForTimeout(200);
  await shot(page, "ask-question");
  await page.getByRole("button", { name: "Send question" }).click();
  await page.getByText(answer.slice(0, 40)).waitFor();
  await page.waitForTimeout(300);
  await shot(page, "ask-answer");

  await asRole(page, "HOD");
  await goto(page, `${base}/dashboard`);
  await page.getByRole("heading", { name: "HOD Dashboard", exact: true }).waitFor();
  await shot(page, "hod-dashboard");
  await goto(page, `${base}/courses`);
  await page.getByRole("heading", { name: "Courses", exact: true }).waitFor();
  await shot(page, "hod-courses");

  await asRole(page, "IT");
  await goto(page, `${base}/admin`);
  await page.getByRole("heading", { name: "Admin", exact: true }).waitFor();
  await shot(page, "it-admin");
  await goto(page, `${base}/settings`);
  await page.getByRole("heading", { name: "Settings", exact: true }).waitFor();
  await shot(page, "it-settings");
  await page.getByText("Enable Meridiqa AI").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot(page, "it-settings-ai");

  await desktop.close();
  }

  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: "light",
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  });
  await boot(phone);
  const phoneStart = await phone.request.post(`${base}/api/demo/session`, {
    data: { accessToken, role: "CLASS_REP" }
  });
  if (!phoneStart.ok()) throw new Error(`rep session ${phoneStart.status()} ${await phoneStart.text()}`);
  const mobile = await phone.newPage();
  await goto(mobile, `${base}/rep/submit`);
  await mobile.getByRole("heading", { name: "Computer Engineering Professional Practice 1", exact: true }).waitFor();
  await shot(mobile, "rep-session");
  const ping = mobile.getByRole("button", { name: "Ping Lecturer" });
  await ping.waitFor();
  await shot(mobile, "rep-ping");
  await ping.click();
  await mobile.getByText("Lecturer notified").waitFor();
  await shot(mobile, "rep-ping-sent");

  await mobile.getByRole("button", { name: "Next" }).click();
  await mobile.locator('select[name="arrivalStatus"]').selectOption("LATE");
  await mobile.getByLabel("Minutes late").fill("15");
  await shot(mobile, "rep-presence");
  await mobile.getByRole("button", { name: "Next" }).click();
  const topics = mobile.locator('input[name="topicIds"]');
  await topics.nth(0).check();
  await topics.nth(1).check();
  await mobile.locator('input[name="teachingAids"][value="SLIDES"]').check();
  await shot(mobile, "rep-topics");
  await mobile.getByRole("button", { name: "Next" }).click();
  await shot(mobile, "rep-notes");
  await mobile.getByRole("button", { name: "Next" }).click();
  const cancel = mobile.getByRole("button", { name: "Cancel" });
  if (await cancel.isVisible().catch(() => false)) await cancel.click();
  await shot(mobile, "rep-review");
  await mobile.locator("form").getByRole("button", { name: "Submit" }).click();
  await mobile.getByRole("heading", { name: "Submit this report?" }).waitFor();
  await shot(mobile, "rep-confirm");
  await mobile.locator("div.fixed.inset-0").getByRole("button", { name: "Submit", exact: true }).click();
  await mobile.getByRole("heading", { name: "Report recorded" }).waitFor();
  await shot(mobile, "rep-recorded");

  const pingRow = await prisma.latePing.findFirst({ orderBy: { createdAt: "desc" } });
  if (!pingRow?.acknowledgeToken) throw new Error("late ping token missing");
  await goto(mobile, `${base}/api/pings/${pingRow.acknowledgeToken}/acknowledge`);
  await mobile.getByRole("heading", { name: "Response Recorded" }).waitFor();
  await shot(mobile, "acknowledge");

  await browser.close();
  await prisma.$disconnect();
  console.log("captures complete");
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
