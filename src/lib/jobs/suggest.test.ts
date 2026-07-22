import { describe, expect, it } from "vitest";
import { suggestSearchTerms } from "./suggest";
import { extractSkills } from "./skills";

const englishCv = `
Jane Doe — Frontend Developer
5 years of experience building web apps with React, TypeScript and Node.js.
Comfortable with PostgreSQL, Docker and CI/CD pipelines. BSc Computer Science.
`;

const turkishCv = `
Mehmet Yılmaz — Yazılım Mühendisi
3 yıl deneyim. Python, Django ve PostgreSQL ile web servisleri geliştirdim.
Veri analizi projelerinde Pandas kullandım.
`;

describe("suggestSearchTerms", () => {
  it("suggests only titles and skills literally present in the CV", () => {
    const terms = suggestSearchTerms(englishCv);
    expect(terms.titles).toContain("Frontend Developer");
    expect(terms.skills).toEqual(
      expect.arrayContaining(["React", "TypeScript", "Node.js", "PostgreSQL", "Docker"]),
    );
    // Nothing outside the CV's own text is ever suggested.
    expect(terms.titles).not.toContain("Data Scientist");
    expect(terms.skills).not.toContain("Kubernetes");
    expect(terms.skills).not.toContain("AWS");
  });

  it("recognizes Turkish surface forms and maps titles to canonical search terms", () => {
    const terms = suggestSearchTerms(turkishCv);
    expect(terms.titles).toContain("Software Engineer");
    expect(terms.skills).toEqual(
      expect.arrayContaining(["Python", "Django", "PostgreSQL", "Pandas"]),
    );
  });

  it("derives the experience level from stated years", () => {
    expect(suggestSearchTerms(englishCv).level).toBe("mid");
    expect(suggestSearchTerms(turkishCv).level).toBe("mid");
    expect(suggestSearchTerms("Senior engineer, 8 years of experience.").level).toBe("senior");
    expect(suggestSearchTerms("Computer science student looking for an internship.").level).toBe(
      "internship",
    );
    expect(suggestSearchTerms("Some text with no signal at all.").level).toBeNull();
  });

  it("returns empty suggestions for missing CV text", () => {
    expect(suggestSearchTerms(null)).toEqual({ titles: [], skills: [], level: null });
  });
});

describe("extractSkills", () => {
  it("matches on word boundaries, not substrings", () => {
    expect(extractSkills("I write JavaScript daily.")).toContain("JavaScript");
    expect(extractSkills("I write JavaScript daily.")).not.toContain("Java");
    expect(extractSkills("Expert in Java and Spring Boot.")).toContain("Java");
  });

  it("handles punctuation-heavy skill names", () => {
    const found = extractSkills("Worked with C++, C# and .NET on CI/CD tooling.");
    expect(found).toEqual(expect.arrayContaining(["C++", "C#", ".NET", "CI/CD"]));
  });

  it("does not infer skills from lookalike words", () => {
    expect(extractSkills("We go to market fast and spring into action.")).toEqual([]);
    expect(extractSkills("R&D department")).not.toContain("R");
  });
});
