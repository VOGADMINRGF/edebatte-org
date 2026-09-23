"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useLocale } from "@/context/LocaleContext";
import type { SupportedLocale } from "@/config/locales";
import { buildFreeBallotStartHref } from "@features/pricing/goToMarketPackaging";

type DemoCopy = {
  eyebrow: string;
  question: string;
  intro: string;
  answers: [string, string, string, string];
  choose: string;
  difference: string;
  position: string;
  followup: string;
  placeholder: string;
  contribute: string;
  skip: string;
  explanation: string;
  ownAnswer: string;
  why: string;
  source: string;
  next: string;
  noLogin: string;
  start: string;
};

const DE: DemoCopy = {
  eyebrow: "1 Frage · direkt ausprobieren",
  question: "Wie sehr vertraust du darauf, dass politische Entscheidungen in deinem Land fair und nachvollziehbar getroffen werden?",
  intro: "Wähle eine Antwort. Danach kannst du sagen, was du als Erstes ändern würdest.",
  answers: ["Sehr", "Eher", "Wenig", "Gar nicht"],
  choose: "Antwort auswählen",
  difference: "Jetzt beginnt der Unterschied",
  position: "Deine Position",
  followup: "Was würdest du als Erstes ändern?",
  placeholder: "Deine Idee …",
  contribute: "Idee beitragen",
  skip: "Überspringen",
  explanation: "Eine Antwort zeigt eine Haltung. Gründe, Erfahrungen, Quellen und eigene Vorschläge zeigen, warum Menschen so denken – und was sich konkret verbessern ließe.",
  ownAnswer: "eigener Vorschlag",
  why: "Warum?",
  source: "Quelle / Erfahrung",
  next: "gemeinsames Bild",
  noLogin: "Keine Anmeldung zum Ausprobieren",
  start: "Eigene Frage starten →",
};

