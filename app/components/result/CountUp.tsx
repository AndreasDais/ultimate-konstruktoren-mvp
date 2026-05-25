"use client";

/**
 * CountUp (#anim-01) — animert tal-teljing for diwhilejonerande tiles.
 *
 * Tellast opp frå 0 til endeverdi over 1100ms med ease-out cubic. Animasjonen
 * triggrast når tile-en KJEM I VIEW (via IntersectionObserver), ikkje ved
 * mount. Det er fordi tiles ofte er nedanfor fold ved første mount —
 * useen si auga er på Controller-kortet på toppen først, og når dei
 * scrollar ned skal count-up fortsatt skje. Køyrer only ein gong per tile-
 * instans. Respekterer prefers-reduced-motion.
 *
 * Format-bevaring: same antall desimalar og same skiljeteikn (norsk komma)
 * som original-verdien.
 *
 * Splitta ut frå app/page.tsx i refaktor-fase 3.
 */

import { useEffect, useRef, useState } from "react";

export function CountUp({
  numberStr,
  durationMs = 1100,
}: {
  numberStr: string;
  durationMs?: number;
}) {
  // Parse: "5120" → { value: 5120, decimals: 0, separator: "" }
  //        "10,58" → { value: 10.58, decimals: 2, separator: "," }
  const parsed = (() => {
    const cleaned = numberStr.replace(/[≈~<>≥≤]/g, "").replace(/\s/g, "").trim();
    const usesComma = cleaned.includes(",");
    const normalized = usesComma ? cleaned.replace(",", ".") : cleaned;
    const value = parseFloat(normalized);
    if (!isFinite(value)) return null;
    const decimalsMatch = cleaned.match(/[.,](\d+)$/);
    const decimals = decimalsMatch ? decimalsMatch[1].length : 0;
    return { value, decimals, separator: usesComma ? "," : "." };
  })();

  // Start på 0 — første render viser "0", deretter animerer vi opp.
  const [current, setCurrent] = useState<number>(0);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!parsed) return;

    // Reduced-motion: hopp direkte til endeverdi, ingen animasjon
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setCurrent(parsed.value);
      return;
    }

    const element = spanRef.current;
    if (!element) {
      // Fallback om ref ikkje sat enno — sett endeverdi direkte
      setCurrent(parsed.value);
      return;
    }

    let hasStarted = false;
    let raf: number | null = null;

    const startAnimation = () => {
      if (hasStarted) return;
      hasStarted = true;
      const target = parsed.value;
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(elapsed / durationMs, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - t, 3);
        setCurrent(target * eased);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    // Trigge når tile er minst 20% synleg
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          startAnimation();
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (raf !== null) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!parsed) return <>{numberStr}</>;

  // Format: behaldar separator + antall desimalar
  const formatted = current
    .toFixed(parsed.decimals)
    .replace(".", parsed.separator);
  return (
    <span ref={spanRef} style={{ fontVariantNumeric: "tabular-nums" }}>
      {formatted}
    </span>
  );
}