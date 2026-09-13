"use client";

import { useEffect, useRef, useState } from "react";
import type {
  VogOriginMetadata,
  VogPublicBallotUiLocale,
} from "@features/vog/publicBallotContract";
import {
  getVogPublicBallotLocaleDirection,
  VOG_BALLOT_CSRF_HEADER,
  VOG_BALLOT_CSRF_VALUE,
} from "@features/vog/publicBallotContract";
import type {
  VogPublicBallotReadModel,
  VogPublicBallotResultPass,
} from "@/features/vog/publicBallotReadModel";

type Copy = {
  language: string;
  eyebrow: string;
  originalLanguage: string;
  readingLanguage: string;
  uiLanguage: string;
  outputLanguage: string;
  missingTranslation: string;
  invalidLocale: string;
  outputFallback: string;
  participationHeading: string;
  participationBody: string;
  attribution: string;
  legitimacy: string;
  choose: string;
  submit: string;
  submitting: string;
  change: string;
  saved: string;
  updated: string;
  alreadyVoted: string;
  networkError: string;
  rateLimited: string;
  closed: string;
  scheduled: string;
  genericError: string;
  resultUnavailable: string;
  ownSelection: string;
  privacy: string;
  methodology: string;
  resultHeading: string;
  total: string;
  guestVotes: string;
  memberVotes: string;
  period: string;
  openEnded: string;
  sources: string;
  counterPositions: string;
  follow: string;
  login: string;
  publicConsultation: string;
  distribution: string;
  evidenceAccess: string;
};

