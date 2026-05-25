"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";
import type { Locale } from "@/lib/locale";
import "./admin.css";

type AdminLink = {
  title: string;
  href: string;
  eyebrow: string;
  description: string;
  status: string;
};

const COPY: Record<Locale, {
  kicker: string;
  title: string;
  intro: string;
  asideLabel: string;
  asideTitle: string;
  asideText: string;
  navLabel: string;
  open: string;
  links: AdminLink[];
}> = {
  nb: {
    kicker: "PILAR admin",
    title: "Kontrollpanel",
    intro:
      "Samlet inngang til intern drift, kvalitet, læring og feiloppfølging. Bruk denne siden i stedet for å skrive admin-URL-er manuelt.",
    asideLabel: "Aktiv rolle",
    asideTitle: "Faglig og operativ kontroll",
    asideText: "Ingen autonom produksjonsendring uten eksplisitt godkjenning.",
    navLabel: "Admin-navigasjon",
    open: "Åpne →",
    links: [
      {
        title: "Operating Intelligence",
        href: "/admin/intelligence",
        eyebrow: "Daglig agent",
        description:
          "Daglig analyse av pipeline, forslag, kostnad, prising, markedssignal og forbedringsloop.",
        status: "Ny",
      },
      {
        title: "Feilrapporter",
        href: "/admin/error-reports",
        eyebrow: "Kvalitetskontroll",
        description:
          "Gå gjennom rapporterte feil, verifiser avvik og marker saker som fikset eller avvist.",
        status: "Aktiv",
      },
      {
        title: "Workbench",
        href: "/",
        eyebrow: "Produkt",
        description: "Tilbake til hovedflyten for nye beregninger og rapportgenerering.",
        status: "App",
      },
      {
        title: "Mine rapporter",
        href: "/mine",
        eyebrow: "Rapportarkiv",
        description: "Se tidligere kjøringer, rapporter og pipeline-status fra usevisningen.",
        status: "Arkiv",
      },
    ],
  },
  nn: {
    kicker: "PILAR admin",
    title: "Kontrollpanel",
    intro:
      "Samla inngang til intern drift, kvalitet, læring og feiloppfølging. Bruk denne sida i staden for å skrive admin-URL-ar manuelt.",
    asideLabel: "Aktiv rolle",
    asideTitle: "Fagleg og operativ kontroll",
    asideText: "Inga autonom produksjonsendring utan eksplisitt godkjenning.",
    navLabel: "Admin-navigasjon",
    open: "Opne →",
    links: [
      {
        title: "Operating Intelligence",
        href: "/admin/intelligence",
        eyebrow: "Dagleg agent",
        description:
          "Dagleg analyse av pipeline, forslag, kostnad, prising, marknadssignal og forbetringsloop.",
        status: "Ny",
      },
      {
        title: "Feilrapportar",
        href: "/admin/error-reports",
        eyebrow: "Kvalitetskontroll",
        description:
          "Gå gjennom rapporterte feil, verifiser avvik og marker saker som fiksa eller avviste.",
        status: "Aktiv",
      },
      {
        title: "Workbench",
        href: "/",
        eyebrow: "Produkt",
        description: "Tilbake til hovudflyten for nye berekningar og rapportgenerering.",
        status: "App",
      },
      {
        title: "Mine rapportar",
        href: "/mine",
        eyebrow: "Rapportarkiv",
        description: "Sjå tidlegare køyringar, rapportar og pipeline-status frå usevisinga.",
        status: "Arkiv",
      },
    ],
  },
};

export default function AdminHomePage() {
  const { locale } = useLocale();
  const T = COPY[locale];

  return (
    <main className="admin-page-shell">
      <section className="admin-hero-card">
        <div>
          <p className="admin-kicker">{T.kicker}</p>
          <h1>{T.title}</h1>
          <p>{T.intro}</p>
        </div>
        <div className="admin-hero-aside">
          <span className="admin-aside-label">{T.asideLabel}</span>
          <strong>{T.asideTitle}</strong>
          <p>{T.asideText}</p>
        </div>
      </section>

      <section className="admin-grid" aria-label={T.navLabel}>
        {T.links.map((item) => (
          <Link href={item.href} className="admin-nav-card" key={item.href}>
            <div className="admin-card-topline">
              <span>{item.eyebrow}</span>
              <em>{item.status}</em>
            </div>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <span className="admin-card-link">{T.open}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
