import { clientIpFromHeaders } from "@/lib/http/client-ip";

describe("clientIpFromHeaders", () => {
  it("prefers the first forwarded address", () => {
    const headers = new Headers({
      "x-forwarded-for": "1.1.1.1, 2.2.2.2",
      "x-real-ip": "9.9.9.9"
    });
    expect(clientIpFromHeaders(headers)).toBe("1.1.1.1");
  });

  it("falls back to unknown", () => {
    expect(clientIpFromHeaders(new Headers())).toBe("unknown");
  });
});
