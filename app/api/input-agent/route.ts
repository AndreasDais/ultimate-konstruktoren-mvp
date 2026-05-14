import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabase } from "@/lib/supabase";
import { coerceLocale, wrapPromptWithLocale, type Locale } from "@/lib/locale";

const SYSTEM_PROMPT = `Du er Tolkar for Pilar, eit AI-basert verktøy for norsk byggfagleg praksis.

Oppgåva di er å lese ein konstruksjonsfagleg forespørsel frå ein brukar og returnere ei strukturert tolking. Du skal IKKJE løyse oppgåva — berre tolke, validere og strukturere.

GRUNNFILOSOFI — opent system med data-driven læring:

Du skal være VELVILLIG til å la berekningsagentane prøve seg. Vi vil heller samle data på kva som faktisk feilar i pipeline enn å gjette på forhånd kva som ligg utanfor scope. Konkret betyr det:

- Når input er fagleg gyldig konstruksjonsmateriale, klassifiser som klar/delvis_klar/mangelfull — sjølv om det rører ved tema utanfor "typiske student-oppgåver" (LT-knekking, nedbøying, betongarmering, trekonstruksjon, tilknytingar).
- Flagg usikkerheit gjennom konfidens og antakingar, ikkje gjennom å avvise.
- Reserver "relevant_ikkje_stotta" for områder der vi manglar metodisk grunnlag i det heile (sjå definisjon under).

Tryggleiken ligg ikkje i deg åleine — Konstruktør A og Konstruktør B løyser uavhengig, Samanliknar finn avvik mellom dei, og Kontrollør har stoppmandat. Du er første ledd, ikkje einaste ledd.

I prosa-felt (særleg tolkings_oppsummering) skal du referere til deg sjølv som "Tolkar" i tredjeperson eller bruke passivform — aldri "eg".

STATUS-DEFINISJONAR (gjensidig utelukkande):

- "avvist" — ikkje byggfagleg input i det heile (bilde av fotball, kokeoppskrift, programmering, generell prat).
- "uklart" — for vagt eller mangelfullt formulert til at du forstår kva brukaren spør om. Be om presisering.
- "relevant_ikkje_stotta" — BERRE for fagområde der vi ikkje har metodisk grunnlag overhodet: brannprosjektering, seismisk dimensjonering, dynamisk respons og utmatting, geoteknisk dimensjonering (utover enkel jordtrykk-modell). IKKJE bruk denne for vanlege strukturberekningar i stål/betong/tre — la heller agentane prøve.
- "klar" — alle nødvendige data oppgitt. kan_reknast_no har innhald, manglande_verdiar er tom.
- "delvis_klar" — nokre data manglar, men minst éin meiningsfull berekning kan utførast. KRAV: kan_reknast_no MÅ vere ikkje-tom.
- "mangelfull" — relevant byggfagleg input, men ingenting kan reknast trygt utan meir data. KRAV: kan_reknast_no SKAL vere tom array.

KRITISK REGEL — delvis_klar vs mangelfull:
Når du kjem til status-feltet, sjå opp til kan_reknast_no du allereie har skrive. Desse to er logisk gjensidig utelukkande:
- delvis_klar betyr "noko kan reknast, men ikkje alt"
- mangelfull betyr "ingenting kan reknast enno, treng meir input"

Viss kan_reknast_no er tom array, er status alltid "mangelfull", aldri "delvis_klar". Punktum.

OVERLAPP-REGEL — antakingar vs manglande_verdiar:
Eit datapunkt skal ikkje stå begge stader. Logikken er:
- Står det i tolkte_verdiar: brukaren oppgav det.
- Står det i antakingar: ein rimeleg standard er fylt inn for å kunne gå vidare.
- Står det i manglande_verdiar: det kan ikkje rimeleg antakast, og det blokkerer berekning.

Når noko er lagt i antakingar, skal det IKKJE samtidig stå i manglande_verdiar. Anten er det antatt (antakingar) eller det manglar (manglande_verdiar) — ikkje begge.

KONFIDENS-KALIBRERING:
Konfidens måler kor sikker Tolkar er på TOLKINGA av brukarens forespørsel — ikkje om det er nok data, og ikkje om svaret blir korrekt.

- 0.85-1.00: heilt typisk forespurnad, klar formulering, kjende symbol og einingar
- 0.65-0.85: forståeleg men med tolkingsval (t.d. q tolka som qEd, antaking om materialkvalitet)
- 0.45-0.65: forespurnaden er på grensa av MVP eller har fleire moglege tolkingar. Kontrollør bør sjå nøye på resultatet.
- under 0.45: betydeleg tolkingsusikkerheit. Vurder om "uklart" passar betre enn å gå vidare.

DØME PÅ KORREKT KLASSIFISERING (felta står i same rekkefølge som JSON-skjemaet under):

Døme 1 — delvis_klar (lastverknad utan kapasitet):
Input: "Fritt opplagd stålbjelke L=5m, q=8 kN/m. Finn moment og skjær."
→ berekningstype: "Lastverknad — moment og skjær for fritt opplagd bjelke"
→ tolkte_verdiar: { "L": "5,0 m", "q": "8,0 kN/m", "oppleggstilhøve": "fritt opplagd" }
→ antakingar: ["q tolka som dimensjonerande last (qEd)"]
→ manglande_verdiar: ["profil", "stålkvalitet"]
→ kan_reknast_no: ["MEd", "VEd"]
→ konfidens: 0.92
→ status: "delvis_klar"
Grunngiving: Lastverknad krev berre L og q. Profil og stålkvalitet er reelt manglande for kapasitetskontroll.

Døme 2 — mangelfull (betongarmering utan material):
Input: "Betongbjelke b=250mm, h=500mm, MEd=120 kNm. Finn nødvendig armering."
→ berekningstype: "armeringsberekning betongbjelke"
→ tolkte_verdiar: { "b": "250 mm", "h": "500 mm", "MEd": "120 kNm" }
→ antakingar: []
→ manglande_verdiar: ["betongkvalitet", "armeringskvalitet", "overdekning eller effektiv høgde"]
→ kan_reknast_no: []
→ konfidens: 0.88
→ status: "mangelfull"
Grunngiving: Utan materialkvalitetar finst ingen meiningsfull delberekning. Betong er innanfor det vi let agentane prøve — manglar er datamangel, ikkje scope-mangel. Status mangelfull, ikkje relevant_ikkje_stotta.

Døme 3 — klar (alt på plass):
Input: "Fritt opplagd IPE 240 S355, L=5m, qEd=8 kN/m. Finn MEd og kapasitetskontroll."
→ berekningstype: "Stålbjelke — moment og kapasitetskontroll"
→ tolkte_verdiar: { "profil": "IPE 240", "stålkvalitet": "S355", "L": "5,0 m", "qEd": "8,0 kN/m" }
→ antakingar: []
→ manglande_verdiar: []
→ kan_reknast_no: ["MEd", "VEd", "Mpl,Rd", "Vpl,Rd", "utnyttingsgrad"]
→ konfidens: 0.95
→ status: "klar"

Døme 4 — delvis_klar med låg konfidens (grensetilfelle, lar agentane prøve):
Input: "IPE 300 S355, L=8m, qEd=6 kN/m, ikkje sideavstiva. Vurder momentkapasitet."
→ berekningstype: "Momentkapasitetskontroll stålbjelke med mogleg LT-knekking"
→ tolkte_verdiar: { "profil": "IPE 300", "stålkvalitet": "S355", "L": "8,0 m", "qEd": "6,0 kN/m", "sideavstiving": "ingen" }
→ antakingar: ["fritt opplagd antatt", "last antatt påført i tyngdepunktet (konservativt for vipping)"]
→ manglande_verdiar: ["momentfordeling for korrekt Cb-faktor"]
→ kan_reknast_no: ["MEd", "VEd", "Mpl,Rd"]
→ kan_ikkje_reknast: ["Mb,Rd (LT-knekking) — krev Cb-faktor og full LT-knekkanalyse etter §6.3.2"]
→ konfidens: 0.65
→ status: "delvis_klar"
Grunngiving: Forespurnaden er fagleg gyldig sjølv om vipping ligg på grensa. Vi let agentane prøve, flaggar usikkerheit gjennom konfidens og antakingar, og lar Kontrollør ta endeleg avgjerd. Merk at "lastangrepspunkt" er antatt (tyngdepunkt) — det skal IKKJE samtidig stå i manglande_verdiar.

Døme 5 — relevant_ikkje_stotta (klart utanfor metodisk grunnlag):
Input: "Berekn dynamisk respons for ein 30 m skorstein under vindutmatting."
→ berekningstype: "dynamisk vindrespons og utmatting"
→ tolkte_verdiar: { "konstruksjon": "skorstein", "høgde": "30 m" }
→ antakingar: []
→ manglande_verdiar: []
→ kan_reknast_no: []
→ tolkings_oppsummering: "Dynamisk vindrespons og utmatting krev metodikk Pilar ikkje har implementert."
→ konfidens: 0.92
→ status: "relevant_ikkje_stotta"

ANDRE REGLAR:
- Heller stoppe og be om meir info enn å gjette på faktiske input-data — men på SCOPE skal du heller la agentane prøve enn å avvise.
- Bruk same språkstil som brukaren (nynorsk eller bokmål).
- Konfidens måler tolkings-sikkerheit, ikkje data-tilstrekkelegheit. Ein klart formulert mangelfull-forespørsel skal ha høg konfidens.

ARBEIDSFLYT — fyll ut JSON-felta i den rekkefølga dei står i skjemaet under. Det er ikkje ei tilfeldig sortering, det er den faktiske tankeprosessen:

1. berekningstype + fagomraade — kva spør brukaren om?
2. tolkte_verdiar — alt brukaren har oppgitt eksplisitt
3. antakingar — kva må antakast for å gå vidare? (t.d. "q tolka som qEd", "fritt opplagd antatt")
4. manglande_verdiar — kva manglar framleis etter at uttrekk og antakingar er gjort?
5. kan_reknast_no — KONKRET kva som faktisk kan reknast med det som er på plass
6. kan_ikkje_reknast — kva som ikkje kan reknast og kvifor
7. tolkings_oppsummering — 1-2 setningar som oppsummerer forståinga
8. konfidens — kor sikker Tolkar er på TOLKINGA (ikkje på sluttsvaret)
9. status — sist. Vel basert på alt over.

KRITISK PRINSIPP: Status kjem til slutt fordi han er konklusjonen. Ikkje commit til status først og rasjonaliser bakover. Arbeid deg gjennom felta i rekkefølge.

OUTPUT-FORMAT:
Du svarar ALLTID med gyldig JSON, og berre JSON. Ingen forklaringar før eller etter. Ingen markdown-fences. Berre rein JSON.

Produser dette objektet i nøyaktig denne rekkefølga:

{
  "berekningstype": "kort namn på kva slags problem dette er, eller null",
  "fagomraade": "stål | betong | last | geoteknikk | osv | null",
  "tolkte_verdiar": { "L": "5,0 m", "q": "8,0 kN/m" },
  "antakingar": ["q tolka som dimensjonerande last"],
  "manglande_verdiar": ["liste over data som trengst"],
  "kan_reknast_no": ["MEd", "VEd"],
  "kan_ikkje_reknast": ["kapasitetskontroll"],
  "tolkings_oppsummering": "1-2 setningar som forklarer kva Tolkar har forstått",
  "konfidens": 0.85,
  "status": "klar | delvis_klar | mangelfull | uklart | relevant_ikkje_stotta | avvist"
}`;

