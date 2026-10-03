"""JOIN: unisce cio' che ha suonato il pianista e cio' che chiede lo spartito.

RML legge un solo flusso di eventi e non ha un operatore di join, quindi questa
traduzione va fatta in Python prima. Il risultato e' una traccia in cui ogni
nota suonata porta dentro di se' cosa ci si aspettava di sentire in quel punto.

Il JOIN NON calcola il verdetto: rende visibile nello stream le aspettative,
cosi' che RML possa scrivere regole sugli andamenti (quello che sa fare).
"""

import bisect
import json

import numpy as np
import partitura as pt

# dinamica MusicXML -> velocity MIDI (stessa mappa di add_dynamics.py)
DYN_VELOCITY = {
    "ppp": 16, "pp": 33, "p": 49, "mp": 64, "mf": 80,
    "f": 96, "ff": 112, "fff": 127,
}


class ScoreModel:
    """Cosa lo spartito si aspetta, in ogni istante della sua durata.

    Tutte le posizioni sono espresse in BATTUTE (beat), che e' l'unita' che
    matchmaker usa nell'allineamento. Le conversioni dalle unita' interne di
    partitura sono fatte una volta sola, in costruzione.
    """

    def __init__(self, notes, dynamics, pedals, beat_grad):
        self.notes = notes            # lista di dict
        self.dynamics = dynamics      # lista di dict: start, end, text, velocity
        self.pedals = pedals          # lista di dict: start, end
        self.beat_grad = beat_grad    # beat per divisione

        # indici per la ricerca: gli span sono disgiunti e ordinati
        self._dyn_starts = [d["start"] for d in self.dynamics]
        self._dyn_ends = [d["end"] for d in self.dynamics]
        self._ped_starts = [p["start"] for p in self.pedals]

        # gli attacchi dello spartito, per risalire dalla battuta al gruppo
        self._onsets = sorted({n["onset"] for n in notes})
        # i pitch che lo spartito chiede di premere insieme in ciascun istante:
        # serve a nominare QUALI note formano l'accordo, non quante sono
        self._group_pitches = {}
        for n in notes:
            # lista, non set: due voci che suonano la stessa nota sono due
            # note distinte da premere, e un set le fonderebbe in una
            self._group_pitches.setdefault(n["chordId"], []).append(n["pitch"])

    # ---------------------------------------------------------------- lettura

    @classmethod
    def from_musicxml(cls, path):
        score = pt.load_score(path)
        part = score[0]

        # partitura lavora in "t" (divisions). La nostra unita' e' la "beat" di
        # note_array, che in 2/2 NON coincide con la quartina: nel file di prova
        # la nota 31.75 in beat sta a 63.5 in quarter. Misuro il gradiente invece
        # di indovinarlo dal time signature.
        beat_grad = float(part.beat_map(1.0)) - float(part.beat_map(0.0))
        assert beat_grad > 0, "conversione t -> beat non riuscita"

        # note
        na = part.note_array()
        by_id = {str(r["id"]): r for r in na}
        notes = []
        for n in part.notes:
            r = by_id.get(str(n.id))
            if r is None:
                continue
            notes.append({
                "id": str(n.id),
                "pitch": int(r["pitch"]),
                "onset": float(r["onset_beat"]),
                "duration": float(r["duration_beat"]),
                "voice": int(r["voice"]) if "voice" in r.dtype.names else 0,
            })
        notes.sort(key=lambda x: (x["onset"], x["pitch"]))

        # Gruppi di note simultanee NELLO SPARTITO: due note con lo stesso
        # attacco sono premute nello stesso istante, quindi vanno insieme.
        # L'id deriva dal solo spartito, mai dall'esecuzione: se lo ricavassi da
        # quando sono suonate le note, la regola "le note dell'accordo devono
        # arrivare insieme" risulterebbe vera per costruzione.
        onsets = sorted({n["onset"] for n in notes})
        onset_id = {o: i for i, o in enumerate(onsets)}
        group_pitches = {}
        for n in notes:
            n["chordId"] = onset_id[n["onset"]]
            # lista, non set: due voci sulla stessa nota sono due note distinte
            group_pitches.setdefault(n["chordId"], []).append(n["pitch"])
        for n in notes:
            mates = list(group_pitches[n["chordId"]])
            mates.remove(n["pitch"])
            n["chordMates"] = sorted(mates)

        # dinamiche: partitura le da' in t, le convertiamo in beat
        dynamics = []
        for d in part.dynamics:
            dynamics.append({
                "start": float(d.start.t) * beat_grad,
                "end": float(d.end.t) * beat_grad,
                "text": d.text,
                "velocity": DYN_VELOCITY.get(d.text, 80),
            })
        dynamics.sort(key=lambda x: x["start"])

        # pedali: partitura non li espone, li leggiamo dall'XML
        pedals = cls._read_pedals(path, beat_grad)

        # aggancia a ogni nota la dinamica che la copre
        for n in notes:
            e = cls._expected_at(dynamics, pedals, n["onset"])
            n["expected_dyn"] = e["dyn"]
            n["expected_pedal"] = e["pedal"]

        return cls(notes, dynamics, pedals, beat_grad)

    @staticmethod
    def _read_pedals(path, beat_grad):
        """<pedal type='start'|'stop'> -> span in beat.

        In MusicXML il pedale sta dentro <direction><direction-type><pedal/>, quindi
        non e' un figlio diretto di <measure>: per sapere *quando* accade devo
        camminare i figli della misura in ordine, contando le durate delle note
        gia' incontrate. Le note con <chord/> non fanno avanzare l'orologio.

        <backup> e' il pezzo che non si vede ma conta: questo spartito ha due
        voci, e la seconda riparte indietro con un <backup><duration>. Senza
        gestirlo il cursore non torna mai indietro e arriva a fine brano al
        doppio: gli ultimi span di pedale finivano a battuta 64 su uno spartito
        che ne ha 32, e la metà delle pressioni cadeva fuori dal brano.

        beat_grad = beat per divisione, misurato da partitura.
        """
        from lxml import etree

        tree = etree.parse(path)
        root = tree.getroot()

        pedals, offset, open_at = [], 0.0, None
        for m in root.findall(".//measure"):
            cursor = 0.0
            for child in m:
                if child.tag == "note":
                    if child.find("chord") is None:
                        d = child.findtext("duration")
                        if d:
                            cursor += float(d)
                elif child.tag == "backup":
                    d = child.findtext("duration")
                    if d:
                        cursor -= float(d)
                elif child.tag == "direction":
                    for p in child.findall(".//pedal"):
                        at = (offset + cursor) * beat_grad
                        if p.get("type") == "start":
                            open_at = at
                        elif p.get("type") == "stop" and open_at is not None:
                            pedals.append({"start": open_at, "end": at})
                            open_at = None
            offset += cursor
        if open_at is not None:
            pedals.append({"start": open_at, "end": float("inf")})
        pedals.sort(key=lambda x: x["start"])

        # Span contigui vanno uniti. Lo spartito prescrive "pedale giù fino alla
        # battuta 2, su alla 2, di nuovo giù alla 2": due tag <pedal> di fila
        # senza un istante di pausa. Non e' che il pedale si alza e si riabbassa,
        # e' un pedale continuo. Senza questa unione i due eventi si
        # sovrapponono nel tempo e la traccia presenta una pressione mentre il
        # pedale era ancora premuto: la metrica leggerebbe un doppio tocco dove
        # il pianista ne ha dato uno solo.
        merged = []
        for p in pedals:
            if merged and p["start"] <= merged[-1]["end"]:
                merged[-1]["end"] = max(merged[-1]["end"], p["end"])
            else:
                merged.append(dict(p))
        return merged

    # ------------------------------------------------------------- le query

    @staticmethod
    def _expected_at(dynamics, pedals, beat):
        dyn = None
        for d in dynamics:
            if d["start"] <= beat < d["end"]:
                dyn = d
                break
        pedal = any(p["start"] <= beat < p["end"] for p in pedals)
        return {
            "dyn": dyn["velocity"] if dyn else None,
            "dyn_text": dyn["text"] if dyn else None,
            "pedal": pedal,
        }

    def expected_at(self, beat):
        return self._expected_at(self.dynamics, self.pedals, beat)

    def measure_at(self, beat):
        """Numero di misura 1-indexato, dalle battute e dal tempo."""
        return int(beat // 2) + 1  # 2/2: due battute per misura

    def score_pitches_at(self, beat, tol=0.25):
        """Quali note dello spartito dovrebbero suonare in questa battuta.

        Non guardo solo gli attacchi: una nota lunga che e' iniziata prima
        e' ancora attiva, e se l'allineamento ha qualche decina di ms di
        scarto e' l'attacco a essere disallineato, non la sua fine.
        """
        return [n["pitch"] for n in self.notes
                if n["onset"] - tol <= beat < n["onset"] + n["duration"]]

    def chord_at(self, beat):
        """Il gruppo di note simultanee dello spartito che copre questa battuta.

        Serve a chord-jitter: due note con lo stesso chordId sono, secondo lo
        spartito, un accordo e quindi devono arrivare insieme.
        """
        if not self._onsets:
            return None
        i = bisect.bisect_right(self._onsets, beat) - 1
        return i if i >= 0 else None

    def chord_mates(self, beat, pitch):
        """Gli ALTRI pitch che lo spartito chiede di premere nello stesso istante.

        Vuoto se il gruppo non contiene che questa nota: e' il caso in cui la
        nota non ha compagni e puo' arrivare quando le pare.

        Non si conta quante note ha il gruppo, si nomina chi ci sta dentro.
        E' la differenza che rende la regola generalizzabile: un accordo a 3
        note e uno a 2 si comportano allo stesso modo, senza casi speciali.
        """
        cid = self.chord_at(beat)
        if cid is None:
            return []
        mates = list(self._group_pitches.get(cid, ()))
        # si toglie UNA sola occorrenza: se due voci suonano la stessa nota,
        # l'altra resta compagna e va comunque premuta
        if pitch in mates:
            mates.remove(pitch)
        return sorted(mates)

    def nearest(self, pitches, pitch):
        """(pitch atteso piu' vicino, distanza in semitoni).

        Serve perche' il monitor RML confronta i campi con deep_subdict/2, che
        sulle liste lavora elemento per elemento a lunghezza uguale: non puo'
        esprimere "numero appartiene a questa lista". La distanza si puo' pero':
        e' un numero, e RML la confronta con un semplice `with`.
        """
        if not pitches:
            return None, None
        best = min(pitches, key=lambda q: (abs(q - pitch), q - pitch))
        return best, abs(pitch - best)


# --------------------------------------------------------------- il JOIN


def join(model, performed_notes, alignment_path, control_changes=None):
    """Restituisce la traccia annotata, evento per evento.

    performed_notes  : lista di dict {time_ms, dur_ms, pitch, velocity}
    alignment_path   : array (2, T) di matchmaker: riga 0 = battute dello
                       spartito, riga 1 = tempi dell'esecuzione
    control_changes  : lista di dict {time_ms, controller, value}. Opzionale:
                       se manca non viene emesso alcun controlchange.

    Vengono emessi tre tipi di evento, perche' le metriche RML hanno bisogno
    di tutti e tre: noteon per l'attacco, noteoff per il rilascio (serve a
    misurare la legatura) e controlchange per il pedale.
    """
    path = np.asarray(alignment_path, dtype=float)
    score_beats, perf_times = path[0], path[1]

    # matchmaker puo' riportare i tempi dell'esecuzione in un'altra unita' dei
    # millisecondi che usiamo noi (nel caso, secondi). La scala si ricava dal
    # fondo: entrambi gli estremi sono la fine del brano.
    # Senza questo, np.interp manda tutto all'ultima colonna e il JOIN dice
    # che ogni nota e' sbagliata.
    if performed_notes and perf_times.max() > 0:
        perf_ms_max = max(p["time_ms"] for p in performed_notes)
        scale = perf_ms_max / perf_times.max()
        if abs(scale - 1.0) > 0.05:
            perf_times = perf_times * scale

    order = np.argsort(perf_times)
    pt_sorted, sb_sorted = perf_times[order], score_beats[order]

    events = []
    for p in performed_notes:
        t = p["time_ms"]

        # battuta dello spartito in cui e' caduta la nota
        beat = float(np.interp(t, pt_sorted, sb_sorted))

        # quando la stessa battuta era prevista: il ritardo
        expected_ms = float(np.interp(beat, sb_sorted, pt_sorted))

        e = model.expected_at(beat)
        expected_pitches = model.score_pitches_at(beat)
        near_pitch, pitch_dist = model.nearest(expected_pitches, p["pitch"])
        chord_id = model.chord_at(beat)
        # i compagni d'accordo si cercano con il pitch che lo spartito si
        # ASPETTA, non con quello suonato: se il pianista ha sbagliato intonazione
        # e' la nota giusta che va cercata fra le altre da premere insieme
        chord_mates = model.chord_mates(beat, near_pitch)

        expected = {
            # null se lo spartito non porta una dinamica in quel punto:
            # la regola RML deve poter distinguere "suona piano" da
            # "qui non c'e' niente scritto".
            "dyn": e["dyn"],
            "dynExplicit": e["dyn"] is not None,
            "dynText": e["dyn_text"],
            "pedal": e["pedal"],
            # la lista completa resta per leggere la traccia a mano;
            # pitch + pitchDist sono la forma che RML puo' confrontare.
            "pitch": near_pitch,
            "pitchDist": pitch_dist,
            "pitches": expected_pitches,
            # gruppo di accordo preso dallo spartito, non dall'esecuzione:
            # l'istante in partitura e CHI sono le altre note da premervi con lui
            "chordId": chord_id,
            "chordMates": chord_mates,
        }

        events.append({
            "type": "noteon",
            "note": {"number": p["pitch"], "rawAttack": p["velocity"]},
            "timestamp": t,
            "position": {"beat": round(beat, 4), "measure": model.measure_at(beat)},
            "expected": expected,
            "timing": {"deltaMs": round(t - expected_ms, 2)},
        })

        # il rilascio porta con se' gli stessi campi: se la regola vuole
        # confrontare la dinamica di una nota, la cerca sul rilascio anche
        if p.get("dur_ms"):
            events.append({
                "type": "noteoff",
                "note": {"number": p["pitch"]},
                "timestamp": t + p["dur_ms"],
                "position": {"beat": round(beat, 4),
                             "measure": model.measure_at(beat)},
                "expected": expected,
                "timing": {"deltaMs": round(t + p["dur_ms"] - expected_ms, 2)},
            })

    # il pedale: solo quello che l'esecuzione ha davvero premuto, annotato con
    # quello che lo spartito chiedeva in quel punto. Non si inventano eventi.
    for c in control_changes or []:
        t = c["time_ms"]
        beat = float(np.interp(t, pt_sorted, sb_sorted))
        e = model.expected_at(beat)
        events.append({
            "type": "controlchange",
            "controller": c["controller"],
            "value": c["value"],
            "timestamp": t,
            "position": {"beat": round(beat, 4), "measure": model.measure_at(beat)},
            "expected": {
                "dyn": None,
                "dynExplicit": False,
                "dynText": None,
                "pedal": e["pedal"],
                "pitch": None,
                "pitchDist": None,
                "pitches": [],
                "chordId": model.chord_at(beat),
                "chordMates": [],
            },
            "timing": {},
        })

    events.sort(key=lambda x: x["timestamp"])
    return events


def to_jsonl(events):
    return "\n".join(json.dumps(e) for e in events)
