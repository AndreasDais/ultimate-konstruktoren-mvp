import styles from "./AgentLiveOpsDashboard.module.css";

type ReplayControlsProps = {
  activeIndex: number;
  eventCount: number;
  onChange: (index: number) => void;
};

export function ReplayControls({
  activeIndex,
  eventCount,
  onChange,
}: ReplayControlsProps) {
  const lastIndex = Math.max(0, eventCount - 1);

  function clamp(index: number) {
    return Math.min(lastIndex, Math.max(0, index));
  }

  return (
    <section className={styles.replayPanel} aria-label="Recorded event replay">
      <div>
        <p className={styles.panelKicker}>Recorded replay</p>
        <h2>Event {activeIndex + 1} of {eventCount}</h2>
      </div>
      <div className={styles.replayControls}>
        <button type="button" onClick={() => onChange(0)} disabled={activeIndex === 0}>
          First
        </button>
        <button
          type="button"
          onClick={() => onChange(clamp(activeIndex - 1))}
          disabled={activeIndex === 0}
        >
          Prev
        </button>
        <input
          aria-label="Recorded event index"
          max={lastIndex}
          min={0}
          onChange={(event) => onChange(clamp(Number(event.target.value)))}
          type="range"
          value={activeIndex}
        />
        <button
          type="button"
          onClick={() => onChange(clamp(activeIndex + 1))}
          disabled={activeIndex === lastIndex}
        >
          Next
        </button>
        <button
          type="button"
          onClick={() => onChange(lastIndex)}
          disabled={activeIndex === lastIndex}
        >
          Latest
        </button>
      </div>
    </section>
  );
}