const PROMPT_VERSION = "input_agent_v0.4";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type ContentBlock =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: { type: "base64"; media_type: string; data: string };
    }
  | {
      type: "document";
      source: { type: "base64"; media_type: "application/pdf"; data: string };
    };

type BuildResult =
  | { ok: true; content: ContentBlock[]; rawTextForDb: string }
  | { ok: false; error: string; status: number };

async function parseInput(
  request: Request
): Promise<{ text: string | null; file: File | null; locale: Locale }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const textValue = formData.get("text");
    const fileValue = formData.get("file");
    const localeValue = formData.get("locale");
    return {
      text:
        typeof textValue === "string" && textValue.trim()
          ? textValue.trim()
          : null,
      file: fileValue instanceof File ? fileValue : null,
      locale: coerceLocale(
        typeof localeValue === "string" ? localeValue : null
      ),
    };
  }

  const body = await request.json();
  return {
    text:
      typeof body.text === "string" && body.text.trim() ? body.text.trim() : null,
    file: null,
    locale: coerceLocale(body.locale),
  };
}

async function buildContent(
  text: string | null,
  file: File | null
): Promise<BuildResult> {
  const content: ContentBlock[] = [];
  let fileSummary = "";

  if (file) {
    if (file.size > MAX_FILE_SIZE) {
      return {
        ok: false,
        error: `Fila er for stor (${(file.size / (1024 * 1024)).toFixed(
          1
        )} MB). Maks 4 MB.`,
        status: 413,
      };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileType = file.type;

    if (SUPPORTED_IMAGE_TYPES.has(fileType)) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: fileType,
          data: buffer.toString("base64"),
        },
      });
      fileSummary = `[Bilete: ${file.name}, ${fileType}, ${(
        file.size / 1024
      ).toFixed(1)} KB]`;
    } else if (fileType === "application/pdf") {
      content.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: buffer.toString("base64"),
        },
      });
      fileSummary = `[PDF: ${file.name}, ${(file.size / 1024).toFixed(1)} KB]`;
    } else if (fileType === DOCX_MIME) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        const extracted = result.value.trim();
        if (!extracted) {
          return {
            ok: false,
            error: "Word-dokumentet ser tomt ut.",
            status: 400,
          };
        }
        content.push({
          type: "text",
          text: `[Innhald frå Word-dokument "${file.name}"]:\n\n${extracted}`,
        });
        fileSummary = `[Word: ${file.name}, ${(file.size / 1024).toFixed(
          1
        )} KB]`;
      } catch (err) {
        console.error("mammoth-feil:", err);
        return {
          ok: false,
          error: "Klarte ikkje lese Word-dokumentet.",
          status: 400,
        };
      }
    } else {
      return {
        ok: false,
        error: `Filtype ikkje støtta: ${
          fileType || "ukjent"
        }. Bruk JPG/PNG/WebP, PDF eller .docx.`,
        status: 400,
      };
    }

    // Brukar-instruksjon når fil er sendt
    if (text) {
      content.push({
        type: "text",
        text: `Brukar har sendt vedlegg pluss tilleggstekst. Sjå begge. Hvis vedlegget inneheld fleire oppgåver, vel den hovudoppgåva som er klarast formulert og tolk berre han. Ignorer eventuell støy som ikkje er relevant.\n\nTilleggstekst frå brukar:\n${text}`,
      });
    } else {
      content.push({
        type: "text",
        text: "Sjå det vedlagde dokumentet. Hvis det inneheld fleire oppgåver, vel den hovudoppgåva som er klarast formulert og tolk berre han. Ignorer eventuell støy som ikkje er relevant for hovudoppgåva.",
      });
    }
  } else if (text) {
    content.push({ type: "text", text });
  }

  if (content.length === 0) {
    return {
      ok: false,
      error: "Manglar input — anten tekst eller fil.",
      status: 400,
    };
  }

  const rawTextForDb = file
    ? text
      ? `${fileSummary}\n\nTilleggstekst:\n${text}`
      : fileSummary
    : text!;

  return { ok: true, content, rawTextForDb };
}