const TRANSLATIONS: Partial<Record<SupportedLocale, DemoCopy>> = {
  de: DE,
  en: { ...DE, eyebrow: "1 question · try it now", question: "How much do you trust that political decisions in your country are made fairly and transparently?", intro: "Choose an answer. Then tell us what you would change first.", answers: ["A lot", "Somewhat", "Little", "Not at all"], choose: "Choose an answer", difference: "This is where the difference begins", position: "Your position", followup: "What would you change first?", placeholder: "Your idea …", contribute: "Contribute idea", skip: "Skip", explanation: "An answer shows a position. Reasons, experiences, sources and your own proposals show why people think this way – and what could concretely improve.", ownAnswer: "own proposal", why: "Why?", source: "Source / experience", next: "shared picture", noLogin: "No sign-up to try", start: "Start your own question →" },
  fr: { ...DE, eyebrow: "1 question · essayer maintenant", question: "Dans quelle mesure avez-vous confiance dans le fait que les décisions politiques de votre pays sont prises de manière équitable et transparente ?", intro: "Choisissez une réponse. Vous pourrez ensuite dire ce que vous changeriez en premier.", answers: ["Beaucoup", "Plutôt", "Peu", "Pas du tout"], choose: "Choisir une réponse", difference: "C’est ici que la différence commence", position: "Votre position", followup: "Que changeriez-vous en premier ?", placeholder: "Votre idée …", contribute: "Proposer une idée", skip: "Passer", explanation: "Une réponse montre une position. Les raisons, expériences, sources et propositions montrent pourquoi les gens pensent ainsi et ce qui pourrait être amélioré.", ownAnswer: "proposition", why: "Pourquoi ?", source: "Source / expérience", next: "vue d’ensemble", noLogin: "Aucune inscription pour essayer", start: "Lancer votre question →" },
  pl: { ...DE, eyebrow: "1 pytanie · wypróbuj teraz", question: "Na ile ufasz, że decyzje polityczne w twoim kraju są podejmowane uczciwie i przejrzyście?", intro: "Wybierz odpowiedź. Potem możesz powiedzieć, co zmienił(a)byś najpierw.", answers: ["Bardzo", "Raczej", "Mało", "Wcale"], choose: "Wybierz odpowiedź", difference: "Tu zaczyna się różnica", position: "Twoje stanowisko", followup: "Co zmienił(a)byś najpierw?", placeholder: "Twój pomysł …", contribute: "Dodaj pomysł", skip: "Pomiń", explanation: "Odpowiedź pokazuje stanowisko. Powody, doświadczenia, źródła i propozycje pokazują, dlaczego ludzie tak myślą i co można poprawić.", ownAnswer: "własna propozycja", why: "Dlaczego?", source: "Źródło / doświadczenie", next: "wspólny obraz", noLogin: "Bez rejestracji, aby wypróbować", start: "Zacznij własne pytanie →" },
  es: { ...DE, eyebrow: "1 pregunta · pruébalo ahora", question: "¿Cuánta confianza tienes en que las decisiones políticas de tu país se toman de forma justa y transparente?", intro: "Elige una respuesta. Después puedes decir qué cambiarías primero.", answers: ["Mucha", "Bastante", "Poca", "Ninguna"], choose: "Elegir una respuesta", difference: "Aquí empieza la diferencia", position: "Tu posición", followup: "¿Qué cambiarías primero?", placeholder: "Tu idea …", contribute: "Aportar idea", skip: "Omitir", explanation: "Una respuesta muestra una posición. Las razones, experiencias, fuentes y propuestas muestran por qué pensamos así y qué podría mejorar.", ownAnswer: "propuesta propia", why: "¿Por qué?", source: "Fuente / experiencia", next: "visión común", noLogin: "Sin registro para probar", start: "Iniciar tu pregunta →" },
  it: { ...DE, eyebrow: "1 domanda · prova subito", question: "Quanto ti fidi che le decisioni politiche nel tuo Paese vengano prese in modo equo e trasparente?", intro: "Scegli una risposta. Poi puoi dire cosa cambieresti per prima cosa.", answers: ["Molto", "Abbastanza", "Poco", "Per niente"], choose: "Scegli una risposta", difference: "Qui inizia la differenza", position: "La tua posizione", followup: "Cosa cambieresti per prima cosa?", placeholder: "La tua idea …", contribute: "Proponi un’idea", skip: "Salta", explanation: "Una risposta mostra una posizione. Ragioni, esperienze, fonti e proposte mostrano perché le persone la pensano così e cosa potrebbe migliorare.", ownAnswer: "proposta", why: "Perché?", source: "Fonte / esperienza", next: "quadro comune", noLogin: "Nessuna registrazione per provare", start: "Avvia la tua domanda →" },
  tr: { ...DE, eyebrow: "1 soru · hemen dene", question: "Ülkenizde siyasi kararların adil ve şeffaf biçimde alındığına ne kadar güveniyorsunuz?", intro: "Bir yanıt seçin. Ardından ilk olarak neyi değiştireceğinizi söyleyebilirsiniz.", answers: ["Çok", "Oldukça", "Az", "Hiç"], choose: "Yanıt seçin", difference: "Fark burada başlıyor", position: "Görüşünüz", followup: "İlk olarak neyi değiştirirdiniz?", placeholder: "Fikriniz …", contribute: "Fikir ekle", skip: "Atla", explanation: "Bir yanıt bir görüşü gösterir. Nedenler, deneyimler, kaynaklar ve öneriler insanların neden böyle düşündüğünü ve neyin iyileşebileceğini gösterir.", ownAnswer: "kendi önerin", why: "Neden?", source: "Kaynak / deneyim", next: "ortak tablo", noLogin: "Denemek için kayıt gerekmez", start: "Kendi sorunu başlat →" },
  ar: { ...DE, eyebrow: "سؤال واحد · جرّبه الآن", question: "إلى أي مدى تثق بأن القرارات السياسية في بلدك تُتخذ بصورة عادلة وشفافة؟", intro: "اختر إجابة، ثم أخبرنا ما أول شيء ستغيّره.", answers: ["كثيراً", "إلى حد ما", "قليلاً", "لا أثق إطلاقاً"], choose: "اختر إجابة", difference: "هنا يبدأ الاختلاف", position: "موقفك", followup: "ما أول شيء ستغيّره؟", placeholder: "فكرتك …", contribute: "أضف فكرتك", skip: "تخطَّ", explanation: "الإجابة تُظهر موقفاً. الأسباب والتجارب والمصادر والمقترحات توضّح لماذا يفكر الناس بهذه الطريقة وما الذي يمكن تحسينه.", ownAnswer: "اقتراحك", why: "لماذا؟", source: "مصدر / تجربة", next: "صورة مشتركة", noLogin: "لا يلزم التسجيل للتجربة", start: "ابدأ سؤالك →" },
  ru: { ...DE, eyebrow: "1 вопрос · попробуйте сейчас", question: "Насколько вы доверяете тому, что политические решения в вашей стране принимаются справедливо и прозрачно?", intro: "Выберите ответ. Затем расскажите, что вы изменили бы в первую очередь.", answers: ["Очень", "Скорее да", "Мало", "Совсем нет"], choose: "Выберите ответ", difference: "Здесь начинается отличие", position: "Ваша позиция", followup: "Что вы изменили бы в первую очередь?", placeholder: "Ваша идея …", contribute: "Предложить идею", skip: "Пропустить", explanation: "Ответ показывает позицию. Причины, опыт, источники и предложения объясняют, почему люди думают так и что можно улучшить.", ownAnswer: "своё предложение", why: "Почему?", source: "Источник / опыт", next: "общая картина", noLogin: "Для пробы регистрация не нужна", start: "Создать свой вопрос →" },
  zh: { ...DE, eyebrow: "1 个问题 · 立即体验", question: "你在多大程度上相信，你所在国家的政治决策是以公平、透明的方式作出的？", intro: "请选择一个答案。之后你可以说说最想先改变什么。", answers: ["非常信任", "比较信任", "不太信任", "完全不信任"], choose: "选择答案", difference: "不同之处从这里开始", position: "你的立场", followup: "你最想先改变什么？", placeholder: "你的想法 …", contribute: "提交想法", skip: "跳过", explanation: "一个答案只能显示立场。理由、经验、来源和建议，才能解释人们为什么这样想，以及具体可以改善什么。", ownAnswer: "自己的建议", why: "为什么？", source: "来源 / 经验", next: "共同图景", noLogin: "无需注册即可体验", start: "发起自己的问题 →" },
  nl: { ...DE, eyebrow: "1 vraag · probeer direct", question: "Hoeveel vertrouwen heb je erin dat politieke besluiten in jouw land eerlijk en transparant worden genomen?", intro: "Kies een antwoord. Daarna kun je zeggen wat je als eerste zou veranderen.", answers: ["Veel", "Redelijk", "Weinig", "Helemaal niet"], choose: "Kies een antwoord", difference: "Hier begint het verschil", position: "Jouw positie", followup: "Wat zou je als eerste veranderen?", placeholder: "Jouw idee …", contribute: "Idee bijdragen", skip: "Overslaan", explanation: "Een antwoord toont een standpunt. Redenen, ervaringen, bronnen en voorstellen laten zien waarom mensen zo denken en wat beter kan.", ownAnswer: "eigen voorstel", why: "Waarom?", source: "Bron / ervaring", next: "gezamenlijk beeld", noLogin: "Geen registratie om te proberen", start: "Start je eigen vraag →" },
  pt: { ...DE, eyebrow: "1 pergunta · experimente agora", question: "Até que ponto confia que as decisões políticas no seu país são tomadas de forma justa e transparente?", intro: "Escolha uma resposta. Depois pode dizer o que mudaria primeiro.", answers: ["Muito", "Razoavelmente", "Pouco", "Nada"], choose: "Escolher uma resposta", difference: "É aqui que começa a diferença", position: "A sua posição", followup: "O que mudaria primeiro?", placeholder: "A sua ideia …", contribute: "Contribuir com ideia", skip: "Saltar", explanation: "Uma resposta mostra uma posição. Razões, experiências, fontes e propostas mostram por que pensamos assim e o que pode melhorar.", ownAnswer: "proposta própria", why: "Porquê?", source: "Fonte / experiência", next: "visão comum", noLogin: "Sem registo para experimentar", start: "Criar a sua pergunta →" },
  fi: { ...DE, eyebrow: "1 kysymys · kokeile heti", question: "Kuinka paljon luotat siihen, että poliittiset päätökset tehdään maassasi oikeudenmukaisesti ja läpinäkyvästi?", intro: "Valitse vastaus. Sen jälkeen voit kertoa, mitä muuttaisit ensimmäisenä.", answers: ["Paljon", "Jonkin verran", "Vähän", "En lainkaan"], choose: "Valitse vastaus", difference: "Tästä ero alkaa", position: "Kantasi", followup: "Mitä muuttaisit ensimmäisenä?", placeholder: "Ideasi …", contribute: "Lisää idea", skip: "Ohita", explanation: "Vastaus kertoo kannan. Perustelut, kokemukset, lähteet ja omat ehdotukset näyttävät, miksi ihmiset ajattelevat näin ja mitä voisi parantaa.", ownAnswer: "oma ehdotus", why: "Miksi?", source: "Lähde / kokemus", next: "yhteinen kuva", noLogin: "Ei kirjautumista kokeiluun", start: "Aloita oma kysymys →" },
  sv: { ...DE, eyebrow: "1 fråga · prova direkt", question: "Hur mycket litar du på att politiska beslut i ditt land fattas rättvist och öppet?", intro: "Välj ett svar. Sedan kan du säga vad du skulle ändra först.", answers: ["Mycket", "Ganska mycket", "Lite", "Inte alls"], choose: "Välj ett svar", difference: "Här börjar skillnaden", position: "Din ståndpunkt", followup: "Vad skulle du ändra först?", placeholder: "Din idé …", contribute: "Bidra med idé", skip: "Hoppa över", explanation: "Ett svar visar en ståndpunkt. Skäl, erfarenheter, källor och förslag visar varför människor tänker så och vad som kan förbättras.", ownAnswer: "eget förslag", why: "Varför?", source: "Källa / erfarenhet", next: "gemensam bild", noLogin: "Ingen registrering för att prova", start: "Starta din egen fråga →" },
  no: { ...DE, eyebrow: "1 spørsmål · prøv nå", question: "Hvor mye stoler du på at politiske beslutninger i landet ditt tas på en rettferdig og åpen måte?", intro: "Velg et svar. Deretter kan du si hva du ville endret først.", answers: ["Mye", "En del", "Lite", "Ikke i det hele tatt"], choose: "Velg et svar", difference: "Her begynner forskjellen", position: "Ditt standpunkt", followup: "Hva ville du endret først?", placeholder: "Din idé …", contribute: "Bidra med idé", skip: "Hopp over", explanation: "Et svar viser et standpunkt. Begrunnelser, erfaringer, kilder og forslag viser hvorfor folk tenker slik og hva som kan forbedres.", ownAnswer: "eget forslag", why: "Hvorfor?", source: "Kilde / erfaring", next: "felles bilde", noLogin: "Ingen registrering for å prøve", start: "Start ditt eget spørsmål →" },
  cs: { ...DE, eyebrow: "1 otázka · vyzkoušejte hned", question: "Nakolik důvěřujete tomu, že politická rozhodnutí ve vaší zemi jsou přijímána spravedlivě a transparentně?", intro: "Vyberte odpověď. Poté můžete říct, co byste změnili jako první.", answers: ["Velmi", "Spíše ano", "Málo", "Vůbec"], choose: "Vyberte odpověď", difference: "Tady začíná rozdíl", position: "Váš postoj", followup: "Co byste změnili jako první?", placeholder: "Váš nápad …", contribute: "Přidat nápad", skip: "Přeskočit", explanation: "Odpověď ukazuje postoj. Důvody, zkušenosti, zdroje a návrhy ukazují, proč lidé přemýšlejí právě takto a co lze zlepšit.", ownAnswer: "vlastní návrh", why: "Proč?", source: "Zdroj / zkušenost", next: "společný obraz", noLogin: "Pro vyzkoušení není nutná registrace", start: "Začít vlastní otázku →" },
  hi: { ...DE, eyebrow: "1 सवाल · अभी आज़माएँ", question: "आपको कितना भरोसा है कि आपके देश में राजनीतिक फैसले निष्पक्ष और पारदर्शी तरीके से लिए जाते हैं?", intro: "एक उत्तर चुनें। उसके बाद बताइए कि आप सबसे पहले क्या बदलना चाहेंगे।", answers: ["बहुत", "कुछ हद तक", "कम", "बिल्कुल नहीं"], choose: "उत्तर चुनें", difference: "यहीं से फर्क शुरू होता है", position: "आपकी राय", followup: "आप सबसे पहले क्या बदलेंगे?", placeholder: "आपका विचार …", contribute: "विचार साझा करें", skip: "छोड़ें", explanation: "एक उत्तर केवल रुख दिखाता है। कारण, अनुभव, स्रोत और सुझाव बताते हैं कि लोग ऐसा क्यों सोचते हैं और क्या बेहतर किया जा सकता है।", ownAnswer: "अपना सुझाव", why: "क्यों?", source: "स्रोत / अनुभव", next: "साझा तस्वीर", noLogin: "आज़माने के लिए लॉगिन नहीं", start: "अपना सवाल शुरू करें →" },
  ro: { ...DE, eyebrow: "1 întrebare · încearcă acum", question: "Câtă încredere ai că deciziile politice din țara ta sunt luate corect și transparent?", intro: "Alege un răspuns. Apoi poți spune ce ai schimba mai întâi.", answers: ["Foarte multă", "Destulă", "Puțină", "Deloc"], choose: "Alege un răspuns", difference: "Aici începe diferența", position: "Poziția ta", followup: "Ce ai schimba mai întâi?", placeholder: "Ideea ta …", contribute: "Contribuie cu o idee", skip: "Sari peste", explanation: "Un răspuns arată o poziție. Motivele, experiențele, sursele și propunerile arată de ce oamenii gândesc astfel și ce s-ar putea îmbunătăți.", ownAnswer: "propunere proprie", why: "De ce?", source: "Sursă / experiență", next: "imagine comună", noLogin: "Fără autentificare pentru test", start: "Pornește propria întrebare →" },
  el: { ...DE, eyebrow: "1 ερώτηση · δοκίμασέ το τώρα", question: "Πόσο εμπιστεύεσαι ότι οι πολιτικές αποφάσεις στη χώρα σου λαμβάνονται δίκαια και με διαφάνεια;", intro: "Επίλεξε μια απάντηση. Μετά μπορείς να πεις τι θα άλλαζες πρώτο.", answers: ["Πολύ", "Αρκετά", "Λίγο", "Καθόλου"], choose: "Επίλεξε απάντηση", difference: "Εδώ αρχίζει η διαφορά", position: "Η θέση σου", followup: "Τι θα άλλαζες πρώτο;", placeholder: "Η ιδέα σου …", contribute: "Πρόσθεσε ιδέα", skip: "Παράλειψη", explanation: "Μια απάντηση δείχνει μια θέση. Οι λόγοι, οι εμπειρίες, οι πηγές και οι προτάσεις δείχνουν γιατί οι άνθρωποι σκέφτονται έτσι και τι μπορεί να βελτιωθεί.", ownAnswer: "δική σου πρόταση", why: "Γιατί;", source: "Πηγή / εμπειρία", next: "κοινή εικόνα", noLogin: "Χωρίς εγγραφή για δοκιμή", start: "Ξεκίνα τη δική σου ερώτηση →" },
  uk: { ...DE, eyebrow: "1 питання · спробуйте зараз", question: "Наскільки ви довіряєте тому, що політичні рішення у вашій країні ухвалюються справедливо та прозоро?", intro: "Оберіть відповідь. Потім скажіть, що б ви змінили насамперед.", answers: ["Дуже", "Скоріше так", "Мало", "Зовсім ні"], choose: "Оберіть відповідь", difference: "Тут починається різниця", position: "Ваша позиція", followup: "Що б ви змінили насамперед?", placeholder: "Ваша ідея …", contribute: "Додати ідею", skip: "Пропустити", explanation: "Відповідь показує позицію. Причини, досвід, джерела та пропозиції пояснюють, чому люди так думають і що можна покращити.", ownAnswer: "власна пропозиція", why: "Чому?", source: "Джерело / досвід", next: "спільна картина", noLogin: "Для спроби реєстрація не потрібна", start: "Створити власне питання →" },
};

