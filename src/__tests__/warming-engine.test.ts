import { generateWarmingEmail, calculateDailyWarmingLimit } from "@/lib/warming-engine";
import type { EmailAccount } from "@/types";

describe("generateWarmingEmail", () => {
  it("should return an email with subject and body", () => {
    const email = generateWarmingEmail();
    expect(email.subject).toBeTruthy();
    expect(email.body).toBeTruthy();
    expect(typeof email.subject).toBe("string");
    expect(typeof email.body).toBe("string");
  });

  it("should not contain template placeholders", () => {
    const email = generateWarmingEmail();
    expect(email.subject).not.toContain("{{topic}}");
    expect(email.body).not.toContain("{{topic}}");
  });
});

describe("calculateDailyWarmingLimit", () => {
  const baseAccount: EmailAccount = {
    id: "test-id",
    email: "test@example.com",
    display_name: "Test",
    smtp_host: "smtp.example.com",
    smtp_port: 587,
    smtp_username: "test",
    smtp_password: "pass",
    imap_host: "imap.example.com",
    imap_port: 993,
    daily_send_limit: 50,
    signature: "",
    is_verified: true,
    is_warming: true,
    warming_daily_increase: 2,
    warming_current_limit: 2,
    warming_started_at: "",
    user_id: "user-1",
    created: "2024-01-01",
    updated: "2024-01-01",
  };

  it("should return 0 if warming not started", () => {
    const account = { ...baseAccount, warming_started_at: "" };
    expect(calculateDailyWarmingLimit(account)).toBe(0);
  });

  it("should return base limit on first day", () => {
    const account = { ...baseAccount, warming_started_at: new Date().toISOString() };
    expect(calculateDailyWarmingLimit(account)).toBe(2);
  });

  it("should increase limit over time", () => {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const account = { ...baseAccount, warming_started_at: fiveDaysAgo.toISOString() };
    const limit = calculateDailyWarmingLimit(account);
    // 2 base + 5 days * 2 increase = 12
    expect(limit).toBe(12);
  });

  it("should cap at daily_send_limit", () => {
    const longAgo = new Date();
    longAgo.setDate(longAgo.getDate() - 100);
    const account = { ...baseAccount, warming_started_at: longAgo.toISOString(), daily_send_limit: 50 };
    expect(calculateDailyWarmingLimit(account)).toBe(50);
  });
});
