// English message catalog — the single typed source of truth. `tr.ts` must
// provide every key (enforced by the Messages type). User-provided content
// (resume text, job descriptions, company names, dates) is never in here —
// only the product's own UI strings.

export const en = {
  common: {
    language: "Language",
    cancel: "Cancel",
    close: "Close",
    delete: "Delete",
    signOut: "Sign out",
    backToHome: "← Back to home",
    errorTitle: "Something went wrong",
    errorBody: "An unexpected error occurred while loading this page.",
    tryAgain: "Try again",
  },
  meta: {
    defaultTitle: "ApplyPilot AI — Tailor every job application with AI",
    description:
      "Paste a job description and your resume. Get an AI fit score, skills-gap analysis, a tailored professional summary, and a ready-to-send cover letter.",
    myAnalyses: "My analyses",
    newAnalysis: "New analysis",
    analysis: "Analysis",
    findJobs: "Find jobs",
    resumes: "My resumes",
    resume: "Resume",
    billing: "Billing",
    signIn: "Sign in",
    signUp: "Sign up",
    forgotPassword: "Reset your password",
    resetPassword: "Choose a new password",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
  },
  nav: {
    myAnalyses: "My analyses",
    newAnalysis: "New analysis",
    findJobs: "Find jobs",
    resumes: "Resumes",
    billing: "Billing",
    usageTitle: "Analyses used this month",
    usageThisMonth: (used: number, limit: number) => `${used}/${limit} this month`,
    menu: "Menu",
    closeMenu: "Close menu",
  },
  landing: {
    pricing: "Pricing",
    signIn: "Sign in",
    getStarted: "Get started",
    heroLead: "Know your fit",
    heroAccent: "before",
    heroTail: "you apply",
    heroSubtitle:
      "ApplyPilot scores your resume against the job's real requirements, shows you exactly what to fix, and proves it worked — your score climbs as you edit. Honest analysis, no invented experience.",
    heroCta: "Analyze your first application — free",
    heroSecondaryCta: "See how it works",
    heroNote: "3 free analyses a month. No credit card required.",
    howItWorks: "How it works",
    steps: [
      {
        title: "Add the job",
        description:
          "Paste the description or import it straight from a posting URL — Greenhouse, Lever, Ashby, Workable, and many company career pages.",
      },
      {
        title: "Add your resume once",
        description:
          "Paste it or upload a PDF. It's saved to your library with versions, so you never paste it twice.",
      },
      {
        title: "Fix, re-score, apply",
        description:
          "Get a calibrated fit score, the gaps that matter, concrete rewrites, and a ready cover letter. Edit, re-score, and watch the number climb.",
      },
    ],
    featuresTitle: "Everything you need to apply with confidence",
    features: [
      {
        title: "Calibrated fit score",
        description:
          "A 0–100 score built on the role's real must-haves — not keyword counting, and never inflated to flatter you.",
      },
      {
        title: "Evidence, not fabrication",
        description:
          "Every strength is backed by a line from your own resume. We never invent experience — recruiters can tell.",
      },
      {
        title: "ATS keyword coverage",
        description:
          "See exactly which screening keywords you match, which are weak, and which are missing — with a fix for each.",
      },
      {
        title: "Concrete rewrites",
        description:
          "Before/after rewrites of your weakest resume passages, aligned to the job's language. Copy, apply, re-score.",
      },
      {
        title: "Cover letter in seconds",
        description:
          "A complete, ready-to-send letter grounded in your real experience — edit the tone, keep the substance.",
      },
      {
        title: "Progress you can measure",
        description:
          "Re-score after every edit and see the delta. Your dashboard tracks every application and every improvement.",
      },
    ],
    pricingTitle: "Simple pricing",
    pricingSubtitle: "Start free. Upgrade when your search gets serious. Cancel anytime.",
    pricingSubtitleComingSoon: "Start free — 3 analyses a month, no credit card required.",
    startFree: "Start free",
    getPro: "Get Pro",
    trustTitle: "Your resume is yours",
    trust: [
      {
        title: "Private by default",
        description:
          "Row-level security isolates your data; resumes live in private storage only you can access.",
      },
      {
        title: "Never sold, never trained on",
        description:
          "Your resume is used only to run your analyses. We don't sell data or use it to train models.",
      },
      {
        title: "Delete anytime",
        description:
          "Remove any resume or analysis with one click — files included.",
      },
    ],
    faqTitle: "Frequently asked questions",
    faqs: [
      {
        q: "Is the fit score just keyword matching?",
        a: "No. The score weighs the role's explicit must-have qualifications against what your resume actually demonstrates. Keyword coverage is reported separately, because ATS screening and human screening are different problems.",
      },
      {
        q: "Will it invent experience I don't have?",
        a: "Never. The analysis is instructed to ground every claim in your resume, and suggestions only rephrase what's genuinely there. Fabricated resumes fail interviews — we won't write one.",
      },
      {
        q: "What happens to my resume?",
        a: "It's stored encrypted in your private account, sent to our AI provider only to run your analysis, and never sold or used to train models. You can delete resumes and analyses at any time.",
      },
      {
        q: "Which job boards can I import from?",
        a: "Greenhouse, Lever, Ashby, and Workable have first-class support, and most company career pages import via structured data. LinkedIn postings need a quick copy-paste.",
      },
      {
        q: "Can I cancel Pro anytime?",
        a: "Yes — one click in the Stripe billing portal. You keep Pro until the end of the period you paid for.",
      },
    ],
    finalCtaTitle: "Your next application deserves better than a guess",
    finalCta: "Get your fit score — free",
    footerPrivacy: "Privacy",
    footerTerms: "Terms",
  },
  auth: {
    welcomeBack: "Welcome back",
    createAccount: "Create your account",
    signInSubtitle: "Sign in to your ApplyPilot AI account",
    signUpSubtitle: "Start tailoring your job applications with AI",
    checkEmail: "Check your email to confirm your account, then sign in.",
    continueWithGoogle: "Continue with Google",
    googleUnavailable: "Google sign-in isn't available right now. Use email instead.",
    orWithEmail: "or with email",
    fullName: "Full name",
    email: "Email",
    password: "Password",
    forgotPassword: "Forgot password?",
    signIn: "Sign in",
    signUp: "Sign up",
    agreeStart: "By signing up you agree to the",
    terms: "Terms",
    and: "and",
    privacyPolicy: "Privacy Policy",
    noAccount: "No account?",
    haveAccount: "Already have an account?",
    forgotTitle: "Reset your password",
    forgotSubtitle: "Enter your account email and we'll send a reset link.",
    forgotSent: "If an account exists for that email, a reset link is on its way.",
    forgotSubmit: "Send reset link",
    backToSignIn: "← Back to sign in",
    resetTitle: "Choose a new password",
    resetSubmit: "Update password",
    newPassword: "New password",
    errors: {
      invalidEmail: "Enter a valid email address",
      passwordMin: "Password must be at least 8 characters",
      enterName: "Enter your name",
      invalidCredentials: "Invalid email or password",
      disposableEmail:
        "Disposable email addresses aren't supported — use your regular email.",
      resetExpired:
        "This reset link has expired. Request a new one from the sign-in page.",
    },
  },
  onboarding: {
    title: "Get your first fit report",
    subtitle:
      "Three quick steps to see how well you match a job — and exactly what to fix before you apply.",
    completed: "(completed)",
    stepResumeTitle: "Add your resume",
    stepResumeDescription:
      "Upload a PDF or paste the text once. It's saved to your library with versions, so you never paste it twice.",
    stepResumeCta: "Add your resume",
    stepJobTitle: "Add a job",
    stepJobDescription:
      "Paste a job description or import it straight from a posting URL.",
    stepJobCta: "Analyze a job",
    stepReportTitle: "Review your fit report",
    stepReportDescription:
      "Get a calibrated fit score, the skills gaps that matter, concrete resume rewrites, and a ready-to-send cover letter.",
  },
  dashboard: {
    title: "My analyses",
    stats: {
      analyses: "Analyses",
      averageFit: "Average fit",
      bestFit: "Best fit",
      rescores: "Re-scores",
    },
    fit: { strong: "Strong fit", fair: "Fair fit", poor: "Weak fit" },
    companyUnknown: "Company not specified",
  },
  analysis: {
    back: "← All analyses",
    fitAssessment: "Fit assessment",
    scoreAria: (score: number) => `Fit score: ${score} out of 100`,
    rescore: "Re-score",
    rescoring: "Re-scoring…",
    rescoreUsesSaved: "Uses the latest version of your saved resume.",
    rescoreUsesSame: "Re-runs with the same resume.",
    rescoreFailed: "Re-score failed. Try again.",
    upgrade: "Upgrade",
    // The report language names itself, so the badge reads the same in
    // both UI languages.
    reportBadge: (lang: "en" | "tr") =>
      lang === "tr" ? "Türkçe rapor" : "English report",
    languageMismatch:
      "This analysis was generated in Turkish. Re-run it with English output to create an English report.",
    regenerate: "Regenerate in English",
    regenerateConfirmTitle: "Regenerate in English?",
    regenerateConfirmBody:
      "This runs a fresh analysis of the same job and resume with English output. It uses one analysis from your monthly quota; the original analysis is kept.",
    regenerating: "Regenerating…",
    deleteConfirm: "Delete this analysis? This cannot be undone.",
    exportPdf: "Export PDF",
    exportDocx: "Export DOCX",
    downloadFullReport: "Download full report (PDF)",
    strengthsTitle: "Your strengths for this role",
    strengthsEmpty: "No clear matches were found between your resume and this role.",
    missingSkillsTitle: "Missing skills",
    missingSkillsEmpty:
      "No significant gaps found — your resume covers this role's requirements well.",
    importance: { critical: "Critical", important: "Important", nice_to_have: "Nice to have" },
    atsTitle: "ATS keyword coverage",
    atsStatus: { matched: "Matched", weak: "Weak", missing: "Missing" },
    atsCounts: {
      matched: (n: number) => `${n} matched`,
      weak: (n: number) => `${n} weak`,
      missing: (n: number) => `${n} missing`,
    },
    atsImportance: { required: "Required", preferred: "Preferred", nice_to_have: "Nice to have" },
    summaryTitle: "Tailored professional summary",
    coverLetterTitle: "Cover letter",
    copy: "Copy",
    copied: "Copied!",
    download: "Download",
    comparison: {
      title: "Compared to the previous run",
      improvedBy: (n: number) => `Score improved by ${n} point${n === 1 ? "" : "s"}`,
      decreasedBy: (n: number) => `Score decreased by ${n} point${n === 1 ? "" : "s"}`,
      noChange: "No score change",
      previous: "Previous",
      thisRun: "This run",
      resumeVersion: (v: number) => `resume v${v}`,
      sameResume: "same resume",
      viewPrevious: "View previous result",
      atsLabel: "ATS keywords:",
      atsMatched: "matched",
      atsWeak: "weak",
      atsMissing: "missing",
      nowMatched: "Now matched:",
      regressed: "No longer matched:",
      more: (n: number) => `+${n} more`,
      disclaimer:
        "Scores measure alignment with this job description. A higher score means a stronger keyword and requirement match — it doesn't guarantee interviews or offers.",
    },
    suggestions: {
      title: "Resume Improvement Suggestions",
      applyHint:
        "Run analyses with a saved resume to apply suggestions in one click — for now, copy the improved text into your resume manually.",
      impact: { high: "High impact", medium: "Medium impact", low: "Low impact" },
      current: "Current",
      improved: "Improved",
      copyImproved: "Copy improved text",
      apply: "Apply to resume",
      previewTitle: "Preview change",
      before: "Before",
      after: "After",
      warning:
        "Only the text shown above will change. The rest of your resume stays exactly as it is, and your current version is kept.",
      confirm: "Create new version",
      confirmBusy: "Creating version…",
      confirmAria: "Create a new resume version with this change",
      appliedTitle: "Suggestion applied",
      appliedBody: (v: number) =>
        `Resume version ${v} was created. Your previous versions are unchanged.`,
      appliedStatus: (v: number) =>
        `Suggestion applied. Resume version ${v} was created.`,
      rescoreWith: (v: number) => `Re-score with version ${v}`,
      viewResume: "View resume",
      usesQuota: "Re-scoring uses 1 analysis from your monthly limit.",
      versionKept: "Your new resume version is saved either way.",
      reviewResume: "Review your resume",
    },
  },
  newAnalysis: {
    title: "New analysis",
    subtitle:
      "Paste the job description and your resume. You'll get a fit score, skills-gap analysis, tailored summary, and cover letter.",
    jobTitle: "Job title",
    jobTitlePlaceholder: "Senior Frontend Engineer",
    company: "Company (optional)",
    companyPlaceholder: "Acme Inc.",
    jobDescription: "Job description",
    tabPasteJob: "Paste job description",
    tabImport: "Import from URL",
    importFallbackHint: "If import fails, you can paste the job description manually.",
    importUrlLabel: "Job posting URL",
    importHint:
      "Works best with Greenhouse, Lever, Ashby, and Workable; many other job pages import too, but not all. For LinkedIn, copy the posting text and use the Paste tab.",
    importing: "Importing…",
    importButton: "Import job posting",
    importedFrom: (url: string) => `Imported from ${url} — review and edit below.`,
    jobDescriptionPlaceholder: "Paste the full job description here…",
    yourResume: "Your resume",
    stepJob: "The job",
    tabSaved: "Saved resume",
    tabPaste: "Paste text",
    tabUpload: "Upload PDF",
    savedResumeHint: "The latest version of this resume will be used.",
    resumePlaceholder: "Paste your resume text here…",
    choosePdf: "Choose a PDF resume",
    pdfLimits: "PDF only, up to 10 MB",
    privacyNote:
      "Your resume is private: used only for your analyses, never sold or used to train models.",
    saveToLibrary: "Save to my resumes for reuse",
    resumeName: "Resume name",
    resumeNamePlaceholder: "e.g. Backend Engineer resume",
    outputLanguage: "Analysis language",
    outputLanguageHint: "The report and cover letter are written in this language.",
    languageNames: { en: "English", tr: "Türkçe" },
    submit: "Analyze application",
    submitting: "Analyzing…",
    progressNote: "Analysis in progress — this usually takes under a minute.",
    errors: {
      chooseSaved: "Choose a saved resume, or paste your resume text.",
      choosePdfFile: "Choose a PDF resume to upload.",
      mustBePdf: "The resume must be a PDF file.",
      pdfTooLarge: "The PDF is too large (max 10 MB).",
      sessionExpired: "Your session expired — sign in again.",
      uploadFailed: "Could not upload the PDF. Try again.",
      analysisFailed: "Analysis failed. Try again.",
      importFailed: "Import failed. Try pasting manually.",
      generic: "Something went wrong.",
    },
  },
  jobs: {
    title: "Find jobs",
    subtitle:
      "Search live listings from real job boards and see which ones look most compatible with your CV — before you spend an analysis.",
    emptyTitle: "Add a CV to start searching",
    emptyDescription:
      "Job matching compares real listings against a saved CV. Save yours once, and every search scores listings against it.",
    emptyCta: "Add your CV",
    filters: {
      legend: "Search filters",
      resume: "CV",
      version: "Version",
      versionLabel: (v: number, date: string) => `v${v} — ${date}`,
      keywords: "Role keywords",
      keywordsHint:
        "Only these keywords are sent to job boards as your search — edit them freely. Your CV itself is never sent.",
      suggestedTitles: "Titles found in your CV",
      suggestedSkills: "Technologies found in your CV",
      suggestionNote: "Suggestions come only from your CV's own text.",
      country: "Country",
      countryHint: "Used for on-site results and to check remote eligibility.",
      workMode: "Work location",
      remote: "Remote",
      onsite: "On-site",
      city: "City (optional)",
      cityPlaceholder: "e.g. Berlin",
      level: "Experience level",
      levels: {
        any: "Any level",
        internship: "Internship",
        entry: "Entry level",
        junior: "Junior",
        mid: "Mid-level",
        senior: "Senior",
      },
      employment: "Employment type",
      employmentTypes: { any: "Any type", full_time: "Full-time", part_time: "Part-time" },
      recency: "Posted within",
      recencyAny: "Any time",
      recencyDays: (n: number) => (n === 1 ? "Last 24 hours" : `Last ${n} days`),
      search: "Search jobs",
      searching: "Searching…",
      keywordsRequired: "Enter at least one role keyword to search.",
      turkeyOnsiteNotice: "Only remote job search is currently supported in Turkey.",
    },
    countries: {
      at: "Austria",
      au: "Australia",
      be: "Belgium",
      br: "Brazil",
      ca: "Canada",
      ch: "Switzerland",
      de: "Germany",
      es: "Spain",
      fr: "France",
      gb: "United Kingdom",
      in: "India",
      it: "Italy",
      mx: "Mexico",
      nl: "Netherlands",
      nz: "New Zealand",
      pl: "Poland",
      sg: "Singapore",
      us: "United States",
      za: "South Africa",
      tr: "Turkey",
    },
    results: {
      heading: "Results",
      count: (n: number) => (n === 1 ? "1 job found" : `${n} jobs found`),
      initialHint:
        "Pick a CV, adjust the filters, and search real job listings.",
      emptyTitle: "No jobs found",
      emptyDescription:
        "Try broader keywords, another country, or a longer posting window.",
      partialFailure: "Some job sources couldn't be reached — results may be incomplete.",
      fullFailure: "Job sources couldn't be reached. Try again in a moment.",
      noProviders:
        "On-site search isn't available for the selected country right now. Try a remote search.",
      retry: "Try again",
    },
    card: {
      remote: "Remote",
      source: (name: string) => `Source: ${name}`,
      viewListing: "Open listing",
      posted: (date: string) => `Posted ${date}`,
      salary: (s: string) => `Salary: ${s}`,
      estimatedMatch: "Estimated match",
      matchAria: (score: number) => `Estimated match: ${score} out of 100`,
      matchedSkills: "Matching skills",
      missingRequirements: "Listed as required, not found in your CV",
      whySummary: "How this estimate was calculated",
      disclaimer:
        "The estimate compares this listing's text with your CV. It is not a full analysis and doesn't guarantee eligibility, interviews, or offers.",
      analyze: "Analyze this job",
      employmentTypes: {
        full_time: "Full-time",
        part_time: "Part-time",
        contract: "Contract",
        other: "Other",
      },
      reasons: {
        titleMatch: (terms: string) => `Title matches: ${terms}`,
        titleNone: "The title doesn't include your keywords",
        skills: (matched: number, total: number) =>
          `${matched} of ${total} technologies named in the listing appear in your CV`,
        skillsUnknown: "The listing names no technologies we can compare",
        seniorityMatch: "Seniority matches your level",
        seniorityAbove: "This role looks more senior than your selected level",
        seniorityUnknown: "The listing doesn't state a clear seniority",
        locationMatch: "Location or remote policy fits your search",
        locationMismatch: "Location or remote eligibility likely doesn't fit",
        locationUnknown: "Location fit couldn't be determined",
        employmentMatch: "Employment type matches",
        employmentMismatch: "Employment type differs from your filter",
        employmentUnknown: "Employment type not stated",
        authorization: "Mentions work-authorization or sponsorship restrictions",
        mandatory: (skills: string) =>
          `Marked as required but not found in your CV: ${skills}`,
      },
    },
    confirm: {
      title: "Analyze this job?",
      body: (resume: string, version: number) =>
        `This runs a full AI analysis of the listing against “${resume}” (version ${version}). It uses one analysis from your monthly quota.`,
      languageLabel: "Analysis language",
      confirm: "Run analysis",
      running: "Analyzing…",
    },
    providers: { adzuna: "Adzuna", remotive: "Remotive" },
    sourceLine: (provider: string, url: string) => `Source: ${provider} — ${url}`,
    errors: {
      rateLimited: "Search limit reached — try again in an hour.",
      searchFailed: "Search failed. Try again.",
      analyzeFailed: "Analysis failed. Try again.",
      invalidListing:
        "This listing can't be analyzed automatically. Open the listing and import its URL from the New analysis page instead.",
    },
  },
  resumes: {
    title: "My resumes",
    subtitle:
      "Save your resume once and reuse it across analyses. Every edit is kept as a version, so you can track what improved your scores.",
    emptyTitle: "No resumes yet",
    emptyDescription:
      "Saved resumes are versioned — every edit becomes a new version you can re-score, so you can watch your fit improve as you refine it.",
    emptyCta: "Add your first resume",
    versions: (n: number) => `${n} ${n === 1 ? "version" : "versions"}`,
    updatedOn: (date: string) => `Updated ${date}`,
    addFirst: "Add your first resume",
    addAnother: "Add another resume",
    sources: { pdf: "Uploaded PDF", paste: "Manual edit", applied_suggestion: "Applied suggestion" },
    detail: {
      allResumes: "← All resumes",
      meta: (versions: string, date: string) => `${versions} · updated ${date}`,
      currentVersion: "Current version",
      pdfTag: "PDF",
      editHint: (next: number) =>
        `Edit and save to create version ${next}. Old versions are kept so past analyses stay traceable.`,
      pdfExtracted:
        "We extracted the text from your uploaded PDF — review it below and save to create an editable version. The original PDF stays stored unchanged.",
      pdfNoText:
        "We couldn't extract text from this PDF (it may be scanned or image-based). Paste your resume text below to make it editable — analyses keep using the original PDF until then.",
      scoreHistory: "Score history",
      scoreHistoryHint: "Analyses that used this resume, newest first.",
      scoreHistoryEmptyPrefix: "No scores yet — results appear here after you",
      scoreHistoryEmptyLink: "analyze a job",
      scoreHistoryEmptySuffix: "or re-score one with this resume.",
      versionHistory: "Version history",
      viewAnalysis: "View analysis",
      compareTitle: "Compare versions",
      compareHint: "See exactly what changed between two versions.",
      fromVersion: "From version",
      toVersion: "To version",
      pickTwo: "Pick two different versions to see what changed.",
      pdfNoCompare:
        "One of the selected versions is a PDF without extracted text, so it can't be compared. Open the version and save its text first.",
      identical: "These versions have identical text.",
      diffAria: "Text differences between the selected versions",
    },
    form: {
      name: "Name",
      namePlaceholder: "e.g. Backend Engineer resume",
      pasteTab: "Paste text",
      uploadTab: "Upload PDF",
      resumeText: "Resume text",
      textPlaceholder: "Paste your full resume text…",
      pdfFile: "PDF file",
      submit: "Save resume",
      saving: "Saving…",
    },
    editor: {
      saveNewVersion: "Save as new version",
      editToSave: "Make an edit to save a new version.",
      rename: "Rename",
      save: "Save",
    },
    deleteButton: "Delete resume",
    deleteConfirm: "Delete this resume and all versions? Past analyses are kept.",
  },
  billing: {
    title: "Billing",
    subscription: "Subscription",
    usage: "Usage",
    usageLabel: "Analyses this month",
    usageHint: "Limits reset on the 1st of each month (UTC). Re-scores count as analyses.",
    planLine: (name: string, n: number) => `plan (${n} analyses/month).`,
    youAreOn: "You're on the",
    checkoutSuccess: "Welcome to Pro! Your new limit is available immediately.",
    checkoutCanceled: "Checkout canceled — no charge was made.",
    paymentWarning:
      "Your last payment failed. Update your payment method to keep Pro — we'll retry automatically for a few days.",
    planNames: { free: "Free", pro: "Pro" },
    planFeatures: {
      free: [
        "3 analyses per month",
        "Fit score & skills-gap analysis",
        "ATS keyword coverage",
        "Tailored summary & cover letter",
        "Resume library with versions",
      ],
      pro: [
        "50 analyses per month",
        "Everything in Free",
        "Re-score as often as you edit",
        "PDF & DOCX exports",
        "Priority support",
      ],
    },
    perMonth: "/month",
    currentPlan: "Current plan",
    mostPopular: "Most popular",
    comingSoonBadge: "Coming soon",
    comingSoonAction: "Pro — Coming soon",
    proUnavailable:
      "Pro subscriptions are not available yet. The Free plan remains fully usable.",
    upgradeCta: (price: number) => `Upgrade to Pro — $${price}/mo`,
    manage: "Manage subscription",
    cancelAnytime: "Cancel anytime from the billing portal below.",
    quotaUpgradeBody: (n: number) =>
      `Pro gives you ${n} analyses a month — enough to tailor and re-score every application in a serious search.`,
    quotaResetNote: "Your limit resets on the 1st of next month (UTC).",
    stripeFooter:
      "Payments are processed by Stripe. Invoices, payment methods, and cancellation are handled in the Stripe billing portal.",
    status: {
      active: "Active",
      trialing: "Trialing",
      cancelScheduled: "Cancellation scheduled",
      pastDue: "Payment past due",
      canceled: "Canceled",
      freePlan: "Free plan",
      renewsOn: (date: string) => `Renews on ${date}.`,
      pastDueDetailWithDate: (date: string) =>
        `Pro access continues while we retry — update your payment method to keep it past ${date}.`,
      pastDueDetail: "Pro access continues while we retry your payment.",
      cancelDetailWithDate: (date: string) =>
        `Pro access ends on ${date}. You can resume anytime before then.`,
      cancelDetail: "Pro access ends at the close of the paid period.",
    },
    redirecting: "Redirecting…",
    genericActionError: "Something went wrong. Try again.",
    unreachable: "Could not reach the server. Try again.",
  },
  errors: {
    notAuthenticated: "Not authenticated",
    invalidRequest: "Check the form fields and try again.",
    analysisNotFound: "Analysis not found",
    quotaFree: (limit: number, proLimit: number) =>
      `You've used all ${limit} free analyses this month. Upgrade to Pro for ${proLimit}/month.`,
    quotaPro: (limit: number) =>
      `You've used all ${limit} Pro analyses this month. Your limit resets on the 1st.`,
    rateLimited: "Rate limit reached — try again in an hour.",
    savedResumeNotFound: "That saved resume wasn't found.",
    invalidResumeFile: "Invalid resume file",
    resumeUnreadable: "Could not read the uploaded resume",
    invalidPdf: "The uploaded file isn't a valid PDF. Re-upload your resume.",
    refused:
      "We couldn't analyze this content. Check that the job description and resume are standard application materials.",
    aiBusy: "The AI service is busy — try again in a minute.",
    aiError: "The AI service returned an error. Try again shortly.",
    aiUnreachable: "Could not reach the AI service. Try again.",
    generic: "Something went wrong. Try again.",
    saveFailed: "Analysis succeeded but could not be saved. Try again.",
    originalResumeUnavailable: "The original resume isn't available for this analysis.",
    apply: {
      invalidRef: "Invalid suggestion reference.",
      notOnAnalysis: "That suggestion doesn't belong to this analysis.",
      cantAutoApply:
        "This suggestion can't be applied automatically. Copy the improved text and edit your resume instead.",
      noSavedResume:
        "This analysis isn't linked to a saved resume. Save your resume to the library and re-run the analysis to apply suggestions automatically.",
      resumeGone: "The saved resume linked to this analysis no longer exists.",
      noText:
        "This resume version is a PDF without editable text. Open the resume and save its text first, then apply the suggestion.",
      integrityFailed:
        "This suggestion didn't pass the factual-accuracy check, so it can't be applied automatically. Review it and edit your resume manually.",
      textNotFound:
        "Your resume has changed since this analysis, so the original text couldn't be found. Review your resume and make the change manually.",
      multipleMatches:
        "That text appears more than once in your resume, so it can't be replaced automatically. Review your resume and make the change manually.",
      createFailed: "Could not create the new resume version. Try again.",
    },
    billing: {
      alreadyPro: "You are already on the Pro plan.",
      checkoutFailed: "Could not start checkout. Try again.",
      portalFailed: "Could not open the billing portal. Try again.",
      noBillingAccount: "No billing account yet — upgrade to Pro first.",
    },
    resumeActions: {
      contentMin: "Paste your full resume (at least 100 characters)",
      contentMax: "Resume is too long (max 50,000 characters)",
      nameRequired: "Give the resume a name",
      saveFailed: "Could not save the resume. Try again.",
    },
    import: {
      rateLimited:
        "Import limit reached — try again in an hour, or paste the description.",
      unexpected:
        "Import failed unexpectedly. Paste the description manually instead.",
      enterUrl: "Enter a job posting URL",
      kinds: {
        invalid_url: "That doesn't look like a valid job posting URL.",
        linkedin:
          "LinkedIn postings can't be imported — copy the posting text and paste it instead.",
        unsupported:
          "This page couldn't be read as a job posting. Paste the description instead.",
        blocked:
          "This site requires sign-in or blocks automated access. Paste the description instead.",
        not_found: "No job posting was found at that URL.",
        fetch_failed: "The page couldn't be fetched. Check the URL or paste the description.",
      },
    },
  },
};

export type Messages = typeof en;
