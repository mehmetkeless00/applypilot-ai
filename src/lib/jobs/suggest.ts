import { extractSkills } from "./skills";
import type { ExperienceLevel } from "./types";

// Deterministic search-term suggestions derived from a saved CV version.
// Everything suggested must be literally present in the CV text (English
// or Turkish surface form) — nothing is inferred or invented, and the user
// can edit every suggestion before searching.

interface RoleEntry {
  /** Canonical English title used as the provider search term. */
  title: string;
  /** Lowercase surface forms (English and Turkish) found in CVs. */
  aliases: string[];
}

const ROLES: RoleEntry[] = [
  { title: "Software Engineer", aliases: ["software engineer", "software developer", "yazılım mühendisi", "yazılım geliştirici", "yazılım uzmanı"] },
  { title: "Frontend Developer", aliases: ["frontend developer", "front-end developer", "front end developer", "frontend engineer", "front-end engineer", "önyüz geliştirici"] },
  { title: "Backend Developer", aliases: ["backend developer", "back-end developer", "back end developer", "backend engineer", "back-end engineer"] },
  { title: "Full Stack Developer", aliases: ["full stack developer", "fullstack developer", "full-stack developer", "full stack engineer", "fullstack engineer"] },
  { title: "Mobile Developer", aliases: ["mobile developer", "mobile engineer", "ios developer", "android developer", "mobil geliştirici"] },
  { title: "Data Analyst", aliases: ["data analyst", "veri analisti"] },
  { title: "Data Scientist", aliases: ["data scientist", "veri bilimci", "veri bilimcisi"] },
  { title: "Data Engineer", aliases: ["data engineer", "veri mühendisi"] },
  { title: "Business Analyst", aliases: ["business analyst", "iş analisti"] },
  { title: "Business Intelligence Developer", aliases: ["business intelligence", "bi developer", "bi analyst"] },
  { title: "Machine Learning Engineer", aliases: ["machine learning engineer", "ml engineer"] },
  { title: "DevOps Engineer", aliases: ["devops engineer", "devops"] },
  { title: "Site Reliability Engineer", aliases: ["site reliability engineer", "sre"] },
  { title: "Cloud Engineer", aliases: ["cloud engineer", "cloud architect"] },
  { title: "Security Engineer", aliases: ["security engineer", "security analyst", "siber güvenlik uzmanı"] },
  { title: "QA Engineer", aliases: ["qa engineer", "quality assurance", "test engineer", "test mühendisi", "test uzmanı"] },
  { title: "Product Manager", aliases: ["product manager", "product owner", "ürün yöneticisi"] },
  { title: "Project Manager", aliases: ["project manager", "proje yöneticisi"] },
  { title: "UX Designer", aliases: ["ux designer", "ux/ui designer", "ui/ux designer", "product designer"] },
  { title: "UI Designer", aliases: ["ui designer", "arayüz tasarımcısı"] },
  { title: "Graphic Designer", aliases: ["graphic designer", "grafik tasarımcı", "grafik tasarımcısı"] },
  { title: "Database Administrator", aliases: ["database administrator", "dba", "veritabanı yöneticisi"] },
  { title: "System Administrator", aliases: ["system administrator", "sysadmin", "sistem yöneticisi"] },
  { title: "Embedded Software Engineer", aliases: ["embedded software", "embedded engineer", "gömülü yazılım"] },
  { title: "Game Developer", aliases: ["game developer", "oyun geliştirici"] },
  { title: "Digital Marketing Specialist", aliases: ["digital marketing", "dijital pazarlama uzmanı"] },
  { title: "Content Writer", aliases: ["content writer", "copywriter", "içerik yazarı"] },
  { title: "Accountant", aliases: ["accountant", "muhasebeci", "mali müşavir"] },
  { title: "Sales Manager", aliases: ["sales manager", "satış yöneticisi", "satış müdürü"] },
  { title: "Customer Support Specialist", aliases: ["customer support", "customer success", "müşteri temsilcisi", "müşteri destek"] },
  { title: "HR Specialist", aliases: ["hr specialist", "human resources", "insan kaynakları uzmanı", "insan kaynakları"] },
  { title: "Electrical Engineer", aliases: ["electrical engineer", "elektrik mühendisi", "elektrik-elektronik mühendisi"] },
  { title: "Mechanical Engineer", aliases: ["mechanical engineer", "makine mühendisi"] },
  { title: "Industrial Engineer", aliases: ["industrial engineer", "endüstri mühendisi"] },
  { title: "Civil Engineer", aliases: ["civil engineer", "inşaat mühendisi"] },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ROLE_MATCHERS = ROLES.map((role) => ({
  title: role.title,
  regex: new RegExp(
    `(?<![a-z0-9çğıöşü])(?:${role.aliases.map(escapeRegex).join("|")})(?![a-z0-9çğıöşü])`,
    "i",
  ),
}));

export interface SuggestedTerms {
  /** Likely job titles, canonical English, most reliable first. */
  titles: string[];
  /** Core technologies literally present in the CV. */
  skills: string[];
  /** Detected experience level, or null when the CV gives no signal. */
  level: Exclude<ExperienceLevel, "any"> | null;
}

/** Highest number of years of experience the CV states, if any. */
function detectYears(text: string): number | null {
  const matches = text.matchAll(/(\d{1,2})\s*\+?\s*(?:years?|yıl(?:lık)?)/gi);
  let max: number | null = null;
  for (const m of matches) {
    const years = Number(m[1]);
    if (years > 0 && years <= 40 && (max === null || years > max)) max = years;
  }
  return max;
}

function detectLevel(text: string): SuggestedTerms["level"] {
  const lower = text.toLowerCase();
  if (/\b(?:intern|internship|stajyer|staj)\b/.test(lower)) {
    // An internship mention plus real experience means the person has
    // moved past internships; only suggest it when nothing else signals.
    const years = detectYears(lower);
    if (years === null || years < 1) return "internship";
  }
  if (/(?:^|\W)(?:senior|sr\.|lead|principal|staff|kıdemli)(?:\W|$)/i.test(lower)) {
    return "senior";
  }
  if (/(?:^|\W)(?:junior|jr\.)(?:\W|$)/i.test(lower)) return "junior";
  const years = detectYears(lower);
  if (years === null) return null;
  if (years >= 6) return "senior";
  if (years >= 3) return "mid";
  if (years >= 1) return "junior";
  return "entry";
}

/**
 * Deterministic, editable search-term suggestions from CV text. Titles and
 * skills are surfaced only when their exact surface form appears in the CV.
 */
export function suggestSearchTerms(cvText: string | null): SuggestedTerms {
  if (!cvText) return { titles: [], skills: [], level: null };
  const titles = ROLE_MATCHERS.filter((m) => m.regex.test(cvText)).map(
    (m) => m.title,
  );
  return {
    titles: titles.slice(0, 5),
    skills: extractSkills(cvText).slice(0, 12),
    level: detectLevel(cvText),
  };
}
