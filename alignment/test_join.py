"""Test del JOIN con difetti piantati a coordinate note.

Non uso una registrazione reale perche' non esiste ancora: genero
un'esecuzione sintetica dallo spartito, rovinata in modo noto, e verifico
che il JOIN trovi esattamente i difetti piantati e non inventi altri.

Se questo test fallisce, il bug e' del JOIN, non del test: la verita' e' nota.
"""
import numpy as np
import partitura as pt

from join import ScoreModel, join, to_jsonl

SCORE = "/score/The Legend of Zelda_ Great Fairy Fountain (Piano Cover) - con dinamiche.musicxml"
PERF_MIDI = "/work/synthetic_perf.mid"

MS_PER_BEAT = 600.0          # 100 bpm, lo spartito non ha indicazione di tempo
TOO_SOFT_FACTOR = 0.7       # sotto il 70% della dinamica attesa = troppo leggera


# Queste due funzioni sono le stesse regole che scrivera' dynamics-adherence.rml
# e pitch-agreement.rml, scritte in Python. Il JOIN non sa cosa sia un errore:
# mette a confronto i campi e lascia che sia RML a concludere. Qui le ripetiamo
# solo per avere un riferimento, finche' il monitor non e' eseguibile.

def too_soft(e):
    # solo noteon: la traccia contiene anche i noteoff, che non hanno rawAttack
    return e["type"] == "noteon" and e["expected"]["dynExplicit"] and \
        e["note"]["rawAttack"] < e["expected"]["dyn"] * TOO_SOFT_FACTOR


def wrong_pitch(e):
    return e["type"] == "noteon" and \
        e["expected"]["pitchDist"] is not None and e["expected"]["pitchDist"] > 0


def build_performance(model):
    """Esegue lo spartito rovinandolo, e restituisce (note, verita'-terreno)."""
    perf, truth = [], {"too_soft": 0, "wrong_pitch": 0, "dropped": 0}

    for i, n in enumerate(model.notes):
        beat = n["onset"]

        # difetto 1: dalla battuta 26 in poi il pianista rallenta del 35%
        t = beat * MS_PER_BEAT
        if beat >= 26:
            t = 26 * MS_PER_BEAT + (t - 26 * MS_PER_BEAT) * 1.35

        # difetto 2: salta 4 note sparse (note mancate)
        if i in (7, 40, 90, 150):
            truth["dropped"] += 1
            continue

        vel = n["expected_dyn"] or 80
        # durata reale della nota, non un valore fisso: un pianolo fatto di
        # note da 50 ms non e' suonabile e l'allineatore non lo distingue
        # da uno spartito pieno di buchi.
        dur_ms = n["duration"] * MS_PER_BEAT

        # difetto 3: le prime 8 note del climax le suona tutte pianissimo
        if 24 <= beat < 26:
            vel = 30
            truth["too_soft"] += 1

        perf.append({"time_ms": t, "pitch": n["pitch"], "velocity": vel,
                     "score_beat": beat, "dur_ms": dur_ms})

        # difetto 4: 3 note sbagliate, con un semitono sopra
        if i in (20, 100, 180):
            perf.append({"time_ms": t + 12, "pitch": n["pitch"] + 1,
                         "velocity": vel, "score_beat": beat, "dur_ms": dur_ms})
            truth["wrong_pitch"] += 1

    perf.sort(key=lambda x: x["time_ms"])
    return perf, truth


def write_midi(model, perf, path):
    """Il file MIDI che matchmaker consuma': stessi eventi, in formato MIDI."""
    from partitura.performance import Performance, PerformedPart

    arr = np.zeros(len(perf), dtype=[("onset_sec", "f8"), ("duration_sec", "f8"),
                                     ("onset_beat", "f8"), ("duration_beat", "f8"),
                                     ("pitch", "i4"), ("velocity", "i4"), ("id", "U16")])
    for i, p in enumerate(perf):
        arr[i] = (p["time_ms"] / 1000.0, p["dur_ms"] / 1000.0,
                  p["time_ms"] / 1000.0, p["dur_ms"] / 1000.0,
                  p["pitch"], p["velocity"], "n%d" % i)

    pp = PerformedPart.from_note_array(arr, id="p")
    pt.save_performance_midi(Performance(performedparts=[pp]), path)


