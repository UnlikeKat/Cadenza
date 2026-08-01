# Analisi per il Tirocinio: Runtime Verification applicata a "Cadenza" (Versione Finale)

Questo documento sintetizza lo studio preliminare, la mappa delle metriche di esecuzione al pianoforte, il confronto tra i linguaggi di **Runtime Verification (RV)** e alcuni **esempi pratici di implementazione** per il progetto **Cadenza** (React + TypeScript + WebMIDI).

---

## 1. Mappa delle Metriche di Esecuzione Monitorabili

Le metriche sono state ottimizzate eliminando le esitazioni (per preservare l'espressività dell'utente) e le pedalizzazioni complesse (mezzo pedale) per concentrarsi su parametri oggettivi e fattibili.

| Categoria | Metrica | Descrizione Tecnica | Eventi MIDI Coinvolti | Valore del Feedback per l'Utente |
| :--- | :--- | :--- | :--- | :--- |
| **1. Accuratezza delle Note (Pitch)** | **Note Errate (Extraneous Notes)** | Pressione di note non presenti nello spartito in quel determinato momento. | `Note On` con pitch non atteso. | Rileva errori di lettura dello spartito o tasti premuti per errore. |
| | **Note Mancanti (Missed Notes)** | Note dello spartito saltate o non registrate dal monitor. | Mancato `Note On` prima dell'avanzamento dello spartito. | Evidenzia note saltate o passaggi non letti. |
| | **Note "Ghost" (Slip-offs)** | Note a bassissima velocità e durata brevissima adiacenti a note corrette. | `Note On` + `Note Off` ravvicinati (es. < 80ms) con velocity < 15. | Rileva problemi di precisione del dita (il dito "scivola" su un tasto adiacente). |
| **2. Tempismo e Ritmo (Timing)** | **Precisione dell'Accordo (Chord Jitter)** | Scostamento temporale massimo nella pressione simultanea delle note di un accordo. | Delta timestamp tra i diversi `Note On` dell'accordo. | Un accordo ben eseguito ha le note simultanee (jitter < 30ms). Identifica arpeggiature involontarie. |
| | **Rapporto di Durata (IOI - Inter-Onset)** | Rapporto tra l'intervallo di inizio di note consecutive rispetto al valore nominale dello spartito. | Delta timestamp tra `Note On` consecutivi. | Valuta se le proporzioni ritmiche vengono rispettate (es. croma eseguita esattamente come metà tempo di una semiminima). |
| | **Stabilità del Tempo (BPM Drift)** | Oscillazioni o deviazioni sistematiche del tempo metronomico globale (rallentando/accelerando non richiesti). | Analisi dei timestamp medi dei battiti nel tempo. | Aiuta a mantenere un tempo costante, evidenziando se si accelera nei passaggi facili o si rallenta in quelli difficili. |
| **3. Dinamica ed Espressione** | **Aderenza alla Dinamica dello Spartito** | Confronto tra l'intensità della nota suonata e l'indicazione dello spartito (es. *p*, *mp*, *f*, *ff*). | Valore di *Velocity* (0-127) nei `Note On` confrontato con la dinamica teorica estratta da OSMD. | Valuta se l'esecutore rispetta il colore dinamico dello spartito (es. controllando che una nota segnata come *forte* superi una velocity di 80, e una segnata come *piano* sia sotto 50). |
| **4. Pedalizzazione (Sustain)** | **Tempismo del Pedale di Risonanza** | Il pedale deve essere premuto *subito dopo* l'attacco del tasto e rilasciato *subito prima/durante* il cambio di accordo (pedale sincopato). | `Control Change 64` (valori 0 o 127) relazionato a `Note On`/`Note Off`. | Rileva l'uso scorretto del pedale di risonanza che causa un suono "secco" (rilascio anticipato) o "impastato" (mancato rilascio al cambio accordo). |
| **5. Articolazione e Tocco** | **Legato vs Staccato** | Grado di sovrapposizione temporale tra la fine di una nota e l'inizio della successiva. | Delta temporale tra `Note Off` di nota $N$ e `Note On` di nota $N+1$. | *Legato*: sovrapposizione positiva (tasto premuto prima di rilasciare il precedente). *Staccato*: distacco netto (silenzio tra le due note). Verifica la fedeltà all'articolazione richiesta. |

---

## 2. Nuovi Vincoli e Scenario di Esecuzione (Offline/Post-Run)

