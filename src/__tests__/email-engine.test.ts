import { personalizeContent, selectABVariant } from "@/lib/email-engine";
import type { Contact } from "@/types";

const mockContact: Contact = {
  id: "test-id",
  email: "john@example.com",
  first_name: "John",
  last_name: "Doe",
  company: "Acme Inc",
  title: "CEO",
  phone: "+1234567890",
  custom_fields: { industry: "SaaS" },
  tags: ["prospect"],
  status: "active",
  user_id: "user-1",
  created: "2024-01-01",
  updated: "2024-01-01",
};

describe("personalizeContent", () => {
  it("should replace first_name placeholder", () => {
    const result = personalizeContent("Hi {{first_name}}", mockContact);
    expect(result).toBe("Hi John");
  });

  it("should replace last_name placeholder", () => {
    const result = personalizeContent("Dear {{last_name}}", mockContact);
    expect(result).toBe("Dear Doe");
  });

  it("should replace email placeholder", () => {
    const result = personalizeContent("Your email: {{email}}", mockContact);
    expect(result).toBe("Your email: john@example.com");
  });

  it("should replace company placeholder", () => {
    const result = personalizeContent("At {{company}}", mockContact);
    expect(result).toBe("At Acme Inc");
  });

  it("should replace title placeholder", () => {
    const result = personalizeContent("As {{title}}", mockContact);
    expect(result).toBe("As CEO");
  });

  it("should replace custom field placeholders", () => {
    const result = personalizeContent("Industry: {{industry}}", mockContact);
    expect(result).toBe("Industry: SaaS");
  });

  it("should replace multiple placeholders in one template", () => {
    const result = personalizeContent(
      "Hi {{first_name}} {{last_name}} from {{company}}",
      mockContact
    );
    expect(result).toBe("Hi John Doe from Acme Inc");
  });

  it("should handle missing fields gracefully", () => {
    const emptyContact = { ...mockContact, first_name: "", company: "" };
    const result = personalizeContent("Hi {{first_name}} at {{company}}", emptyContact);
    expect(result).toBe("Hi  at ");
  });
});

describe("selectABVariant", () => {
  it("should return A or B", () => {
    const result = selectABVariant(50);
    expect(["A", "B"]).toContain(result);
  });

  it("should respect split percentage over many runs", () => {
    let aCount = 0;
    const total = 10000;

    for (let i = 0; i < total; i++) {
      if (selectABVariant(70) === "A") aCount++;
    }

    // With 70% split, A should be selected roughly 70% of the time
    const aPercentage = (aCount / total) * 100;
    expect(aPercentage).toBeGreaterThan(60);
    expect(aPercentage).toBeLessThan(80);
  });
});