const COPY: Record<VogPublicBallotUiLocale, Copy> = {
  de: {
    language: "Sprache",
    eyebrow: "VoiceOpenGov · öffentliche VOG-Frage",
    originalLanguage: "Originalsprache",
    readingLanguage: "Lesesprache",
    uiLanguage: "Bedienungssprache",
    outputLanguage: "Ausgabesprache",
    missingTranslation:
      "Die angeforderte Sprachfassung fehlt. Der freigegebene Originaltext wird angezeigt; es wurde keine automatische Übersetzung erzeugt.",
    invalidLocale:
      "Die angeforderte Sprache ist nicht freigegeben oder ungültig. Der freigegebene Originaltext wird angezeigt.",
    outputFallback:
      "Die angeforderte Ausgabesprache fehlt. Ergebnisbeschriftungen verwenden eine vorhandene freigegebene Sprachfassung.",
    participationHeading: "Offene öffentliche Beteiligung",
    participationBody:
      "Diese Beteiligung ist ohne Konto möglich und wird nicht als verifizierte Mitgliedsentscheidung gezählt.",
    attribution: "Namenszuordnung: nicht öffentlich",
    legitimacy: "Legitimation: nicht verifizierte öffentliche Konsultation",
    choose: "Antwort auswählen",
    submit: "Stimme abgeben",
    submitting: "Stimme wird gespeichert …",
    change: "Auswahl aktualisieren",
    saved: "Ihre Stimme wurde gespeichert.",
    updated: "Ihre Auswahl wurde aktualisiert, ohne eine weitere Stimme zu zählen.",
    alreadyVoted: "Sie haben bereits teilgenommen. Sie können Ihre Auswahl aktualisieren.",
    networkError: "Keine Verbindung. Ihre Stimme wurde nicht gespeichert.",
    rateLimited: "Zu viele Versuche. Bitte warten Sie kurz und versuchen Sie es erneut.",
    closed: "Diese öffentliche Beteiligung ist geschlossen.",
    scheduled: "Diese öffentliche Beteiligung ist noch nicht geöffnet.",
    genericError: "Die Stimme konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
    resultUnavailable: " Der Beteiligungspass ist vorübergehend nicht verfügbar.",
    ownSelection: "Ihre Auswahl",
    privacy:
      "Ein zufälliges erstseitiges Teilnahmetoken begrenzt Doppelstimmen. Im neuen Vote-Datensatz werden weder Roh-IP noch vollständiger User-Agent gespeichert.",
    methodology:
      "Dieses Ergebnis ist nicht repräsentativ. Ohne verifizierte Identität kann Mehrfachteilnahme reduziert, aber nicht vollständig ausgeschlossen werden.",
    resultHeading: "Beteiligungspass",
    total: "Stimmen insgesamt",
    guestVotes: "Offene Gaststimmen",
    memberVotes: "Verifizierte VOG-Mitgliedsstimmen",
    period: "Zeitraum",
    openEnded: "offen",
    sources: "Quellen",
    counterPositions: "Gegenpositionen",
    follow: "Nach der Beteiligung können Sie freiwillig ein Konto nutzen, um Themen zu folgen.",
    login: "Freiwillig anmelden",
    publicConsultation: "Öffentliche Konsultation",
    distribution: "Aggregierte Verteilungskanäle",
    evidenceAccess: "Quellen und Gegenpositionen ansehen",
  },
  en: {
    language: "Language",
    eyebrow: "VoiceOpenGov · public VOG question",
    originalLanguage: "Original language",
    readingLanguage: "Reading language",
    uiLanguage: "Interface language",
    outputLanguage: "Output language",
    missingTranslation:
      "The requested language version is missing. The released original is shown; no automatic translation was generated.",
    invalidLocale:
      "The requested locale is invalid or not allowlisted. The released original is shown.",
    outputFallback:
      "The requested output language is missing. Result labels use an available released language version.",
    participationHeading: "Open public participation",
    participationBody:
      "You can participate without an account. This is not counted as a verified member decision.",
    attribution: "Name attribution: not public",
    legitimacy: "Legitimacy: unverified public consultation",
    choose: "Choose an answer",
    submit: "Submit vote",
    submitting: "Saving vote …",
    change: "Update selection",
    saved: "Your vote has been saved.",
    updated: "Your selection was updated without counting another vote.",
    alreadyVoted: "You have already participated. You may update your selection.",
    networkError: "No connection. Your vote was not saved.",
    rateLimited: "Too many attempts. Please wait briefly and try again.",
    closed: "This public participation is closed.",
    scheduled: "This public participation has not opened yet.",
    genericError: "The vote could not be saved. Please try again.",
    resultUnavailable: " The participation pass is temporarily unavailable.",
    ownSelection: "Your selection",
    privacy:
      "A random first-party participation token reduces duplicate votes. The new vote record stores neither a raw IP address nor a full user agent.",
    methodology:
      "This result is not representative. Without verified identity, repeat participation can be reduced but not fully prevented.",
    resultHeading: "Participation pass",
    total: "Total votes",
    guestVotes: "Open guest votes",
    memberVotes: "Verified VOG member votes",
    period: "Period",
    openEnded: "open",
    sources: "Sources",
    counterPositions: "Counterpositions",
    follow: "After participating, you may optionally use an account to follow topics.",
    login: "Optional sign in",
    publicConsultation: "Public consultation",
    distribution: "Aggregated distribution channels",
    evidenceAccess: "View sources and counterpositions",
  },
  fr: {
    language: "Langue",
    eyebrow: "VoiceOpenGov · question VOG publique",
    originalLanguage: "Langue originale",
    readingLanguage: "Langue de lecture",
    uiLanguage: "Langue de l’interface",
    outputLanguage: "Langue de sortie",
    missingTranslation:
      "La version linguistique demandée manque. Le texte original publié est affiché ; aucune traduction automatique n’a été générée.",
    invalidLocale:
      "La langue demandée est invalide ou non autorisée. Le texte original publié est affiché.",
    outputFallback:
      "La langue de sortie demandée manque. Les libellés de résultat utilisent une version linguistique publiée disponible.",
    participationHeading: "Participation publique ouverte",
    participationBody:
      "Vous pouvez participer sans compte. Cette participation ne compte pas comme décision d’un membre vérifié.",
    attribution: "Attribution du nom : non publique",
    legitimacy: "Légitimité : consultation publique non vérifiée",
    choose: "Choisir une réponse",
    submit: "Envoyer le vote",
    submitting: "Enregistrement du vote …",
    change: "Mettre à jour le choix",
    saved: "Votre vote a été enregistré.",
    updated: "Votre choix a été mis à jour sans compter un vote supplémentaire.",
    alreadyVoted: "Vous avez déjà participé. Vous pouvez modifier votre choix.",
    networkError: "Aucune connexion. Votre vote n’a pas été enregistré.",
    rateLimited: "Trop de tentatives. Veuillez patienter puis réessayer.",
    closed: "Cette participation publique est terminée.",
    scheduled: "Cette participation publique n’est pas encore ouverte.",
    genericError: "Le vote n’a pas pu être enregistré. Veuillez réessayer.",
    resultUnavailable: " Le justificatif de participation est temporairement indisponible.",
    ownSelection: "Votre choix",
    privacy:
      "Un jeton de participation aléatoire de première partie réduit les votes multiples. Le nouveau vote ne stocke ni adresse IP brute ni agent utilisateur complet.",
    methodology:
      "Ce résultat n’est pas représentatif. Sans identité vérifiée, les participations répétées peuvent être réduites, mais pas totalement exclues.",
    resultHeading: "Justificatif de participation",
    total: "Total des votes",
    guestVotes: "Votes invités ouverts",
    memberVotes: "Votes de membres VOG vérifiés",
    period: "Période",
    openEnded: "ouvert",
    sources: "Sources",
    counterPositions: "Contre-positions",
    follow: "Après votre participation, vous pouvez utiliser un compte pour suivre des sujets.",
    login: "Connexion facultative",
    publicConsultation: "Consultation publique",
    distribution: "Canaux de distribution agrégés",
    evidenceAccess: "Voir les sources et les contre-positions",
  },
  es: {
    language: "Idioma",
    eyebrow: "VoiceOpenGov · pregunta VOG pública",
    originalLanguage: "Idioma original",
    readingLanguage: "Idioma de lectura",
    uiLanguage: "Idioma de la interfaz",
    outputLanguage: "Idioma de salida",
    missingTranslation:
      "Falta la versión solicitada. Se muestra el texto original publicado; no se ha generado ninguna traducción automática.",
    invalidLocale:
      "El idioma solicitado no es válido o no está permitido. Se muestra el texto original publicado.",
    outputFallback:
      "Falta el idioma de salida solicitado. Las etiquetas de resultados usan una versión publicada disponible.",
    participationHeading: "Participación pública abierta",
    participationBody:
      "Puede participar sin una cuenta. Esto no se cuenta como decisión de un miembro verificado.",
    attribution: "Atribución del nombre: no pública",
    legitimacy: "Legitimidad: consulta pública no verificada",
    choose: "Elegir una respuesta",
    submit: "Emitir voto",
    submitting: "Guardando el voto …",
    change: "Actualizar selección",
    saved: "Su voto se ha guardado.",
    updated: "Su selección se actualizó sin contar otro voto.",
    alreadyVoted: "Ya ha participado. Puede actualizar su selección.",
    networkError: "Sin conexión. Su voto no se ha guardado.",
    rateLimited: "Demasiados intentos. Espere un momento y vuelva a intentarlo.",
    closed: "Esta participación pública está cerrada.",
    scheduled: "Esta participación pública aún no está abierta.",
    genericError: "No se pudo guardar el voto. Vuelva a intentarlo.",
    resultUnavailable: " El comprobante de participación no está disponible temporalmente.",
    ownSelection: "Su selección",
    privacy:
      "Un token aleatorio de participación propio reduce los votos duplicados. El nuevo registro no guarda la IP sin procesar ni el agente de usuario completo.",
    methodology:
      "Este resultado no es representativo. Sin identidad verificada, la participación repetida puede reducirse, pero no excluirse por completo.",
    resultHeading: "Comprobante de participación",
    total: "Votos totales",
    guestVotes: "Votos abiertos de invitados",
    memberVotes: "Votos de miembros VOG verificados",
    period: "Periodo",
    openEnded: "abierto",
    sources: "Fuentes",
    counterPositions: "Contraposiciones",
    follow: "Después de participar, puede usar una cuenta para seguir temas de forma opcional.",
    login: "Inicio de sesión opcional",
    publicConsultation: "Consulta pública",
    distribution: "Canales de distribución agregados",
    evidenceAccess: "Ver fuentes y contraposiciones",
  },
  tr: {
    language: "Dil",
    eyebrow: "VoiceOpenGov · herkese açık VOG sorusu",
    originalLanguage: "Orijinal dil",
    readingLanguage: "Okuma dili",
    uiLanguage: "Arayüz dili",
    outputLanguage: "Çıktı dili",
    missingTranslation:
      "İstenen dil sürümü eksik. Yayımlanmış orijinal metin gösteriliyor; otomatik çeviri oluşturulmadı.",
    invalidLocale:
      "İstenen dil geçersiz veya izin listesinde değil. Yayımlanmış orijinal metin gösteriliyor.",
    outputFallback:
      "İstenen çıktı dili eksik. Sonuç etiketleri mevcut yayımlanmış bir dil sürümünü kullanıyor.",
    participationHeading: "Açık kamu katılımı",
    participationBody:
      "Hesap olmadan katılabilirsiniz. Bu katılım doğrulanmış üye kararı olarak sayılmaz.",
    attribution: "Ad ilişkilendirmesi: herkese açık değil",
    legitimacy: "Meşruiyet: doğrulanmamış kamu danışması",
    choose: "Bir yanıt seçin",
    submit: "Oy gönder",
    submitting: "Oy kaydediliyor …",
    change: "Seçimi güncelle",
    saved: "Oyunuz kaydedildi.",
    updated: "Seçiminiz ek oy sayılmadan güncellendi.",
    alreadyVoted: "Daha önce katıldınız. Seçiminizi güncelleyebilirsiniz.",
    networkError: "Bağlantı yok. Oyunuz kaydedilmedi.",
    rateLimited: "Çok fazla deneme. Lütfen kısa süre bekleyip tekrar deneyin.",
    closed: "Bu kamu katılımı kapandı.",
    scheduled: "Bu kamu katılımı henüz açılmadı.",
    genericError: "Oy kaydedilemedi. Lütfen tekrar deneyin.",
    resultUnavailable: " Katılım belgesi geçici olarak kullanılamıyor.",
    ownSelection: "Seçiminiz",
    privacy:
      "Rastgele birinci taraf katılım belirteci mükerrer oyları azaltır. Yeni oy kaydında ham IP veya tam kullanıcı aracısı saklanmaz.",
    methodology:
      "Bu sonuç temsili değildir. Doğrulanmış kimlik olmadan tekrarlanan katılım azaltılabilir ancak tamamen engellenemez.",
    resultHeading: "Katılım belgesi",
    total: "Toplam oy",
    guestVotes: "Açık misafir oyları",
    memberVotes: "Doğrulanmış VOG üye oyları",
    period: "Dönem",
    openEnded: "açık",
    sources: "Kaynaklar",
    counterPositions: "Karşı görüşler",
    follow: "Katılımdan sonra konuları takip etmek için isteğe bağlı olarak hesap kullanabilirsiniz.",
    login: "İsteğe bağlı giriş",
    publicConsultation: "Kamu danışması",
    distribution: "Toplu dağıtım kanalları",
    evidenceAccess: "Kaynakları ve karşı görüşleri görüntüle",
  },
  ar: {
    language: "اللغة",
    eyebrow: "VoiceOpenGov · سؤال VOG عام",
    originalLanguage: "اللغة الأصلية",
    readingLanguage: "لغة القراءة",
    uiLanguage: "لغة الواجهة",
    outputLanguage: "لغة المخرجات",
    missingTranslation:
      "النسخة اللغوية المطلوبة غير متاحة. يُعرض النص الأصلي المنشور، ولم تُنشأ ترجمة آلية.",
    invalidLocale:
      "اللغة المطلوبة غير صالحة أو غير مسموح بها. يُعرض النص الأصلي المنشور.",
    outputFallback:
      "لغة المخرجات المطلوبة غير متاحة. تستخدم تسميات النتائج نسخة لغوية منشورة ومتاحة.",
    participationHeading: "مشاركة عامة مفتوحة",
    participationBody:
      "يمكنك المشاركة من دون حساب. لا تُحتسب هذه المشاركة كقرار عضو موثّق.",
    attribution: "إسناد الاسم: غير علني",
    legitimacy: "الشرعية: مشاورة عامة غير موثّقة",
    choose: "اختر إجابة",
    submit: "إرسال التصويت",
    submitting: "جارٍ حفظ التصويت …",
    change: "تحديث الاختيار",
    saved: "تم حفظ تصويتك.",
    updated: "تم تحديث اختيارك من دون احتساب صوت إضافي.",
    alreadyVoted: "لقد شاركت سابقًا. يمكنك تحديث اختيارك.",
    networkError: "لا يوجد اتصال. لم يتم حفظ تصويتك.",
    rateLimited: "محاولات كثيرة جدًا. يُرجى الانتظار قليلًا ثم المحاولة مجددًا.",
    closed: "أُغلقت هذه المشاركة العامة.",
    scheduled: "لم تبدأ هذه المشاركة العامة بعد.",
    genericError: "تعذّر حفظ التصويت. يُرجى المحاولة مجددًا.",
    resultUnavailable: " بطاقة المشاركة غير متاحة مؤقتًا.",
    ownSelection: "اختيارك",
    privacy:
      "يحد رمز مشاركة عشوائي من الطرف الأول من الأصوات المكررة. لا يخزن سجل التصويت الجديد عنوان IP الخام أو وكيل المستخدم الكامل.",
    methodology:
      "هذه النتيجة غير تمثيلية. من دون هوية موثّقة يمكن تقليل المشاركة المتكررة، لكن لا يمكن منعها بالكامل.",
    resultHeading: "بطاقة المشاركة",
    total: "إجمالي الأصوات",
    guestVotes: "أصوات الضيوف المفتوحة",
    memberVotes: "أصوات أعضاء VOG الموثّقين",
    period: "الفترة",
    openEnded: "مفتوحة",
    sources: "المصادر",
    counterPositions: "المواقف المقابلة",
    follow: "بعد المشاركة يمكنك اختياريًا استخدام حساب لمتابعة الموضوعات.",
    login: "تسجيل دخول اختياري",
    publicConsultation: "مشاورة عامة",
    distribution: "قنوات التوزيع المجمعة",
    evidenceAccess: "عرض المصادر والمواقف المقابلة",
  },
};