Un dettaglio fondamentale emerso è che **il monitor registra gli eventi in tempo reale, ma il feedback viene calcolato ed elaborato solo alla fine dell'esecuzione**.
* **Latenza real-time irrilevante**: Non essendoci la necessità di colorare lo spartito all'istante o interrompere l'utente mentre suona, le prestazioni del monitor non sono più un fattore critico. Anche se l'elaborazione finale richiede 1-2 secondi, l'esperienza utente rimane eccellente.
* **Nessuna installazione client**: L'applicazione deve girare interamente nel browser del dispositivo mobile. Se si sceglie RML, la compilazione avverrà comunque su SWI-Prolog in fase di sviluppo, ma l'esecuzione a runtime sul telefono avverrà tramite **Tau Prolog** (una libreria in puro JavaScript che si installa con `npm` e non richiede installazioni esterne sul dispositivo dell'utente).

---

## 3. Rivelazione su LARVA alla luce dello scenario Post-Run

Con la certezza che la latenza non è più un problema critico, sorge spontanea la domanda: **LARVA diventa utilizzabile per il progetto nel browser?**

### Analisi di Fattibilità per LARVA
Anche se la latenza a fine brano non è un problema, **LARVA rimane strutturalmente inutilizzabile nel browser dell'utente** per motivi legati alla sua tecnologia di base:
1. **Dipendenza da Java e AspectJ**: LARVA compila le sue specifiche in codice Java e fa affidamento su AspectJ per tessere il monitor a livello di bytecode Java. I browser (specialmente quelli mobile) eseguono esclusivamente JavaScript/WebAssembly e non supportano in alcun modo l'esecuzione di una JVM (Java Virtual Machine) sul client.
2. **Architettura Ibrida Client-Server (Unica via teorica)**:
   Per usare LARVA, dovresti implementare un'architettura di rete in cui:
   * Il browser dello smartphone registra la traccia MIDI durante l'esecuzione.
   * A fine esecuzione, la traccia viene inviata via Internet (richiesta HTTP POST) a un server backend Java remoto.
   * Il server remoto elabora la traccia tramite il monitor LARVA e restituisce i risultati JSON al browser.
3. **Limiti dell'Architettura Ibrida per questo Progetto**:
   * **Costi e Complessità di Hosting**: Saresti costretto a configurare, ospitare e pagare un server Java remoto sempre attivo per far funzionare l'applicazione.
   * **Niente Modalità Offline**: Se l'utente non ha connessione internet (es. in un'aula di musica interrata o isolata), l'applicazione non può generare alcun feedback.
   * **Perdita di Coerenza di AspectJ**: AspectJ serve a monitorare le chiamate a metodo di programmi Java complessi a runtime. Usarlo solo per leggere una traccia dati JSON in modalità offline sul server vanifica completamente il valore tecnologico del framework AspectJ di LARVA.

### Confronto con RML (Tau Prolog)
A differenza di LARVA, **RML compilato per Tau Prolog gira interamente sul client (nel browser del telefono)** come semplice libreria JavaScript. L'intera esecuzione e validazione avviene offline sul dispositivo dell'utente, a costo zero di server e senza bisogno di connessione internet.

---

## 4. Esempi Concreti di Implementazione: RML vs TeSSLa

Per comprendere come questi linguaggi rappresentino le regole, analizziamo alcuni esempi pratici basati sulla ricezione di eventi in formato JSON come i seguenti:

```json
{ "type": "note_on", "pitch": 60, "velocity": 85, "timestamp": 1000 }
{ "type": "note_off", "pitch": 60, "timestamp": 1500 }
```

### Esempio 1: Precisione dell'Accordo (Chord Jitter < 30ms)
Vogliamo verificare che due note di un accordo (es. Do4 [60] e Mi4 [64]) siano suonate quasi simultaneamente.

#### In RML (Runtime Monitoring Language)
RML definisce i tipi di eventi basandosi su pattern-matching e permette di specificare vincoli temporali tramite clausole logiche (`with`):
```rml
note_on(p, v, t) matches {type: "note_on", pitch: p, velocity: v, timestamp: t};

ChordJitter = {
  let t1, t2;
  // Le note possono essere suonate in qualsiasi ordine (shuffle: | )
  (note_on(60, _, t1) | note_on(64, _, t2)) 
  with { abs(t1 - t2) < 30 }
}
```
*Spiegazione*: RML cattura i timestamp `t1` e `t2` all'arrivo dei rispettivi `note_on`. Se la differenza assoluta tra i due supera i 30ms, la specifica fallisce indicando un errore di jitter sul report finale.

