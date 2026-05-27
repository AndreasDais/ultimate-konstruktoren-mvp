-- PILAR spor 2: persistert visningsspraak per koyring.
--
-- display_language blir rekna eingong i init-run (displayLanguageForContext)
-- og lese av rapport-/bereknings-renderinga via inferReportDisplayLanguage.
-- EITT autoritativt felt -> rapport, berekningsark og eksport kan ikkje
-- lenger sprike paa visningsspraak.
--
-- Nullable: koyringar fraa FOER denne migrasjonen har display_language = null
-- og fell trygt tilbake til den eksisterande tekst-snifferen.
-- Idempotent: trygt aa koyre fleire gonger.

alter table public.calculation_runs
  add column if not exists display_language text;

alter table public.calculation_runs
  drop constraint if exists calculation_runs_display_language_check;

alter table public.calculation_runs
  add constraint calculation_runs_display_language_check
  check (display_language is null or display_language in ('nn', 'nb', 'en'));