const LANGUAGE_NAMES: Record<string, string> = {
  de: "Deutsch",
  en: "English",
  fr: "Français",
  es: "Español",
  tr: "Türkçe",
  ar: "العربية",
};
const DRAFT_SELECTION_STORAGE_PREFIX = "edebatte:vog-public-ballot-draft:v1";

function getLanguageLabel(locale: string, uiLocale: VogPublicBallotUiLocale) {
  const nativeName = LANGUAGE_NAMES[locale];
  if (nativeName) return `${nativeName} · ${locale.toUpperCase()}`;
  try {
    const displayName = new Intl.DisplayNames([uiLocale], { type: "language" }).of(locale);
    return displayName ? `${displayName} · ${locale}` : locale;
  } catch {
    return locale;
  }
}

function draftSelectionStorageKey(code: string, questionId: string) {
  return `${DRAFT_SELECTION_STORAGE_PREFIX}:${code}:${questionId}`;
}

function readDraftSelection(
  code: string,
  questionId: string,
  allowedOptionIds: readonly string[],
) {
  try {
    const stored = window.sessionStorage.getItem(
      draftSelectionStorageKey(code, questionId),
    );
    if (stored && allowedOptionIds.includes(stored)) return stored;
    if (stored) {
      window.sessionStorage.removeItem(draftSelectionStorageKey(code, questionId));
    }
  } catch {
    // Storage is a progressive enhancement only; voting remains available.
  }
  return null;
}

