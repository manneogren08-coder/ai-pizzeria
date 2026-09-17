import { describe, it, expect } from "vitest";
import { classifyWebsite, isChainOrCentralDomain } from "./websiteClassification";

describe("classifyWebsite", () => {
  it("A: a real, ordinary company domain classifies as REAL_WEBSITE", () => {
    expect(classifyWebsite("https://www.exempelrestaurang.se/")).toBe("REAL_WEBSITE");
    expect(classifyWebsite("http://korkvinbar.se/")).toBe("REAL_WEBSITE");
  });

  it("B: a third-party digital menu page classifies as THIRD_PARTY_MENU", () => {
    expect(classifyWebsite("https://mymenuweb.com/swe/restaurants/2108024/?utm_source=google_profile")).toBe("THIRD_PARTY_MENU");
  });

  it("C: a review/directory listing classifies as DIRECTORY_PROFILE", () => {
    expect(classifyWebsite("https://www.restrate.se/restaurant/restaurang-firstfloor-skelleftea-skelleftea")).toBe("DIRECTORY_PROFILE");
  });

  it("D: a social media profile classifies as SOCIAL_PROFILE", () => {
    expect(classifyWebsite("https://www.facebook.com/somerestaurant")).toBe("SOCIAL_PROFILE");
    expect(classifyWebsite("https://www.instagram.com/somerestaurant")).toBe("SOCIAL_PROFILE");
    expect(classifyWebsite("https://www.tiktok.com/@somerestaurant")).toBe("SOCIAL_PROFILE");
  });

  it("E: a link-in-bio page classifies as LINK_PAGE", () => {
    expect(classifyWebsite("https://linktr.ee/somerestaurant")).toBe("LINK_PAGE");
    expect(classifyWebsite("https://linktree.com/somerestaurant")).toBe("LINK_PAGE");
  });

  it("matches subdomains of a known domain, not just the bare domain", () => {
    expect(classifyWebsite("https://skelleftea.missvoon.se")).toBe("REAL_WEBSITE"); // not a known domain, stays REAL
    expect(classifyWebsite("https://m.facebook.com/somerestaurant")).toBe("SOCIAL_PROFILE");
  });

  it("strips a leading www. before matching", () => {
    expect(classifyWebsite("https://www.mymenuweb.com/x")).toBe("THIRD_PARTY_MENU");
  });

  it("an unparseable URL classifies as UNKNOWN, not REAL_WEBSITE", () => {
    expect(classifyWebsite("not a url")).toBe("UNKNOWN");
    expect(classifyWebsite("")).toBe("UNKNOWN");
  });

  it("does not false-positive on a domain that merely contains a known domain as a substring", () => {
    expect(classifyWebsite("https://notmymenuweb.com/x")).toBe("REAL_WEBSITE");
    expect(classifyWebsite("https://myrestrate.se/x")).toBe("REAL_WEBSITE");
  });
});

describe("isChainOrCentralDomain", () => {
  it("flags known national chain / central-ecosystem domains", () => {
    expect(isChainOrCentralDomain("https://www.ica.se/butiker/kvantum/skelleftea/icanders/")).toBe(true);
    expect(isChainOrCentralDomain("https://elite.se/sv/hotell/skelleftea/restaurang-mandel/")).toBe(true);
    expect(isChainOrCentralDomain("https://www.coop.se/butiker/x")).toBe(true);
  });

  it("does not flag an ordinary independent restaurant domain", () => {
    expect(isChainOrCentralDomain("https://www.exempelrestaurang.se/")).toBe(false);
    expect(isChainOrCentralDomain("http://korkvinbar.se/")).toBe(false);
  });

  it("is independent of classifyWebsite - a chain domain is still a REAL_WEBSITE", () => {
    const url = "https://www.ica.se/butiker/kvantum/skelleftea/icanders/";
    expect(classifyWebsite(url)).toBe("REAL_WEBSITE");
    expect(isChainOrCentralDomain(url)).toBe(true);
  });
});
