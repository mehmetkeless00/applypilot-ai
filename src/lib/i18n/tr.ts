import type { Messages } from "./en";

// Turkish catalog. Natural product Turkish, not literal translation.
// Factual content (CV text, job descriptions, company names, technologies,
// dates) is user data and never passes through this file.

export const tr: Messages = {
  common: {
    language: "Dil",
    cancel: "Vazgeç",
    close: "Kapat",
    delete: "Sil",
    signOut: "Çıkış yap",
    backToHome: "← Ana sayfaya dön",
    errorTitle: "Bir şeyler ters gitti",
    errorBody: "Bu sayfa yüklenirken beklenmedik bir hata oluştu.",
    tryAgain: "Tekrar dene",
  },
  nav: {
    myAnalyses: "Analizlerim",
    newAnalysis: "Yeni analiz",
    resumes: "CV'ler",
    billing: "Abonelik",
    usageTitle: "Bu ay kullanılan analizler",
    usageThisMonth: (used, limit) => `Bu ay ${used}/${limit}`,
  },
  landing: {
    pricing: "Fiyatlandırma",
    signIn: "Giriş yap",
    getStarted: "Hemen başla",
    heroLead: "Uyumunuzu",
    heroAccent: "başvurmadan önce",
    heroTail: "öğrenin",
    heroSubtitle:
      "ApplyPilot, CV'nizi ilanın gerçek gereksinimleriyle puanlar, tam olarak neyi düzeltmeniz gerektiğini gösterir ve işe yaradığını kanıtlar — siz düzelttikçe puanınız yükselir. Dürüst analiz, uydurma deneyim yok.",
    heroCta: "İlk başvurunuzu analiz edin — ücretsiz",
    heroNote: "Ayda 3 ücretsiz analiz. Kredi kartı gerekmez.",
    howItWorks: "Nasıl çalışır?",
    steps: [
      {
        title: "İlanı ekleyin",
        description:
          "İlan metnini yapıştırın veya doğrudan ilan bağlantısından içe aktarın — Greenhouse, Lever, Ashby, Workable ve birçok şirket kariyer sayfası desteklenir.",
      },
      {
        title: "CV'nizi bir kez ekleyin",
        description:
          "Yapıştırın veya PDF yükleyin. CV'niz sürümleriyle birlikte kitaplığınıza kaydedilir; bir daha yapıştırmanız gerekmez.",
      },
      {
        title: "Düzeltin, yeniden puanlayın, başvurun",
        description:
          "Kalibre edilmiş bir uyum puanı, önemli eksikler, somut yeniden yazımlar ve hazır bir ön yazı alın. Düzenleyin, yeniden puanlayın ve puanın yükselişini izleyin.",
      },
    ],
    featuresTitle: "Güvenle başvurmak için ihtiyacınız olan her şey",
    features: [
      {
        title: "Kalibre edilmiş uyum puanı",
        description:
          "İlanın gerçek olmazsa olmazlarına dayanan 0–100 arası bir puan — anahtar kelime saymak değil, sizi pohpohlamak için şişirilmiş de değil.",
      },
      {
        title: "Kanıt var, uydurma yok",
        description:
          "Her güçlü yön, kendi CV'nizden bir satırla desteklenir. Asla deneyim uydurmayız — işe alımcılar bunu anlar.",
      },
      {
        title: "ATS anahtar kelime kapsamı",
        description:
          "Hangi tarama kelimelerini karşıladığınızı, hangilerinin zayıf, hangilerinin eksik olduğunu ve her biri için çözümü görün.",
      },
      {
        title: "Somut yeniden yazımlar",
        description:
          "En zayıf CV bölümleriniz için ilanın diliyle uyumlu önce/sonra yazımları. Kopyalayın, uygulayın, yeniden puanlayın.",
      },
      {
        title: "Saniyeler içinde ön yazı",
        description:
          "Gerçek deneyiminize dayanan, göndermeye hazır eksiksiz bir mektup — tonunu düzenleyin, özünü koruyun.",
      },
      {
        title: "Ölçebileceğiniz ilerleme",
        description:
          "Her düzenlemeden sonra yeniden puanlayın ve farkı görün. Panonuz her başvuruyu ve her gelişmeyi takip eder.",
      },
    ],
    pricingTitle: "Sade fiyatlandırma",
    pricingSubtitle:
      "Ücretsiz başlayın. Aramanız ciddileşince yükseltin. İstediğiniz an iptal edin.",
    pricingSubtitleComingSoon:
      "Ücretsiz başlayın — ayda 3 analiz, kredi kartı gerekmez.",
    startFree: "Ücretsiz başla",
    getPro: "Pro'ya geç",
    trustTitle: "CV'niz size aittir",
    trust: [
      {
        title: "Varsayılan olarak gizli",
        description:
          "Satır düzeyinde güvenlik verilerinizi izole eder; CV'ler yalnızca sizin erişebildiğiniz özel depolamada durur.",
      },
      {
        title: "Satılmaz, modele öğretilmez",
        description:
          "CV'niz yalnızca analizlerinizi çalıştırmak için kullanılır. Verilerinizi satmayız, yapay zekâ eğitiminde kullanmayız.",
      },
      {
        title: "İstediğiniz an silin",
        description:
          "Herhangi bir CV'yi veya analizi tek tıkla kaldırın — dosyalar dahil.",
      },
    ],
    faqTitle: "Sık sorulan sorular",
    faqs: [
      {
        q: "Uyum puanı sadece anahtar kelime eşleştirmesi mi?",
        a: "Hayır. Puan, ilandaki açık olmazsa olmaz nitelikleri CV'nizin gerçekten gösterdikleriyle karşılaştırır. Anahtar kelime kapsamı ayrıca raporlanır; çünkü ATS taraması ile insan değerlendirmesi farklı problemlerdir.",
      },
      {
        q: "Sahip olmadığım deneyimleri uydurur mu?",
        a: "Asla. Analiz, her iddiayı CV'nize dayandırmakla yükümlüdür ve öneriler yalnızca gerçekten var olanı yeniden ifade eder. Uydurma CV'ler mülakatta çöker — biz öylesini yazmayız.",
      },
      {
        q: "CV'me ne oluyor?",
        a: "Özel hesabınızda şifreli olarak saklanır, yalnızca analiz için yapay zekâ sağlayıcımıza gönderilir; asla satılmaz veya model eğitiminde kullanılmaz. CV ve analizlerinizi istediğiniz an silebilirsiniz.",
      },
      {
        q: "Hangi iş ilanı sitelerinden içe aktarabilirim?",
        a: "Greenhouse, Lever, Ashby ve Workable tam desteklidir; çoğu şirket kariyer sayfası da yapılandırılmış veriyle içe aktarılır. LinkedIn ilanları için hızlı bir kopyala-yapıştır yeterlidir.",
      },
      {
        q: "Pro'yu istediğim zaman iptal edebilir miyim?",
        a: "Evet — Stripe abonelik portalında tek tık. Ödediğiniz dönemin sonuna kadar Pro sizde kalır.",
      },
    ],
    finalCtaTitle: "Bir sonraki başvurunuz tahminden fazlasını hak ediyor",
    finalCta: "Uyum puanınızı alın — ücretsiz",
    footerPrivacy: "Gizlilik",
    footerTerms: "Koşullar",
  },
  auth: {
    welcomeBack: "Tekrar hoş geldiniz",
    createAccount: "Hesabınızı oluşturun",
    signInSubtitle: "ApplyPilot AI hesabınıza giriş yapın",
    signUpSubtitle: "Başvurularınızı yapay zekâ ile güçlendirmeye başlayın",
    checkEmail: "Hesabınızı doğrulamak için e-postanızı kontrol edin, sonra giriş yapın.",
    continueWithGoogle: "Google ile devam et",
    googleUnavailable: "Google ile giriş şu an kullanılamıyor. E-posta ile deneyin.",
    orWithEmail: "veya e-posta ile",
    fullName: "Ad soyad",
    email: "E-posta",
    password: "Şifre",
    forgotPassword: "Şifrenizi mi unuttunuz?",
    signIn: "Giriş yap",
    signUp: "Kayıt ol",
    agreeStart: "Kaydolarak şunları kabul etmiş olursunuz:",
    terms: "Kullanım Koşulları",
    and: "ve",
    privacyPolicy: "Gizlilik Politikası",
    noAccount: "Hesabınız yok mu?",
    haveAccount: "Zaten hesabınız var mı?",
    forgotTitle: "Şifrenizi sıfırlayın",
    forgotSubtitle: "Hesap e-postanızı girin, size sıfırlama bağlantısı gönderelim.",
    forgotSent: "Bu e-postaya ait bir hesap varsa, sıfırlama bağlantısı yolda.",
    forgotSubmit: "Sıfırlama bağlantısı gönder",
    backToSignIn: "← Girişe dön",
    resetTitle: "Yeni bir şifre belirleyin",
    resetSubmit: "Şifreyi güncelle",
    newPassword: "Yeni şifre",
    errors: {
      invalidEmail: "Geçerli bir e-posta adresi girin",
      passwordMin: "Şifre en az 8 karakter olmalı",
      enterName: "Adınızı girin",
      invalidCredentials: "E-posta veya şifre hatalı",
      disposableEmail:
        "Tek kullanımlık e-posta adresleri desteklenmiyor — normal e-postanızı kullanın.",
      resetExpired:
        "Bu sıfırlama bağlantısının süresi doldu. Giriş sayfasından yenisini isteyin.",
    },
  },
  onboarding: {
    title: "İlk uyum raporunuzu alın",
    subtitle:
      "Bir ilana ne kadar uygun olduğunuzu ve başvurmadan önce tam olarak neyi düzeltmeniz gerektiğini görmek için üç kısa adım.",
    completed: "(tamamlandı)",
    stepResumeTitle: "CV'nizi ekleyin",
    stepResumeDescription:
      "PDF yükleyin veya metni bir kez yapıştırın. CV'niz sürümleriyle kitaplığınıza kaydedilir; bir daha yapıştırmanız gerekmez.",
    stepResumeCta: "CV'nizi ekleyin",
    stepJobTitle: "Bir ilan ekleyin",
    stepJobDescription:
      "İlan metnini yapıştırın veya doğrudan ilan bağlantısından içe aktarın.",
    stepJobCta: "İlan analiz et",
    stepReportTitle: "Uyum raporunuzu inceleyin",
    stepReportDescription:
      "Kalibre edilmiş uyum puanı, önemli yetkinlik eksikleri, somut CV yeniden yazımları ve göndermeye hazır bir ön yazı alın.",
  },
  dashboard: {
    title: "Analizlerim",
    stats: {
      analyses: "Analiz",
      averageFit: "Ortalama uyum",
      bestFit: "En iyi uyum",
      rescores: "Yeniden puanlama",
    },
    fit: { strong: "Güçlü uyum", fair: "Orta uyum", poor: "Zayıf uyum" },
    companyUnknown: "Şirket belirtilmemiş",
  },
  analysis: {
    back: "← Tüm analizler",
    fitAssessment: "Uyum değerlendirmesi",
    scoreAria: (score) => `Uyum puanı: 100 üzerinden ${score}`,
    rescore: "Yeniden puanla",
    rescoring: "Yeniden puanlanıyor…",
    rescoreUsesSaved: "Kayıtlı CV'nizin en son sürümü kullanılır.",
    rescoreUsesSame: "Aynı CV ile yeniden çalıştırılır.",
    rescoreFailed: "Yeniden puanlama başarısız. Tekrar deneyin.",
    upgrade: "Yükselt",
    deleteConfirm: "Bu analiz silinsin mi? Bu işlem geri alınamaz.",
    exportPdf: "PDF indir",
    exportDocx: "DOCX indir",
    downloadFullReport: "Tam raporu indir (PDF)",
    strengthsTitle: "Bu rol için güçlü yönleriniz",
    strengthsEmpty: "CV'niz ile bu rol arasında belirgin bir eşleşme bulunamadı.",
    missingSkillsTitle: "Eksik yetkinlikler",
    missingSkillsEmpty:
      "Önemli bir eksik bulunamadı — CV'niz bu rolün gereksinimlerini iyi karşılıyor.",
    importance: { critical: "Kritik", important: "Önemli", nice_to_have: "Artı değer" },
    atsTitle: "ATS anahtar kelime kapsamı",
    atsStatus: { matched: "Eşleşti", weak: "Zayıf", missing: "Eksik" },
    atsCounts: {
      matched: (n) => `${n} eşleşti`,
      weak: (n) => `${n} zayıf`,
      missing: (n) => `${n} eksik`,
    },
    atsImportance: { required: "Zorunlu", preferred: "Tercih edilen", nice_to_have: "Artı değer" },
    summaryTitle: "Kişiselleştirilmiş profesyonel özet",
    coverLetterTitle: "Ön yazı",
    copy: "Kopyala",
    copied: "Kopyalandı!",
    download: "İndir",
    comparison: {
      title: "Önceki çalıştırmayla karşılaştırma",
      improvedBy: (n) => `Puan ${n} puan yükseldi`,
      decreasedBy: (n) => `Puan ${n} puan düştü`,
      noChange: "Puan değişmedi",
      previous: "Önceki",
      thisRun: "Bu çalıştırma",
      resumeVersion: (v) => `CV s${v}`,
      sameResume: "aynı CV",
      viewPrevious: "Önceki sonucu görüntüle",
      atsLabel: "ATS anahtar kelimeleri:",
      atsMatched: "eşleşen",
      atsWeak: "zayıf",
      atsMissing: "eksik",
      nowMatched: "Artık eşleşiyor:",
      regressed: "Artık eşleşmiyor:",
      more: (n) => `+${n} daha`,
      disclaimer:
        "Puanlar bu ilan metniyle uyumu ölçer. Daha yüksek puan, anahtar kelime ve gereksinim eşleşmesinin daha güçlü olduğu anlamına gelir — mülakat veya teklif garantisi vermez.",
    },
    suggestions: {
      title: "CV İyileştirme Önerileri",
      applyHint:
        "Önerileri tek tıkla uygulamak için analizleri kayıtlı bir CV ile çalıştırın — şimdilik iyileştirilmiş metni CV'nize elle kopyalayın.",
      impact: { high: "Yüksek etki", medium: "Orta etki", low: "Düşük etki" },
      current: "Mevcut",
      improved: "İyileştirilmiş",
      copyImproved: "İyileştirilmiş metni kopyala",
      apply: "CV'ye uygula",
      previewTitle: "Değişikliği önizle",
      before: "Önce",
      after: "Sonra",
      warning:
        "Yalnızca yukarıda gösterilen metin değişecek. CV'nizin geri kalanı olduğu gibi kalır ve mevcut sürümünüz korunur.",
      confirm: "Yeni sürüm oluştur",
      confirmBusy: "Sürüm oluşturuluyor…",
      confirmAria: "Bu değişiklikle yeni bir CV sürümü oluştur",
      appliedTitle: "Öneri uygulandı",
      appliedBody: (v) => `CV sürümü ${v} oluşturuldu. Önceki sürümleriniz değişmedi.`,
      appliedStatus: (v) => `Öneri uygulandı. CV sürümü ${v} oluşturuldu.`,
      rescoreWith: (v) => `Sürüm ${v} ile yeniden puanla`,
      viewResume: "CV'yi görüntüle",
      usesQuota: "Yeniden puanlama, aylık limitinizden 1 analiz kullanır.",
      versionKept: "Yeni CV sürümünüz her durumda kayıtlı.",
      reviewResume: "CV'nizi gözden geçirin",
    },
  },
  newAnalysis: {
    title: "Yeni analiz",
    subtitle:
      "İlan metnini ve CV'nizi yapıştırın. Uyum puanı, yetkinlik eksiği analizi, kişiselleştirilmiş özet ve ön yazı alacaksınız.",
    jobTitle: "Pozisyon",
    jobTitlePlaceholder: "Kıdemli Frontend Mühendisi",
    company: "Şirket (isteğe bağlı)",
    companyPlaceholder: "Acme A.Ş.",
    jobDescription: "İlan metni",
    tabPasteJob: "İlan metnini yapıştır",
    tabImport: "URL'den içe aktar",
    importUrlLabel: "İlan bağlantısı",
    importHint:
      "Greenhouse, Lever, Ashby ve Workable ile en iyi sonucu verir; başka birçok ilan sayfası da çalışır ama hepsi değil. LinkedIn için ilan metnini kopyalayıp Yapıştır sekmesini kullanın.",
    importing: "İçe aktarılıyor…",
    importButton: "İlanı içe aktar",
    importedFrom: (url) => `${url} adresinden aktarıldı — aşağıda inceleyip düzenleyin.`,
    jobDescriptionPlaceholder: "İlan metninin tamamını buraya yapıştırın…",
    yourResume: "CV'niz",
    tabSaved: "Kayıtlı CV",
    tabPaste: "Metin yapıştır",
    tabUpload: "PDF yükle",
    savedResumeHint: "Bu CV'nin en son sürümü kullanılacak.",
    resumePlaceholder: "CV metninizi buraya yapıştırın…",
    choosePdf: "Bir PDF CV seçin",
    pdfLimits: "Yalnızca PDF, en fazla 10 MB",
    privacyNote:
      "CV'niz gizlidir: yalnızca analizleriniz için kullanılır, asla satılmaz veya model eğitiminde kullanılmaz.",
    saveToLibrary: "Tekrar kullanmak için CV'lerime kaydet",
    resumeName: "CV adı",
    resumeNamePlaceholder: "örn. Backend Mühendisi CV'si",
    outputLanguage: "Analiz dili",
    outputLanguageHint: "Rapor ve ön yazı bu dilde yazılır.",
    languageNames: { en: "English", tr: "Türkçe" },
    submit: "Başvuruyu analiz et",
    submitting: "Analiz ediliyor…",
    progressNote: "Analiz sürüyor — genellikle bir dakikadan kısa sürer.",
    errors: {
      chooseSaved: "Kayıtlı bir CV seçin veya CV metninizi yapıştırın.",
      choosePdfFile: "Yüklemek için bir PDF CV seçin.",
      mustBePdf: "CV bir PDF dosyası olmalı.",
      pdfTooLarge: "PDF çok büyük (en fazla 10 MB).",
      sessionExpired: "Oturumunuzun süresi doldu — yeniden giriş yapın.",
      uploadFailed: "PDF yüklenemedi. Tekrar deneyin.",
      analysisFailed: "Analiz başarısız oldu. Tekrar deneyin.",
      importFailed: "İçe aktarma başarısız. Metni elle yapıştırmayı deneyin.",
      generic: "Bir şeyler ters gitti.",
    },
  },
  resumes: {
    title: "CV'lerim",
    subtitle:
      "CV'nizi bir kez kaydedin, tüm analizlerde yeniden kullanın. Her düzenleme bir sürüm olarak saklanır; puanlarınızı neyin iyileştirdiğini takip edebilirsiniz.",
    emptyTitle: "Henüz CV yok",
    emptyDescription:
      "Kayıtlı CV'ler sürümlüdür — her düzenleme, yeniden puanlayabileceğiniz yeni bir sürüm olur; böylece uyumunuzun gelişimini izlersiniz.",
    emptyCta: "İlk CV'nizi ekleyin",
    versions: (n) => `${n} sürüm`,
    updatedOn: (date) => `Güncelleme: ${date}`,
    addFirst: "İlk CV'nizi ekleyin",
    addAnother: "Başka bir CV ekleyin",
    sources: { pdf: "PDF yükleme", paste: "Elle düzenleme", applied_suggestion: "Uygulanan öneri" },
    detail: {
      allResumes: "← Tüm CV'ler",
      meta: (versions, date) => `${versions} · güncelleme ${date}`,
      currentVersion: "Güncel sürüm",
      pdfTag: "PDF",
      editHint: (next) =>
        `Düzenleyip kaydedince sürüm ${next} oluşturulur. Eski sürümler saklanır; geçmiş analizler izlenebilir kalır.`,
      pdfExtracted:
        "Yüklediğiniz PDF'ten metni çıkardık — aşağıda inceleyin ve düzenlenebilir bir sürüm oluşturmak için kaydedin. Orijinal PDF olduğu gibi saklanır.",
      pdfNoText:
        "Bu PDF'ten metin çıkarılamadı (taranmış veya görüntü tabanlı olabilir). Düzenlenebilir hale getirmek için CV metninizi aşağıya yapıştırın — o zamana kadar analizler orijinal PDF'i kullanmaya devam eder.",
      scoreHistory: "Puan geçmişi",
      scoreHistoryHint: "Bu CV'yi kullanan analizler, en yenisi başta.",
      scoreHistoryEmptyPrefix: "Henüz puan yok — sonuçlar burada,",
      scoreHistoryEmptyLink: "bir ilan analiz ettiğinizde",
      scoreHistoryEmptySuffix: "veya bu CV ile yeniden puanladığınızda görünür.",
      versionHistory: "Sürüm geçmişi",
      viewAnalysis: "Analizi görüntüle",
      compareTitle: "Sürümleri karşılaştır",
      compareHint: "İki sürüm arasında tam olarak neyin değiştiğini görün.",
      fromVersion: "Kaynak sürüm",
      toVersion: "Hedef sürüm",
      pickTwo: "Neyin değiştiğini görmek için iki farklı sürüm seçin.",
      pdfNoCompare:
        "Seçilen sürümlerden biri, metni çıkarılmamış bir PDF olduğu için karşılaştırılamıyor. Önce sürümü açıp metnini kaydedin.",
      identical: "Bu sürümlerin metni birebir aynı.",
      diffAria: "Seçilen sürümler arasındaki metin farkları",
    },
    form: {
      name: "Ad",
      namePlaceholder: "örn. Backend Mühendisi CV'si",
      pasteTab: "Metin yapıştır",
      uploadTab: "PDF yükle",
      resumeText: "CV metni",
      textPlaceholder: "CV metninizin tamamını yapıştırın…",
      pdfFile: "PDF dosyası",
      submit: "CV'yi kaydet",
      saving: "Kaydediliyor…",
    },
    editor: {
      saveNewVersion: "Yeni sürüm olarak kaydet",
      editToSave: "Yeni bir sürüm kaydetmek için bir değişiklik yapın.",
      rename: "Yeniden adlandır",
      save: "Kaydet",
    },
    deleteButton: "CV'yi sil",
    deleteConfirm: "Bu CV ve tüm sürümleri silinsin mi? Geçmiş analizler korunur.",
  },
  billing: {
    title: "Abonelik",
    subscription: "Abonelik",
    usage: "Kullanım",
    usageLabel: "Bu ayki analizler",
    usageHint:
      "Limitler her ayın 1'inde sıfırlanır (UTC). Yeniden puanlamalar analiz sayılır.",
    planLine: (_name, n) => `planındasınız (ayda ${n} analiz).`,
    youAreOn: "Şu anda",
    checkoutSuccess: "Pro'ya hoş geldiniz! Yeni limitiniz hemen kullanılabilir.",
    checkoutCanceled: "Ödeme iptal edildi — herhangi bir ücret alınmadı.",
    paymentWarning:
      "Son ödemeniz başarısız oldu. Pro'yu korumak için ödeme yönteminizi güncelleyin — birkaç gün boyunca otomatik olarak yeniden deneyeceğiz.",
    planNames: { free: "Ücretsiz", pro: "Pro" },
    planFeatures: {
      free: [
        "Ayda 3 analiz",
        "Uyum puanı ve yetkinlik eksiği analizi",
        "ATS anahtar kelime kapsamı",
        "Kişiselleştirilmiş özet ve ön yazı",
        "Sürümlü CV kitaplığı",
      ],
      pro: [
        "Ayda 50 analiz",
        "Ücretsiz plandaki her şey",
        "Her düzenlemede yeniden puanlama",
        "PDF ve DOCX dışa aktarma",
        "Öncelikli destek",
      ],
    },
    perMonth: "/ay",
    currentPlan: "Mevcut plan",
    mostPopular: "En popüler",
    comingSoonBadge: "Yakında",
    comingSoonAction: "Pro — Yakında",
    proUnavailable:
      "Pro abonelikler henüz kullanıma açık değil. Ücretsiz plan tüm özellikleriyle kullanılabilir.",
    upgradeCta: (price) => `Pro'ya yükselt — $${price}/ay`,
    manage: "Aboneliği yönet",
    cancelAnytime: "Aşağıdaki abonelik portalından istediğiniz an iptal edebilirsiniz.",
    quotaUpgradeBody: (n) =>
      `Pro size ayda ${n} analiz verir — ciddi bir iş aramasındaki her başvuruyu uyarlamaya ve yeniden puanlamaya yeter.`,
    quotaResetNote: "Limitiniz gelecek ayın 1'inde sıfırlanır (UTC).",
    stripeFooter:
      "Ödemeler Stripe tarafından işlenir. Faturalar, ödeme yöntemleri ve iptal işlemleri Stripe abonelik portalında yönetilir.",
    status: {
      active: "Etkin",
      trialing: "Deneme süresinde",
      cancelScheduled: "İptal planlandı",
      pastDue: "Ödeme gecikti",
      canceled: "İptal edildi",
      freePlan: "Ücretsiz plan",
      renewsOn: (date) => `${date} tarihinde yenilenir.`,
      pastDueDetailWithDate: (date) =>
        `Ödemenizi yeniden denerken Pro erişiminiz sürüyor — ${date} sonrasında da korumak için ödeme yönteminizi güncelleyin.`,
      pastDueDetail: "Ödemenizi yeniden denerken Pro erişiminiz sürüyor.",
      cancelDetailWithDate: (date) =>
        `Pro erişimi ${date} tarihinde sona erer. Bu tarihten önce istediğiniz an devam ettirebilirsiniz.`,
      cancelDetail: "Pro erişimi, ödenen dönemin sonunda sona erer.",
    },
    redirecting: "Yönlendiriliyor…",
    genericActionError: "Bir şeyler ters gitti. Tekrar deneyin.",
    unreachable: "Sunucuya ulaşılamadı. Tekrar deneyin.",
  },
  errors: {
    notAuthenticated: "Oturum açılmamış",
    invalidRequest: "Form alanlarını kontrol edip tekrar deneyin.",
    analysisNotFound: "Analiz bulunamadı",
    quotaFree: (limit, proLimit) =>
      `Bu ayki ${limit} ücretsiz analizin tamamını kullandınız. Ayda ${proLimit} analiz için Pro'ya yükseltin.`,
    quotaPro: (limit) =>
      `Bu ayki ${limit} Pro analizin tamamını kullandınız. Limitiniz ayın 1'inde sıfırlanır.`,
    rateLimited: "Hız sınırına ulaşıldı — bir saat sonra tekrar deneyin.",
    savedResumeNotFound: "Kayıtlı CV bulunamadı.",
    invalidResumeFile: "Geçersiz CV dosyası",
    resumeUnreadable: "Yüklenen CV okunamadı",
    invalidPdf: "Yüklenen dosya geçerli bir PDF değil. CV'nizi yeniden yükleyin.",
    refused:
      "Bu içerik analiz edilemedi. İlan metninin ve CV'nin standart başvuru belgeleri olduğundan emin olun.",
    aiBusy: "Yapay zekâ servisi yoğun — bir dakika sonra tekrar deneyin.",
    aiError: "Yapay zekâ servisi hata döndürdü. Kısa süre sonra tekrar deneyin.",
    aiUnreachable: "Yapay zekâ servisine ulaşılamadı. Tekrar deneyin.",
    generic: "Bir şeyler ters gitti. Tekrar deneyin.",
    saveFailed: "Analiz tamamlandı ama kaydedilemedi. Tekrar deneyin.",
    originalResumeUnavailable: "Bu analiz için orijinal CV artık mevcut değil.",
    apply: {
      invalidRef: "Geçersiz öneri referansı.",
      notOnAnalysis: "Bu öneri bu analize ait değil.",
      cantAutoApply:
        "Bu öneri otomatik uygulanamıyor. İyileştirilmiş metni kopyalayıp CV'nizi elle düzenleyin.",
      noSavedResume:
        "Bu analiz kayıtlı bir CV'ye bağlı değil. Önerileri otomatik uygulamak için CV'nizi kitaplığa kaydedin ve analizi yeniden çalıştırın.",
      resumeGone: "Bu analize bağlı kayıtlı CV artık mevcut değil.",
      noText:
        "Bu CV sürümü, düzenlenebilir metni olmayan bir PDF. Önce CV'yi açıp metnini kaydedin, sonra öneriyi uygulayın.",
      integrityFailed:
        "Bu öneri, olgusal doğruluk kontrolünden geçemediği için otomatik uygulanamıyor. Öneriyi inceleyip CV'nizi elle düzenleyin.",
      textNotFound:
        "CV'niz bu analizden sonra değiştiği için orijinal metin bulunamadı. CV'nizi gözden geçirip değişikliği elle yapın.",
      multipleMatches:
        "Bu metin CV'nizde birden fazla yerde geçtiği için otomatik değiştirilemiyor. CV'nizi gözden geçirip değişikliği elle yapın.",
      createFailed: "Yeni CV sürümü oluşturulamadı. Tekrar deneyin.",
    },
    billing: {
      alreadyPro: "Zaten Pro plandasınız.",
      checkoutFailed: "Ödeme başlatılamadı. Tekrar deneyin.",
      portalFailed: "Abonelik portalı açılamadı. Tekrar deneyin.",
      noBillingAccount: "Henüz bir abonelik hesabınız yok — önce Pro'ya yükseltin.",
    },
    resumeActions: {
      contentMin: "CV'nizin tamamını yapıştırın (en az 100 karakter)",
      contentMax: "CV çok uzun (en fazla 50.000 karakter)",
      nameRequired: "CV'ye bir ad verin",
      saveFailed: "CV kaydedilemedi. Tekrar deneyin.",
    },
    import: {
      rateLimited:
        "İçe aktarma limitine ulaşıldı — bir saat sonra tekrar deneyin veya ilan metnini yapıştırın.",
      unexpected:
        "İçe aktarma beklenmedik şekilde başarısız oldu. İlan metnini elle yapıştırın.",
      enterUrl: "Bir ilan bağlantısı girin",
      kinds: {
        invalid_url: "Bu geçerli bir ilan bağlantısına benzemiyor.",
        linkedin:
          "LinkedIn ilanları içe aktarılamaz — ilan metnini kopyalayıp yapıştırın.",
        unsupported:
          "Bu sayfa bir iş ilanı olarak okunamadı. İlan metnini yapıştırın.",
        blocked:
          "Bu site giriş istiyor veya otomatik erişimi engelliyor. İlan metnini yapıştırın.",
        not_found: "Bu adreste bir iş ilanı bulunamadı.",
        fetch_failed:
          "Sayfa getirilemedi. Bağlantıyı kontrol edin veya ilan metnini yapıştırın.",
      },
    },
  },
};
