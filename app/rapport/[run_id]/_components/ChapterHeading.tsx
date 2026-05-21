/**
 * ChapterHeading — kapittel-overskrift med stor mono-num + serif-tittel.
 *
 * Layout: "01" mono venstre, "Samandrag" serif høgre, baseline-aligned.
 * Eit ruler-line under heile overskrifta (skjer mellom kapittel).
 *
 * Frå Retning B-designet — replikerar Multiconsult/Sweco-intern-notat-stil.
 * Brukast for § 01 Sammendrag, § 02 Beregning, § 03 Vurdering, § 04 Kontroll.
 */

type Props = {
    /** To-sifra kapittel-nummer: "01", "02", "03", "04". */
    num: string;
    /** Kapittel-tittel: "Samandrag", "Berekning", osb. */
    title: string;
    /**
     * Set true for første kapittel (rett etter forsida). Reduserer
     * margin-top sidan forsida allereie har sin eigen botn-margin.
     */
    first?: boolean;
  };
  
  export function ChapterHeading({ num, title, first = false }: Props) {
    const cls = first
      ? "rapport-chapter-heading rapport-chapter-heading--first"
      : "rapport-chapter-heading";
    return (
      <h2 className={cls}>
        <span className="rapport-chapter-heading__num" aria-hidden="true">{num}</span>
        <span className="rapport-chapter-heading__title">{title}</span>
      </h2>
    );
  }