import { getLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n";

export const metadata = { title: "Privacy Policy" };

// NOTE: template language — have counsel review before relying on it.
// The Turkish text is a product translation of the same template and
// should get the same legal review before being relied on.

interface LegalContent {
  title: string;
  updated: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
}

const content: Record<Locale, LegalContent> = {
  en: {
    title: "Privacy Policy",
    updated: "Last updated: July 15, 2026",
    intro:
      "ApplyPilot AI helps you tailor job applications. That means you trust us with your resume — the short version of our policy is: it stays yours, it's used only to run your analyses, and you can delete it whenever you want.",
    sections: [
      {
        heading: "What we collect",
        body: [
          "Account data: your email address and name, used to create and secure your account.",
          "Content you provide: resumes (text or PDF), job descriptions, and the analyses generated from them. This is the product's core data and it belongs to you.",
          "Billing data: subscription status and a customer reference handled by Stripe. We never see or store your card number.",
          "Operational data: standard server logs and, where enabled, privacy-respecting product analytics and error reports used to keep the service working.",
        ],
      },
      {
        heading: "How your resume is used",
        body: [
          "Your resume and the job description are sent to our AI provider (Google Gemini) solely to generate your analysis, under terms that prohibit using the data to train their models.",
          "We do not sell your data. We do not use your resume to train AI models. We do not share it with employers or recruiters.",
          "Resumes and analyses are stored in your private account, isolated by database row-level security; uploaded PDFs live in private storage scoped to your user ID.",
        ],
      },
      {
        heading: "Retention and deletion",
        body: [
          "Your data is retained while your account is active so your history and score progress keep working.",
          "You can delete any resume, resume version (via resume deletion), or analysis at any time from the dashboard — associated files are removed from storage.",
          "To delete your entire account and all associated data, contact us at the address below and we'll complete the deletion within 30 days.",
        ],
      },
      {
        heading: "Processors we rely on",
        body: [
          "Supabase (authentication, database, file storage), Google (AI analysis), Stripe (payments), and Vercel (hosting). Each processes data only as needed to provide their function.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "Depending on where you live (including under GDPR and CCPA), you may have rights to access, correct, export, or delete your personal data, and to object to certain processing. Contact us to exercise any of these rights.",
        ],
      },
      {
        heading: "Contact",
        body: [
          "Privacy questions and requests: privacy@applypilot.ai. We'll respond within 30 days.",
        ],
      },
    ],
  },
  tr: {
    title: "Gizlilik Politikası",
    updated: "Son güncelleme: 15 Temmuz 2026",
    intro:
      "ApplyPilot AI, iş başvurularınızı uyarlamanıza yardımcı olur. Bu, CV'nizi bize emanet ettiğiniz anlamına gelir — politikamızın özeti şu: CV'niz sizin kalır, yalnızca analizlerinizi çalıştırmak için kullanılır ve istediğiniz an silebilirsiniz.",
    sections: [
      {
        heading: "Neleri topluyoruz",
        body: [
          "Hesap verileri: hesabınızı oluşturmak ve korumak için kullanılan e-posta adresiniz ve adınız.",
          "Sağladığınız içerik: CV'ler (metin veya PDF), ilan metinleri ve bunlardan üretilen analizler. Bu, ürünün temel verisidir ve size aittir.",
          "Ödeme verileri: abonelik durumu ve Stripe tarafından yönetilen bir müşteri referansı. Kart numaranızı hiçbir zaman görmeyiz ve saklamayız.",
          "Operasyonel veriler: standart sunucu günlükleri ve etkinleştirildiğinde, hizmeti ayakta tutmak için kullanılan gizliliğe saygılı ürün analitiği ve hata raporları.",
        ],
      },
      {
        heading: "CV'niz nasıl kullanılır",
        body: [
          "CV'niz ve ilan metni, yalnızca analizinizi üretmek için, verilerin model eğitiminde kullanılmasını yasaklayan koşullar altında yapay zekâ sağlayıcımıza (Google Gemini) gönderilir.",
          "Verilerinizi satmayız. CV'nizi yapay zekâ modellerini eğitmek için kullanmayız. İşverenlerle veya işe alım uzmanlarıyla paylaşmayız.",
          "CV'ler ve analizler, satır düzeyinde güvenlikle izole edilmiş özel hesabınızda saklanır; yüklenen PDF'ler kullanıcı kimliğinize özel gizli depolamada durur.",
        ],
      },
      {
        heading: "Saklama ve silme",
        body: [
          "Verileriniz, geçmişinizin ve puan ilerlemenizin çalışmaya devam etmesi için hesabınız etkin olduğu sürece saklanır.",
          "Herhangi bir CV'yi, CV sürümünü (CV silme yoluyla) veya analizi istediğiniz an panelden silebilirsiniz — ilişkili dosyalar depolamadan kaldırılır.",
          "Hesabınızın tamamını ve tüm ilişkili verileri silmek için aşağıdaki adresten bize ulaşın; silme işlemini 30 gün içinde tamamlarız.",
        ],
      },
      {
        heading: "Çalıştığımız veri işleyiciler",
        body: [
          "Supabase (kimlik doğrulama, veritabanı, dosya depolama), Google (yapay zekâ analizi), Stripe (ödemeler) ve Vercel (barındırma). Her biri veriyi yalnızca kendi işlevini sağlamak için gerektiği kadar işler.",
        ],
      },
      {
        heading: "Haklarınız",
        body: [
          "Yaşadığınız yere bağlı olarak (GDPR ve CCPA dahil), kişisel verilerinize erişme, düzeltme, dışa aktarma veya silme ve belirli işleme faaliyetlerine itiraz etme haklarına sahip olabilirsiniz. Bu hakları kullanmak için bize ulaşın.",
        ],
      },
      {
        heading: "İletişim",
        body: [
          "Gizlilik soruları ve talepleri: privacy@applypilot.ai. 30 gün içinde yanıt veririz.",
        ],
      },
    ],
  },
};

export default async function PrivacyPage() {
  const t = content[await getLocale()];
  return (
    <article>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {t.title}
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t.updated}</p>
      <p className="mt-6 leading-7 text-slate-700 dark:text-slate-300">{t.intro}</p>
      {t.sections.map((s) => (
        <section key={s.heading} className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {s.heading}
          </h2>
          <ul className="mt-3 space-y-2">
            {s.body.map((line) => (
              <li
                key={line}
                className="text-sm leading-6 text-slate-700 dark:text-slate-300"
              >
                {line}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