#### In TeSSLa
```tessla
in note_on: Events[{pitch: Int, velocity: Int}]

def note60 = filter(note_on, (n) => n.pitch == 60)
def note64 = filter(note_on, (n) => n.pitch == 64)

def t60 = time(note60)
def t64 = time(note64)

def time_diff = abs(t60 - t64)
def jitter_error = time_diff > 30
```

---

### Esempio 2: Aderenza alla Dinamica dello Spartito (Velocity)
Vogliamo verificare che una nota segnata come *forte* (es. Do4 [60]) sia suonata con una velocity $\ge 80$.

#### In RML
```rml
note_on(p, v, t) matches {type: "note_on", pitch: p, velocity: v, timestamp: t};

Main = note_on(60, v, _) with { v >= 80 }
```

#### In TeSSLa
```tessla
in note_on: Events[{pitch: Int, velocity: Int}]

def note60 = filter(note_on, (n) => n.pitch == 60)
def dynamic_error = note60.velocity < 80
```

---

### Esempio 3: Sustain Pedal Sincopato (Attivazione entro 200ms dalla nota)
Il pedale deve essere premuto subito dopo la nota (`note_on` a $t_1$, seguito da `pedal_on` a $t_2$ con $0 < t_2 - t_1 < 200\text{ ms}$).

#### In RML
```rml
note_on(p, t1) matches {type: "note_on", pitch: p, timestamp: t1};
pedal_on(t2) matches {type: "pedal_on", timestamp: t2};

PedalSincopato = {
  let t1, t2;
  note_on(_, t1) pedal_on(t2) with { t2 > t1 && t2 - t1 < 200 }
}
```

#### In TeSSLa
```tessla
in note_on: Events[{pitch: Int}]
in pedal_on: Events[Bool] // emette true quando premuto

def last_note_time = time(note_on)
def pedal_delay = time(pedal_on) - last_note_time
def pedal_error = filter(pedal_delay, (d) => d < 0 || d > 200)
```

---

## 5. Stato dell'Arte e Lavori Correlati

Per verificare se esistono ricerche simili sul web, si indicano i riferimenti scientifici e le parole chiave da utilizzare nei motori accademici (Google Scholar, ISMIR Archive):

### Query di Ricerca consigliate
* `"runtime verification" AND ("music" OR "MIDI" OR "piano")`
* `"temporal logic" AND "musical performance"`

### Lavori Correlati Esistenti
1. **Logiche Temporali in Musica**: Molti lavori usano varianti di LTL (Linear Temporal Logic) e STL (Signal Temporal Logic) per formalizzare le regole della composizione e dell'improvvisazione jazz (es. all'Università di Udine), focalizzandosi sulle note "teoriche" corrette piuttosto che sul feedback esecutivo/didattico dell'allievo.
2. **Score Following (IRCAM / Antescofo)**: Sistemi che ascoltano il musicista live e sincronizzano l'elettronica sul suo tempo. Sono pensati per la sincronizzazione delle performance live, non per validare la correttezza a fini didattici post-run.
3. **App Didattiche Commerciali (Simply Piano, Skoove)**: Usano algoritmi di allineamento MIDI proprietari, cablati nel codice dell'app. **La novità scientifica del tuo tirocinio** è l'applicazione di un linguaggio di specifica formale e dichiarativo (RML) disaccoppiato dall'applicazione, che permette regole di verifica flessibili e matematicamente provabili.

---

## 6. Fonti Scientifiche e Bibliografia

1. **Timed Trace Expressions**: L. Ciccone, A. Ferrando, D. Ancona, V. Mascardi. *Timed Trace Expressions*. CILC 2019, Trieste. [Link PDF](http://ceur-ws.org/Vol-2396/paper19.pdf).
2. **Estensione RML Metric Time**: Proposta di ricerca del Prof. Ferrando in collaborazione con D. Ancona. [Link Progetto](https://angeloferrando.github.io/website/thesis.html#fv).
3. **RML Foundational Paper**: D. Ancona, A. Ferrando, L. Franceschini, V. Mascardi. *RML: Theory and practice of a domain specific language for runtime verification*. Computer Languages, Systems & Structures, Vol. 53, 2018. [Link DOI](https://doi.org/10.1016/j.cl.2018.01.005).