const CHOICE_IDS = ["high", "some", "low", "none"] as const;

export function HomeBallotExperience() {
  const { locale } = useLocale();
  const copy = TRANSLATIONS[locale] ?? DE;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [idea, setIdea] = useState("");
  const resultRef = useRef<globalThis.HTMLDivElement>(null);
  const selectedIndex = CHOICE_IDS.findIndex((id) => id === selectedId);

  useEffect(() => {
    if (selectedId) resultRef.current?.focus();
  }, [selectedId]);

  return (
    <div className="space-y-4">
      <section aria-labelledby="home-ballot-question" className="relative overflow-hidden rounded-[2.25rem] border border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-5 py-6 shadow-[0_28px_90px_rgba(15,23,42,0.14)] sm:px-8 sm:py-8">
        <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]"><span>{copy.eyebrow}</span><span className="text-cyan-600">01</span></div>
        <h2 id="home-ballot-question" className="mt-5 max-w-4xl text-balance text-2xl font-black leading-tight tracking-[-0.025em] text-[color:var(--foreground)] sm:text-4xl">{copy.question}</h2>
        <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{copy.intro}</p>
        <div className="mt-7 flex flex-wrap gap-2.5" role="group" aria-label={copy.choose}>
          {CHOICE_IDS.map((id, index) => {
            const active = id === selectedId;
            return <button key={id} type="button" aria-pressed={active} onClick={() => setSelectedId(id)} className={`rounded-full border px-5 py-3 text-sm font-bold transition ${active ? "border-cyan-500 bg-cyan-500 text-slate-950 shadow-md" : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] hover:-translate-y-0.5 hover:border-cyan-400"}`}>{copy.answers[index]}</button>;
          })}
        </div>
        {selectedIndex >= 0 ? (
          <div ref={resultRef} tabIndex={-1} aria-live="polite" className="mt-8 border-t border-[color:var(--border)] pt-6 outline-none">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-600">{copy.difference}</p>
            <p className="mt-3 text-lg font-black text-[color:var(--foreground)]">{copy.position}: {copy.answers[selectedIndex]}</p>
            <label htmlFor="home-ballot-idea" className="mt-5 block text-lg font-black text-[color:var(--foreground)]">{copy.followup}</label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input id="home-ballot-idea" value={idea} onChange={(event) => setIdea(event.target.value)} maxLength={500} placeholder={copy.placeholder} className="min-w-0 flex-1 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none focus:border-cyan-500" />
              <Link href={`/create?mode=source&intent=contribution&entryIntent=content_companion&entryMode=direct&source=homepage-civic-demo&signalTitle=${encodeURIComponent(copy.question)}${idea.trim() ? `&prefill=${encodeURIComponent(idea.trim())}` : ""}`} className="rounded-full bg-cyan-500 px-5 py-3 text-center text-sm font-black text-slate-950 hover:bg-cyan-400">{copy.contribute}</Link>
              <button type="button" onClick={() => setIdea("")} className="rounded-full border border-[color:var(--border)] px-5 py-3 text-sm font-bold text-[color:var(--foreground)]">{copy.skip}</button>
            </div>
            <p className="mt-5 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">{copy.explanation}</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-[color:var(--foreground)]"><span>＋ {copy.ownAnswer}</span><span>↳ {copy.why}</span><span>↗ {copy.source}</span><span>→ {copy.next}</span></div>
          </div>
        ) : null}
        <div className="mt-7 flex items-center justify-between gap-4 border-t border-[color:var(--border)] pt-5"><span className="text-xs text-[color:var(--muted)]">{copy.noLogin}</span><Link href={buildFreeBallotStartHref(undefined, "homepage-ballot")} className="text-sm font-black text-cyan-700 hover:underline dark:text-cyan-300">{copy.start}</Link></div>
      </section>
    </div>
  );
}