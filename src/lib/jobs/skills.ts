// Curated technology/skill dictionary used for deterministic matching.
// Extraction only ever *recognizes* terms literally present in a text, so
// nothing here can add a skill to a CV that doesn't contain it.

interface SkillEntry {
  /** Canonical display name. */
  name: string;
  /** Lowercase surface forms that count as this skill. */
  aliases: string[];
}

const SKILLS: SkillEntry[] = [
  // Languages
  { name: "JavaScript", aliases: ["javascript", "js"] },
  { name: "TypeScript", aliases: ["typescript", "ts"] },
  { name: "Python", aliases: ["python"] },
  { name: "Java", aliases: ["java"] },
  { name: "C#", aliases: ["c#", "csharp"] },
  { name: "C++", aliases: ["c++", "cpp"] },
  // Bare "c", "go", and "r" collide with ordinary words; require
  // unambiguous surface forms even though that under-recognizes a little.
  { name: "C", aliases: ["c programming", "embedded c"] },
  { name: "Go", aliases: ["golang"] },
  { name: "Rust", aliases: ["rust"] },
  { name: "PHP", aliases: ["php"] },
  { name: "Ruby", aliases: ["ruby"] },
  { name: "Kotlin", aliases: ["kotlin"] },
  { name: "Swift", aliases: ["swift"] },
  { name: "Scala", aliases: ["scala"] },
  { name: "R", aliases: ["r programming", "rstudio", "r studio"] },
  { name: "SQL", aliases: ["sql"] },
  { name: "Bash", aliases: ["bash", "shell scripting"] },
  // Frontend
  { name: "React", aliases: ["react", "react.js", "reactjs"] },
  { name: "Next.js", aliases: ["next.js", "nextjs"] },
  { name: "Angular", aliases: ["angular"] },
  { name: "Vue", aliases: ["vue", "vue.js", "vuejs"] },
  { name: "Svelte", aliases: ["svelte"] },
  { name: "HTML", aliases: ["html", "html5"] },
  { name: "CSS", aliases: ["css", "css3"] },
  { name: "Sass", aliases: ["sass", "scss"] },
  { name: "Tailwind CSS", aliases: ["tailwind", "tailwind css", "tailwindcss"] },
  { name: "Redux", aliases: ["redux"] },
  { name: "React Native", aliases: ["react native"] },
  { name: "Flutter", aliases: ["flutter"] },
  // Backend
  { name: "Node.js", aliases: ["node.js", "nodejs", "node js"] },
  { name: "Express", aliases: ["express.js", "expressjs"] },
  { name: "Django", aliases: ["django"] },
  { name: "Flask", aliases: ["flask"] },
  { name: "FastAPI", aliases: ["fastapi"] },
  { name: "Spring", aliases: ["spring boot", "spring framework"] },
  { name: "Rails", aliases: ["ruby on rails", "rails"] },
  { name: "Laravel", aliases: ["laravel"] },
  { name: ".NET", aliases: [".net", "dotnet", "asp.net"] },
  { name: "GraphQL", aliases: ["graphql"] },
  { name: "REST", aliases: ["rest api", "rest apis", "restful"] },
  { name: "gRPC", aliases: ["grpc"] },
  { name: "Microservices", aliases: ["microservices", "microservice"] },
  // Data stores & pipelines
  { name: "PostgreSQL", aliases: ["postgresql", "postgres"] },
  { name: "MySQL", aliases: ["mysql"] },
  { name: "SQL Server", aliases: ["sql server", "mssql"] },
  { name: "Oracle", aliases: ["oracle"] },
  { name: "MongoDB", aliases: ["mongodb", "mongo"] },
  { name: "Redis", aliases: ["redis"] },
  { name: "Elasticsearch", aliases: ["elasticsearch"] },
  { name: "Kafka", aliases: ["kafka"] },
  { name: "RabbitMQ", aliases: ["rabbitmq"] },
  { name: "Spark", aliases: ["spark", "pyspark"] },
  { name: "Hadoop", aliases: ["hadoop"] },
  { name: "Airflow", aliases: ["airflow"] },
  { name: "dbt", aliases: ["dbt"] },
  { name: "Snowflake", aliases: ["snowflake"] },
  { name: "BigQuery", aliases: ["bigquery"] },
  { name: "Redshift", aliases: ["redshift"] },
  { name: "ETL", aliases: ["etl"] },
  // Analytics & ML
  { name: "Pandas", aliases: ["pandas"] },
  { name: "NumPy", aliases: ["numpy"] },
  { name: "scikit-learn", aliases: ["scikit-learn", "sklearn"] },
  { name: "TensorFlow", aliases: ["tensorflow"] },
  { name: "PyTorch", aliases: ["pytorch"] },
  { name: "Machine Learning", aliases: ["machine learning", "makine öğrenmesi"] },
  { name: "Deep Learning", aliases: ["deep learning", "derin öğrenme"] },
  { name: "NLP", aliases: ["nlp", "natural language processing"] },
  { name: "Computer Vision", aliases: ["computer vision"] },
  { name: "LLM", aliases: ["llm", "llms", "large language model"] },
  { name: "Power BI", aliases: ["power bi", "powerbi"] },
  { name: "Tableau", aliases: ["tableau"] },
  { name: "Looker", aliases: ["looker"] },
  { name: "Excel", aliases: ["excel"] },
  { name: "Data Analysis", aliases: ["data analysis", "veri analizi"] },
  { name: "Data Visualization", aliases: ["data visualization", "veri görselleştirme"] },
  { name: "Statistics", aliases: ["statistics", "istatistik"] },
  // Cloud & DevOps
  { name: "AWS", aliases: ["aws", "amazon web services"] },
  { name: "Azure", aliases: ["azure"] },
  { name: "GCP", aliases: ["gcp", "google cloud"] },
  { name: "Docker", aliases: ["docker"] },
  { name: "Kubernetes", aliases: ["kubernetes", "k8s"] },
  { name: "Terraform", aliases: ["terraform"] },
  { name: "Ansible", aliases: ["ansible"] },
  { name: "Jenkins", aliases: ["jenkins"] },
  { name: "CI/CD", aliases: ["ci/cd", "cicd", "continuous integration"] },
  { name: "Git", aliases: ["git"] },
  { name: "GitHub Actions", aliases: ["github actions"] },
  { name: "Linux", aliases: ["linux"] },
  { name: "Nginx", aliases: ["nginx"] },
  { name: "Serverless", aliases: ["serverless", "lambda"] },
  { name: "Monitoring", aliases: ["prometheus", "grafana", "datadog"] },
  // Mobile
  { name: "iOS", aliases: ["ios"] },
  { name: "Android", aliases: ["android"] },
  // Testing & practices
  { name: "Selenium", aliases: ["selenium"] },
  { name: "Cypress", aliases: ["cypress"] },
  { name: "Playwright", aliases: ["playwright"] },
  { name: "Jest", aliases: ["jest"] },
  { name: "Unit Testing", aliases: ["unit testing", "unit tests", "birim test"] },
  { name: "TDD", aliases: ["tdd", "test driven development"] },
  { name: "Agile", aliases: ["agile", "çevik"] },
  { name: "Scrum", aliases: ["scrum"] },
  { name: "Kanban", aliases: ["kanban"] },
  { name: "Jira", aliases: ["jira"] },
  // Design & product
  { name: "Figma", aliases: ["figma"] },
  { name: "Sketch", aliases: ["sketch"] },
  { name: "Adobe Photoshop", aliases: ["photoshop"] },
  { name: "Adobe Illustrator", aliases: ["illustrator"] },
  { name: "UX", aliases: ["ux", "user experience"] },
  { name: "UI Design", aliases: ["ui design", "ui tasarımı"] },
  { name: "Product Management", aliases: ["product management", "ürün yönetimi"] },
  { name: "A/B Testing", aliases: ["a/b testing", "ab testing"] },
  // Business & other
  { name: "SEO", aliases: ["seo"] },
  { name: "Google Analytics", aliases: ["google analytics"] },
  { name: "Salesforce", aliases: ["salesforce"] },
  { name: "SAP", aliases: ["sap"] },
  { name: "CRM", aliases: ["crm"] },
  { name: "Accounting", aliases: ["accounting", "muhasebe"] },
  { name: "Project Management", aliases: ["project management", "proje yönetimi"] },
  { name: "Customer Support", aliases: ["customer support", "müşteri desteği"] },
  { name: "Copywriting", aliases: ["copywriting"] },
  { name: "Content Marketing", aliases: ["content marketing", "içerik pazarlama"] },
  { name: "Digital Marketing", aliases: ["digital marketing", "dijital pazarlama"] },
  { name: "Cybersecurity", aliases: ["cybersecurity", "siber güvenlik", "penetration testing"] },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Aliases like "c++", "c#", and ".net" sit next to punctuation, so plain
// \b boundaries fail on them; use custom lookarounds over word characters
// plus the symbols that appear inside aliases.
const BOUNDARY_CHARS = "a-z0-9+#.";

const SKILL_MATCHERS: { name: string; regex: RegExp }[] = SKILLS.map((skill) => ({
  name: skill.name,
  regex: new RegExp(
    `(?<![${BOUNDARY_CHARS}])(?:${skill.aliases.map(escapeRegex).join("|")})(?![${BOUNDARY_CHARS}])`,
    "i",
  ),
}));

const SKILL_ORDER = new Map(SKILLS.map((skill, i) => [skill.name, i]));

/**
 * Canonical names of dictionary skills literally present in the text,
 * in dictionary order. Deterministic; recognition only, never inference.
 */
export function extractSkills(text: string): string[] {
  if (!text) return [];
  // "." is a boundary char (node.js, .net), which would also make a
  // sentence-ending period block a match ("…with TypeScript."). Turn
  // periods NOT followed by a word character into spaces first.
  const lower = text.toLowerCase().replace(/\.(?![a-z0-9])/g, " ");
  return SKILL_MATCHERS.filter((m) => m.regex.test(lower)).map((m) => m.name);
}

/** Stable ordering helper so skill lists render consistently. */
export function sortSkills(skills: string[]): string[] {
  return [...skills].sort(
    (a, b) => (SKILL_ORDER.get(a) ?? 999) - (SKILL_ORDER.get(b) ?? 999),
  );
}
