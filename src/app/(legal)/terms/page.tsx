import { getLocale, pageTitle } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n";

export const generateMetadata = () => pageTitle("terms");

// NOTE: template language — have counsel review before relying on it.
// The Turkish text is a product translation of the same template and
// should get the same legal review before being relied on.

interface LegalContent {
  title: string;
  updated: string;
  sections: { heading: string; body: string[] }[];
}

const content: Record<Locale, LegalContent> = {
  en: {
    title: "Terms of Service",
    updated: "Last updated: July 15, 2026",
    sections: [
      {
        heading: "The service",
        body: [
          "ApplyPilot AI analyzes your resume against job descriptions and generates fit scores, suggestions, summaries, and cover letters. Output is AI-generated guidance — review it before you send it to an employer. You are responsible for the accuracy of applications you submit.",
        ],
      },
      {
        heading: "Your account",
        body: [
          "You must provide accurate account information and keep your credentials secure. Accounts are personal; one person per account.",
          "You retain all rights to the content you upload. You grant us only the limited license needed to store and process it to provide the service.",
        ],
      },
      {
        heading: "Acceptable use",
        body: [
          "Don't abuse the service: no scraping, no automated bulk account creation, no attempting to bypass plan limits or rate limits, no using the importer to attack third-party sites, and no uploading content you don't have the right to use.",
          "We may suspend accounts that violate these rules, with notice where practical.",
        ],
      },
      {
        heading: "Plans and billing",
        body: [
          "The Free plan includes a monthly analysis allowance. Pro is a monthly subscription billed through Stripe; prices are shown before checkout.",
          "You can cancel anytime from the billing portal — Pro remains active until the end of the paid period. Renewals, failed payments, and cancellations follow Stripe's standard subscription behavior.",
        ],
      },
      {
        heading: "Disclaimers",
        body: [
          "AI analysis can be wrong. Fit scores are estimates, not hiring decisions, and we make no guarantee of interviews or offers.",
          'The service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, our liability is limited to the amount you paid us in the twelve months before a claim.',
        ],
      },
      {
        heading: "Changes and contact",
        body: [
          "We may update these terms; material changes will be announced in the product or by email before they take effect.",
          "Questions: support@applypilot.ai.",
        ],
      },
    ],
  },
  tr: {
    title: "Kullanım Koşulları",
    updated: "Son güncelleme: 15 Temmuz 2026",
    sections: [
      {
        heading: "Hizmet",
        body: [
          "ApplyPilot AI, CV'nizi ilan metinleriyle karşılaştırarak uyum puanları, öneriler, özetler ve ön yazılar üretir. Çıktılar yapay zekâ tarafından üretilen rehberliktir — bir işverene göndermeden önce gözden geçirin. Gönderdiğiniz başvuruların doğruluğundan siz sorumlusunuz.",
        ],
      },
      {
        heading: "Hesabınız",
        body: [
          "Doğru hesap bilgileri sağlamalı ve giriş bilgilerinizi güvende tutmalısınız. Hesaplar kişiseldir; her hesap tek kişiye aittir.",
          "Yüklediğiniz içeriğin tüm hakları sizde kalır. Bize yalnızca hizmeti sağlamak için içeriği saklamak ve işlemek amacıyla gereken sınırlı lisansı verirsiniz.",
        ],
      },
      {
        heading: "Kabul edilebilir kullanım",
        body: [
          "Hizmeti kötüye kullanmayın: veri kazıma yok, otomatik toplu hesap açma yok, plan veya hız limitlerini aşma girişimi yok, içe aktarıcıyı üçüncü taraf sitelere saldırmak için kullanmak yok ve kullanım hakkınız olmayan içerik yüklemek yok.",
          "Bu kurallara aykırı hesapları, mümkün olduğunda bildirimde bulunarak askıya alabiliriz.",
        ],
      },
      {
        heading: "Planlar ve ödeme",
        body: [
          "Ücretsiz plan aylık bir analiz hakkı içerir. Pro, Stripe üzerinden faturalanan aylık bir aboneliktir; fiyatlar ödeme öncesinde gösterilir.",
          "Abonelik portalından istediğiniz an iptal edebilirsiniz — Pro, ödenen dönemin sonuna kadar etkin kalır. Yenilemeler, başarısız ödemeler ve iptaller Stripe'ın standart abonelik davranışını izler.",
        ],
      },
      {
        heading: "Sorumluluk reddi",
        body: [
          "Yapay zekâ analizi hatalı olabilir. Uyum puanları tahmindir, işe alım kararı değildir; mülakat veya teklif garantisi vermeyiz.",
          'Hizmet, hiçbir garanti olmaksızın "olduğu gibi" sunulur. Yasaların izin verdiği azami ölçüde sorumluluğumuz, bir talepten önceki on iki ayda bize ödediğiniz tutarla sınırlıdır.',
        ],
      },
      {
        heading: "Değişiklikler ve iletişim",
        body: [
          "Bu koşulları güncelleyebiliriz; önemli değişiklikler yürürlüğe girmeden önce üründe veya e-posta ile duyurulur.",
          "Sorular: support@applypilot.ai.",
        ],
      },
    ],
  },
};

export default async function TermsPage() {
  const t = content[await getLocale()];
  return (
    <article>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {t.title}
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t.updated}</p>
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