function persistDraftSelection(code: string, questionId: string, selection: string) {
  try {
    const key = draftSelectionStorageKey(code, questionId);
    if (selection) window.sessionStorage.setItem(key, selection);
    else window.sessionStorage.removeItem(key);
  } catch {
    // Storage is a progressive enhancement only; voting remains available.
  }
}

function clearDraftSelection(code: string, questionId: string) {
  try {
    window.sessionStorage.removeItem(draftSelectionStorageKey(code, questionId));
  } catch {
    // Storage is a progressive enhancement only; voting remains available.
  }
}

function formatDate(value: string | null, locale: VogPublicBallotUiLocale) {
  if (!value) return null;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function ResultPass({
  result,
  locale,
}: {
  result: VogPublicBallotResultPass;
  locale: VogPublicBallotUiLocale;
}) {
  const copy = COPY[locale];
  const start = formatDate(result.startsAt, locale) ?? copy.openEnded;
  const end = formatDate(result.closesAt, locale) ?? copy.openEnded;
  return (
    <section
      className="space-y-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm sm:p-5"
      aria-labelledby="vog-participation-pass-title"
      data-testid="vog-participation-pass"
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
          {copy.publicConsultation}
        </p>
        <h2 id="vog-participation-pass-title" className="text-lg font-bold text-[rgb(var(--fg))]">
          {copy.resultHeading}
        </h2>
      </div>
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-[rgb(var(--muted))]">{copy.total}</dt>
          <dd className="text-xl font-bold text-[rgb(var(--fg))]">{result.totalVotes}</dd>
        </div>
        <div>
          <dt className="text-[rgb(var(--muted))]">{copy.guestVotes}</dt>
          <dd className="text-xl font-bold text-[rgb(var(--fg))]">{result.openGuestVotes}</dd>
        </div>
        <div>
          <dt className="text-[rgb(var(--muted))]">{copy.memberVotes}</dt>
          <dd className="text-xl font-bold text-[rgb(var(--fg))]">{result.verifiedMemberVotes}</dd>
        </div>
      </dl>
      <div className="space-y-2">
        {result.optionCounts.map((option) => {
          const percentage = result.totalVotes
            ? Math.round((option.count / result.totalVotes) * 100)
            : 0;
          return (
            <div key={option.optionId} className="text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium text-[rgb(var(--fg))]">{option.label}</span>
                <span className="text-[rgb(var(--muted))]">
                  {option.count} · {percentage}%
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[rgb(var(--border))]">
                <div
                  className="h-full rounded-full bg-[rgb(var(--brand))]"
                  style={{ width: `${percentage}%` }}
                  aria-hidden="true"
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-[rgb(var(--muted))]">
        {copy.period}: {start} – {end}
      </p>
      {result.distributionChannels.length > 0 && (
        <div className="text-xs text-[rgb(var(--muted))]">
          <p className="font-semibold text-[rgb(var(--fg))]">{copy.distribution}</p>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {result.distributionChannels.map((channel) => (
              <li key={channel.source}>
                {channel.source}: {channel.count}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
        {copy.methodology}
      </p>
    </section>
  );
}

export function VogPublicBallotClient({
  initialBallot,
  originMetadata,
  localeLinks,
}: {
  initialBallot: VogPublicBallotReadModel;
  originMetadata: VogOriginMetadata;
  localeLinks: Array<{ locale: string; href: string }>;
}) {
  const [ballot, setBallot] = useState(initialBallot);
  const [selection, setSelection] = useState(initialBallot.ownSelection ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(
    initialBallot.ownSelection ? COPY[initialBallot.uiLocale].alreadyVoted : "",
  );
  const statusRef = useRef<HTMLParagraphElement>(null);
  const copy = COPY[ballot.uiLocale];
  const canVote = ballot.lifecycle === "open";

  useEffect(() => {
    const storedSelection = readDraftSelection(
      initialBallot.code,
      initialBallot.questionId,
      initialBallot.options.map((option) => option.optionId),
    );
    if (storedSelection) setSelection(storedSelection);
  }, [initialBallot.code, initialBallot.questionId, initialBallot.options]);

  useEffect(() => {
    if (notice) statusRef.current?.focus();
  }, [notice]);

  function updateSelection(optionId: string) {
    setSelection(optionId);
    persistDraftSelection(ballot.code, ballot.questionId, optionId);
  }

  async function submitVote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection || !canVote || submitting) return;
    setSubmitting(true);
    setNotice("");
    try {
      const response = await fetch(
        `/api/vog/public-ballots/${encodeURIComponent(ballot.code)}/${encodeURIComponent(ballot.questionId)}/vote`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "content-type": "application/json",
            [VOG_BALLOT_CSRF_HEADER]: VOG_BALLOT_CSRF_VALUE,
          },
          body: JSON.stringify({
            choice: selection,
            source: originMetadata.source,
            origin: originMetadata.origin,
            origin_id: originMetadata.originId,
            reading_locale: ballot.readingLocale,
            ui_locale: ballot.uiLocale,
            output_locale: ballot.outputLocale,
          }),
        },
      );
      const body = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            ballot?: VogPublicBallotReadModel | null;
            vote?: { updatedExisting?: boolean };
            resultProjectionUnavailable?: boolean;
          }
        | null;
      if (!response.ok || !body?.ok) {
        if (response.status === 429 || body?.error === "rate_limited") {
          setNotice(copy.rateLimited);
        } else if (body?.error === "ballot_closed") {
          setNotice(copy.closed);
        } else {
          setNotice(copy.genericError);
        }
        return;
      }
      clearDraftSelection(ballot.code, ballot.questionId);
      if (body.ballot) {
        setBallot(body.ballot);
        setSelection(body.ballot.ownSelection ?? selection);
      } else {
        setBallot((current) => ({
          ...current,
          ownSelection: selection,
          ownSelectionLabel:
            current.options.find(
              (option) => option.optionId === selection,
            )?.label ?? null,
          results: null,
        }));
      }
      const savedNotice = body.vote?.updatedExisting ? copy.updated : copy.saved;
      setNotice(
        body.resultProjectionUnavailable
          ? `${savedNotice}${copy.resultUnavailable}`
          : savedNotice,
      );
    } catch {
      setNotice(copy.networkError);
    } finally {
      setSubmitting(false);
    }
  }

  const lifecycleMessage =
    ballot.lifecycle === "closed"
      ? copy.closed
      : ballot.lifecycle === "scheduled"
        ? copy.scheduled
        : null;
  const readingLocaleNotice =
    ballot.readingTranslationStatus === "missing_fallback"
      ? copy.missingTranslation
      : ballot.readingTranslationStatus === "invalid_fallback"
        ? copy.invalidLocale
        : null;
  const outputLocaleNotice =
    ballot.outputTranslationStatus === "missing_fallback" ||
    ballot.outputTranslationStatus === "invalid_fallback"
      ? copy.outputFallback
      : null;

  return (
    <main
      className="mx-auto flex min-h-[100svh] max-w-3xl flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-8"
      lang={ballot.readingLocale}
      dir={ballot.direction}
      data-testid="vog-public-ballot"
      data-lifecycle={ballot.lifecycle}
    >
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
            {copy.eyebrow} · {ballot.originId}
          </p>
          <nav
            aria-label={copy.language}
            className="flex max-w-full flex-wrap gap-x-3 gap-y-2 text-xs"
          >
            {localeLinks.map((link) => (
              <a
                key={link.locale}
                href={link.href}
                hrefLang={link.locale}
                lang={link.locale}
                dir={getVogPublicBallotLocaleDirection(link.locale)}
                aria-current={ballot.readingLocale === link.locale ? "page" : undefined}
                onClick={() =>
                  persistDraftSelection(ballot.code, ballot.questionId, selection)
                }
                className="min-h-11 rounded-md px-1 py-3 font-semibold underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {getLanguageLabel(link.locale, ballot.uiLocale)}
              </a>
            ))}
          </nav>
        </div>
        <h1 className="text-2xl font-bold leading-tight text-[rgb(var(--fg))] sm:text-3xl">
          {ballot.title}
        </h1>
        <p className="text-sm leading-relaxed text-[rgb(var(--muted))] sm:text-base">
          {ballot.context}
        </p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[rgb(var(--muted))] sm:grid-cols-4">
          <div><dt>{copy.originalLanguage}</dt><dd className="font-semibold text-[rgb(var(--fg))]">{ballot.originalLocale}</dd></div>
          <div><dt>{copy.readingLanguage}</dt><dd className="font-semibold text-[rgb(var(--fg))]">{ballot.readingLocale}</dd></div>
          <div><dt>{copy.uiLanguage}</dt><dd className="font-semibold text-[rgb(var(--fg))]">{ballot.uiLocale}</dd></div>
          <div><dt>{copy.outputLanguage}</dt><dd className="font-semibold text-[rgb(var(--fg))]">{ballot.outputLocale}</dd></div>
        </dl>
        {(readingLocaleNotice || outputLocaleNotice) && (
          <div
            role="status"
            data-testid="vog-translation-fallback"
            className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
          >
            {readingLocaleNotice && <p>{readingLocaleNotice}</p>}
            {outputLocaleNotice && <p>{outputLocaleNotice}</p>}
          </div>
        )}
        <a
          href="#vog-evidence"
          className="inline-flex text-xs font-semibold underline underline-offset-2"
        >
          {copy.evidenceAccess}
        </a>
      </header>

      <section
        id="vog-participation-class"
        className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100"
      >
        <h2 className="font-bold">{copy.participationHeading}</h2>
        <p className="mt-1">{copy.participationBody}</p>
        <ul className="mt-2 space-y-1 text-xs">
          <li>{copy.attribution}</li>
          <li>{copy.legitimacy}</li>
        </ul>
      </section>

      <form onSubmit={submitVote} className="space-y-4">
        <fieldset
          disabled={!canVote || submitting}
          aria-describedby="vog-participation-class vog-ballot-privacy"
          className="space-y-3"
        >
          <legend className="text-base font-bold text-[rgb(var(--fg))]">{copy.choose}</legend>
          <div className="grid grid-cols-1 gap-2">
            {ballot.options.map((option) => (
              <label
                key={option.optionId}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3 text-sm font-medium text-[rgb(var(--fg))] has-[:checked]:border-sky-600 has-[:checked]:ring-2 has-[:checked]:ring-sky-200"
              >
                <input
                  type="radio"
                  name="vog-public-ballot-choice"
                  value={option.optionId}
                  checked={selection === option.optionId}
                  onChange={() => updateSelection(option.optionId)}
                  className="h-5 w-5"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <p id="vog-ballot-privacy" className="text-xs leading-relaxed text-[rgb(var(--muted))]">
          {copy.privacy}
        </p>
        {lifecycleMessage ? (
          <p className="rounded-xl bg-[rgb(var(--card))] p-3 text-sm font-semibold text-[rgb(var(--fg))]">
            {lifecycleMessage}
          </p>
        ) : (
          <button
            type="submit"
            disabled={!selection || submitting}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {submitting
              ? copy.submitting
              : ballot.ownSelection
                ? copy.change
                : copy.submit}
          </button>
        )}
      </form>

      <p
        ref={statusRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className={notice ? "rounded-xl border border-[rgb(var(--border))] p-3 text-sm text-[rgb(var(--fg))]" : "sr-only"}
      >
        {notice}
      </p>

      {ballot.results && (
        <ResultPass result={ballot.results} locale={ballot.uiLocale} />
      )}

      {ballot.ownSelectionLabel && (
        <p className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 text-sm text-[rgb(var(--fg))]">
          {copy.ownSelection}: <strong>{ballot.ownSelectionLabel}</strong>
        </p>
      )}

      <section id="vog-evidence" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
          <h2 className="font-bold text-[rgb(var(--fg))]">{copy.sources}</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {ballot.sources.map((source) => (
              <li key={source.id}>
                <a className="underline underline-offset-2" href={source.href} rel="noreferrer">
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
          <h2 className="font-bold text-[rgb(var(--fg))]">{copy.counterPositions}</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {ballot.counterPositions.map((position) => (
              <li key={position.id}>
                {position.href ? (
                  <a className="underline underline-offset-2" href={position.href} rel="noreferrer">
                    {position.label}
                  </a>
                ) : (
                  position.label
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {ballot.ownSelection && (
        <aside className="space-y-2 border-t border-[rgb(var(--border))] pt-4 text-sm text-[rgb(var(--muted))]">
          <p>{copy.follow}</p>
          <a href="/login" className="font-semibold underline underline-offset-2">
            {copy.login}
          </a>
        </aside>
      )}
    </main>
  );
}