type CoreCallResult =
  | { ok: true; result: Record<string, unknown>; requestId: string | null }
  | { ok: false; status: number; error: string; raw?: string };

async function callTolkar(args: {
  content: ContentBlock[];
  rawTextForDb: string;
  locale: Locale;
  onTextDelta?: (delta: string) => void;
}): Promise<CoreCallResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any = [{ role: "user", content: args.content }];

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    temperature: 0.3,
    system: wrapPromptWithLocale(SYSTEM_PROMPT, args.locale),
    messages,
  });

  if (args.onTextDelta) {
    stream.on("text", args.onTextDelta);
  }

  const message = await stream.finalMessage();

  const responseText = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("");

  const cleaned = responseText.replace(/^```json\s*|\s*```$/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return {
      ok: false,
      status: 500,
      error: "Klarte ikkje parse svaret som JSON",
      raw: responseText,
    };
  }

  let requestId: string | null = null;

  try {
    const supabase = getSupabase();

    // Hent innlogga brukar (hvis nokon). Anonyme tolkingar har user_id=null.
    // Vi bruker @supabase/ssr for å lese auth-cookies — same pattern som /mine.
    let userId: string | null = null;
    try {
      const cookieStore = await cookies();
      const authClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll() {
              // No-op — vi les berre.
            },
          },
        }
      );
      const { data: { user } } = await authClient.auth.getUser();
      userId = user?.id ?? null;
    } catch (authErr) {
      console.warn("[input-agent] kunne ikkje hente bruker:", authErr);
      // Fall gjennom som anonym — ikkje fatal.
    }

    const { data: requestData, error: requestError } = await supabase
      .from("requests")
      .insert({
        raw_text: args.rawTextForDb,
        input_channel: "text",
        user_mode: "student",
        user_id: userId,
      })
      .select("id")
      .single();

    if (requestError) {
      console.error("Klarte ikkje lagre request:", requestError);
    } else if (requestData) {
      requestId = requestData.id;

      const { error: reviewError } = await supabase
        .from("input_reviews")
        .insert({
          request_id: requestId,
          input_status: parsed.status,
          calculation_type: parsed.berekningstype,
          discipline: parsed.fagomraade,
          extracted_inputs: parsed.tolkte_verdiar,
          missing_inputs: parsed.manglande_verdiar,
          can_calculate: parsed.kan_reknast_no,
          cannot_calculate: parsed.kan_ikkje_reknast,
          assumptions: parsed.antakingar,
          interpretation_summary: parsed.tolkings_oppsummering,
          confidence: parsed.konfidens,
          prompt_version: PROMPT_VERSION,
        });

      if (reviewError) {
        console.error("Klarte ikkje lagre input_review:", reviewError);
      }
    }
  } catch (dbError) {
    console.error("Database-feil:", dbError);
  }

  return { ok: true, result: parsed, requestId };
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  try {
    const parsed = await parseInput(request);
    const built = await buildContent(parsed.text, parsed.file);

    if (!built.ok) {
      return Response.json({ error: built.error }, { status: built.status });
    }

    const { content, rawTextForDb } = built;

    const acceptHeader = request.headers.get("accept") ?? "";
    const wantsSSE = acceptHeader.includes("text/event-stream");

    if (wantsSSE) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let closed = false;
          const send = (event: string, data: unknown) => {
            if (closed) return;
            try {
              controller.enqueue(encoder.encode(sseEvent(event, data)));
            } catch {
              closed = true;
            }
          };

          try {
            let firstDeltaSeen = false;
            const result = await callTolkar({
              content,
              rawTextForDb,
              locale: parsed.locale,
              onTextDelta: (delta) => {
                if (!firstDeltaSeen) {
                  firstDeltaSeen = true;
                  send("text_start", {});
                }
                send("delta", { text: delta });
              },
            });

            if (!result.ok) {
              send("error", { message: result.error, raw: result.raw });
            } else {
              send("complete", {
                result: { ...result.result, request_id: result.requestId },
              });
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : "Ukjent feil";
            send("error", { message });
          } finally {
            closed = true;
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
          Connection: "keep-alive",
        },
      });
    }

    // JSON-modus (bakoverkompatibel)
    const result = await callTolkar({ content, rawTextForDb, locale: parsed.locale });

    if (!result.ok) {
      return Response.json(
        { error: result.error, raw: result.raw },
        { status: result.status }
      );
    }

    return Response.json({
      result: result.result,
      request_id: result.requestId,
    });
  } catch (err) {
    console.error("Tolkar error:", err);
    const errorMessage = err instanceof Error ? err.message : "Ukjent feil";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}