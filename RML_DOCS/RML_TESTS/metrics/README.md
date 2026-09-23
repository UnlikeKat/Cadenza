# Metriche RML — Indice (Fase 1)

Specifiche RML (Runtime Verification) delle 6 metriche di esecuzione pianistica del progetto **Cadenza** (tirocinio Runtime Verification). Ogni file `.rml` è autonomo, è stato compilato con il compilatore RML reale (ANTLR + Kotlin, con vincoli CLP(Q/R) in output Prolog) e verifica la semantica dei requisiti FR-001..FR-006 di `.swarm/spec.md`.

Le metriche operano sul modello di eventi Web MIDI (webmidi v3): oggetti JSON `noteon`, `noteoff`, `controlchange`, uno per riga (JSONL), con `timestamp` in ms.

## Indice delle metriche

| File | FR | Metrica | Costrutti RML usati | Categoria |
|------|----|---------|---------------------|-----------|
| `pitch-range.rml` | FR-001 | Pitch Range Check — ogni `noteon` nel range 88 tasti A0(21)–C8(108) | `matches` su oggetto JSON, `with` (range `num >= 21 && num <= 108`), alias arity-0, `*` | Easy |
| `dynamics-adherence.rml` | FR-002 | Dynamics Adherence — note "forte" con `rawAttack >= 80` | `>>` (filtro di stream), `with` (soglia), derived da evento base, alias arity-0, `*` | Easy |
| `pedal-toggle.rml` | FR-003 | Pedal Toggle Detection — CC64: pressione `value==127`, rilascio `value==0` | `matches` su `controlchange`, `with` (uguaglianze), unione `|`, alias arity-0, `*` | Easy |
| `chord-jitter.rml` | FR-004 | Chord Jitter — accordo C4(60)+E4(64) premuto entro 30ms in entrambi gli ordini | `let`, `\/` (shuffle), derived parametrico `near(n,t1)` con `abs(t2-t1)<30` (check_der), `>>`, `*` | Medium |
| `syncopated-pedal.rml` | FR-005 | Syncopated Pedal — pedale premuto (CC64 `value:127`) entro 200ms dall'attacco della nota | `let`, derived parametrico `pedalSoon(t1)` con `t2 > t1 && t2 - t1 < 200` (check_der), `not matches` + `other*` (tolleranza eventi intermedi), `*` | Medium |
| `articulation.rml` | FR-006 | Articulation (Legato/Staccato) — delta `t2-t1` tra `noteoff(N)` e `noteon(N+1)`; `<=0` = legato, `>0` = staccato (violazione) | `let`, derived parametrico `legatoNext(t1)` con `t2-t1<=0` (check_der), `*` | Medium |

## Come compilare ed eseguire

### 1. Compilazione (RML → Prolog)

```text
java -jar RML_DOCS\RML_TESTS\compiler\build\libs\rml-compiler.jar --input <file.rml>
```

Esempio:

```text
java -jar RML_DOCS\RML_TESTS\compiler\build\libs\rml-compiler.jar --input RML_DOCS\RML_TESTS\metrics\pitch-range.rml
```

Ripetere per ciascuna metrica sostituendo il nome del file. Il compilatore produce il modulo Prolog con i predicati `match/2` e `trace_expression/2`; i vincoli `with` diventano vincoli CLP(Q/R) (es. `{Num >= 21, Num =< 108}`), come nell'output compilato del PoC `midi-probe/piano-test.pl`.

### 2. Esecuzione in SWI-Prolog (pattern del PoC)

Seguire il flusso end-to-end del PoC in `RML_DOCS/RML_TESTS/midi-probe/`:

1. **Cattura della traccia**: `node probe.js` registra gli eventi MIDI del pianoforte in `events.json` (JSONL, un oggetto compatibile webmidi v3 per riga).
2. **Caricamento della specifica**: eseguire SWI-Prolog sul modulo `.pl` generato dal compilatore; il modulo dichiara le dipendenze dal runtime RML (`monitor(deep_subdict)` e `library(clpr)`).
3. **Monitoraggio**: fornire la traccia evento per evento; per ogni evento che soddisfa la `Main` il monitor stampa `matched event #N: ...` e al termine `Execution terminated correctly` (vedi `midi-probe/verdict.txt`).
4. **Verdetto**: salvare l'output del monitor su un file (come `verdict.txt` nel PoC). Un evento che viola la `Main` — es. una nota fuori range per `pitch-range.rml`, o un gap positivo per `articulation.rml` — interrompe il match e produce verdetto negativo.

## Convenzioni grammaticali rispettate

Tutte e sei le specifiche seguono le stesse convenzioni della grammatica RML (`RML.g4`):

- **Dichiarazioni prima delle equazioni**: tutti i tipi evento (`matches` / `not matches`) e i tipi derived sono dichiarati all'inizio del file; le equazioni seguono.
- **`with` solo nelle dichiarazioni derived** (`derivedEvtypeDecl`): la clausola `with` esprime vincoli booleani sui campi dell'evento corrente — incluso il confronto con parametri legati da eventi precedenti — e non è ammessa dentro le equazioni.
- **Identificatori di equazione UPPERCASE**: `Main`, `Chord`, `Pedal`, `Articulation` rispettano la regola `expId` della grammatica (identificatore maiuscolo).
- **Alias arity-0**: quando un tipo evento con parametri serve in un contesto senza argomenti (in particolare nell'operatore `>>`), si dichiara un alias con wildcard, uno per parametro — es. `noteOn matches noteOn(_);`.
- **Vincoli cross-event (pattern `check_der`)**: i vincoli temporali tra eventi diversi passano per un derived parametrico — es. `near(n, t1) matches noteOnT(n, t2) with abs(t2 - t1) < 30;` — dove `t1` è legato al timestamp di un evento precedente tramite `{let t1; ...}` nell'equazione.

## Riferimenti

- `.swarm/spec.md` — requisiti FR-001..FR-006 e modello eventi Web MIDI.
- `RUNTIME_VERIFICATION_ANALYSIS.md` — analisi Runtime Verification del progetto.
- `RML_GUIDA_COMPLETA.md` — guida completa al linguaggio RML (versione divisa in file tematici in `RML_DOCS/00_README.md`).
- `RML_DOCS/RML_TESTS/midi-probe/` — PoC end-to-end: `piano-test.rml` (spec), `piano-test.pl` (output compilato), `probe.js` (cattura MIDI), `events.json` (traccia JSONL), `verdict.txt` (esito del monitor).