def main():
    print("=== 1. carico lo spartito ===")
    model = ScoreModel.from_musicxml(SCORE)
    print("  note       :", len(model.notes))
    print("  dinamiche  :", len(model.dynamics),
          [d["text"] for d in model.dynamics])
    print("  pedali     :", len(model.pedals))
    print("  beat/div   :", model.beat_grad)
    print("  span pedali:", [round(p["start"], 2) for p in model.pedals[:5]], "...")
    print("  span dinam.:", [(round(d["start"], 2), round(d["end"], 2)) for d in model.dynamics])
    assert len(model.notes) == 216, "le note non sono 216"
    assert len(model.dynamics) == 4, "le dinamiche non sono 4"
    assert len(model.pedals) >= 1, "nessun pedale letto dall'XML"

    print()
    print("=== 2. genero l'esecuzione rovinata ===")
    perf, truth = build_performance(model)
    print("  note suonate   :", len(perf))
    print("  difetti piantati: troppo leggere %d, pitch sbagliati %d, saltate %d"
          % (truth["too_soft"], truth["wrong_pitch"], truth["dropped"]))
    write_midi(model, perf, PERF_MIDI)

    print()
    print("=== 3. allineo con matchmaker ===")
    from matchmaker import Matchmaker
    mm = Matchmaker(score_file=SCORE, performance_file=PERF_MIDI,
                    input_type="midi", method="pthmm", processor="pianoroll")
    list(mm.run())
    path = np.asarray(mm.score_follower.alignment_path)
    print("  alignment_path:", path.shape)
    print("  battute coperte: %.2f .. %.2f" % (path[0].min(), path[0].max()))

    print()
    print("=== 4. JOIN ===")
    events = join(model, perf, path)
    print("  eventi annotati:", len(events))
    for e in events[:2]:
        print("  esempio:", to_jsonl([e]))

    found_soft = sum(1 for e in events if too_soft(e))
    found_wrong = sum(1 for e in events if wrong_pitch(e))
    print()
    print("  troppo leggere  : trovati %d, piantati %d" % (found_soft, truth["too_soft"]))
    print("  pitch sbagliati : trovati %d, piantati %d" % (found_wrong, truth["wrong_pitch"]))

    print()
    print("=== 5. le note che RML giudicherebbe sbagliate ===")
    for e in [e for e in events if wrong_pitch(e)][:10]:
        print("  suonata %d, attesa %d (distanza %d semitoni), battuta %.1f, misura %d"
              % (e["note"]["number"], e["expected"]["pitch"],
                 e["expected"]["pitchDist"],
                 e["position"]["beat"], e["position"]["measure"]))
    print("  (se %d righe e non %d, il problema e' altrove)"
          % (len([e for e in events if wrong_pitch(e)]), truth["wrong_pitch"]))

    # la traccia che andra' in pasto al monitor RML
    with open("/work/joined.jsonl", "w", encoding="utf-8") as f:
        f.write(to_jsonl(events) + "\n")
    print()
    print("  traccia per RML scritta in /work/joined.jsonl")

    print()
    print("=== 6. il rallentamento e' visibile? ===")
    # dalla battuta 26 in poi il tempo e' allungato del 35%: il delta
    # rispetto al previsto deve crescere.
    late = [e["timing"]["deltaMs"] for e in events if e["position"]["beat"] > 26]
    early = [e["timing"]["deltaMs"] for e in events if e["position"]["beat"] < 20]
    if late and early:
        print("  delta medio prima della battuta 20 : %+.0f ms" % (sum(early) / len(early)))
        print("  delta medio dopo la battuta 26     : %+.0f ms" % (sum(late) / len(late)))
        assert sum(late) / len(late) > sum(early) / len(early), \
            "il rallentamento non si vede nei tempi"

    assert found_wrong == truth["wrong_pitch"], \
        "il JOIN ha perso o inventato note sbagliate"
    assert found_soft == truth["too_soft"], \
        "il JOIN ha perso o inventato note troppo leggere"

    print()
    print("TEST COMPLETATO")


if __name__ == "__main__":
    main()
