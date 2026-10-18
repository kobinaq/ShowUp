import { DEMO_COOKIE, DEMO_COOKIE_LEGACY, REPORT_DRAFTS_KEY, REPORT_DRAFTS_KEY_LEGACY, THEME_KEY, THEME_KEY_LEGACY } from "@/lib/branding/storage-keys";

describe("branding storage keys", () => {
  it("uses Meridiqa keys with ShowUp legacy fallbacks", () => {
    expect(THEME_KEY).toBe("meridiqa-theme");
    expect(THEME_KEY_LEGACY).toBe("showup-theme");
    expect(DEMO_COOKIE).toBe("meridiqa_demo");
    expect(DEMO_COOKIE_LEGACY).toBe("showup_demo");
    expect(REPORT_DRAFTS_KEY).toBe("meridiqa:report-drafts");
    expect(REPORT_DRAFTS_KEY_LEGACY).toBe("showup:report-drafts");
  });
});
