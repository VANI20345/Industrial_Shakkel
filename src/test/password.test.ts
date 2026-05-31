import { describe, it, expect } from "vitest";
import { validatePassword } from "@/lib/passwordPolicy";

describe("validatePassword", () => {
  it("rejects short passwords", () => {
    expect(validatePassword("a1b").ok).toBe(false);
    expect(validatePassword("ab12cd").ok).toBe(false);
  });
  it("rejects without a letter", () => {
    expect(validatePassword("12345678").ok).toBe(false);
  });
  it("rejects without a digit", () => {
    expect(validatePassword("abcdefgh").ok).toBe(false);
  });
  it("accepts strong-enough passwords", () => {
    expect(validatePassword("password1").ok).toBe(true);
    expect(validatePassword("Aa1bbbbb").ok).toBe(true);
  });
  it("returns Arabic messages when requested", () => {
    const r = validatePassword("123", "ar");
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/كلمة المرور/);
  });
});

describe("quote items validation", () => {
  // Simulates Quote.tsx filter — items map to non-null payloads
  const map = { p1: { id: "p1", code: "A", name: "A", unit: "pcs" } } as Record<string, { id: string; code: string; name: string; unit: string }>;
  it("drops items whose product is missing", () => {
    const items = [{ productId: "p1", quantity: 2 }, { productId: "missing", quantity: 1 }];
    const payload = items.map((it) => map[it.productId] ? { product_id: it.productId, qty: it.quantity } : null).filter(Boolean);
    expect(payload.length).toBe(1);
  });
});
