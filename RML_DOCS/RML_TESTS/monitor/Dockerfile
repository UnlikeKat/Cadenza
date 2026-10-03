# Servizio singolo: UN monitor RML, UNA specifica.
#
# PERCHE' UN SERVIZIO PER METRICA E NON UNO SOLO CON TUTTE E SETTE.
# next/3 del monitor risolve match/2 nel modulo `user`, dove viene caricata la
# specifica. Caricandone due nella stessa VM si ottiene:
#   import/1: No permission to import m_chord_jitter:match/2 into user
#   (already imported from m_pitch_range)
# Non e' una scelta di comodo: un processo SWI-Prolog puo' reggerne una sola,
# e Render espone una sola porta per servizio. Servono sette servizi.
#
# USO
#   docker build -f RML_DOCS/RML_TESTS/monitor/Dockerfile -t cadenza-monitor .
#   docker run -e METRIC=pitch-range -e PORT=8080 -p 8080:8080 cadenza-monitor
#
#   POST / con un evento JSON  ->  {"error":false} traccia ancora conforme
#                                 {"error":true}  l'evento ha violato la specifica
#   GET  / risponde 500: l'handler chiama http_read_json_dict e una richiesta
#        senza corpo fallisce. Va usato solo POST.
#
# LE TRE COSE CHE HANNO FATTO FALLIRE QUESTA IMMAGINE, una per una
#  - base `swipl/swipl:stable`: quel repo non esiste su Docker Hub.
#  - `http_monitor.pl` va invocato con path ASSOLUTO, altrimenti swipl non lo
#    trova e dice source_sink does not exist.
#  - http_server/2 RITORNA invece di bloccare: il main goal finisce e Prolog fa
#    halt, uccidendo il server appena avviato. Da qui -g 'sleep(...)' che tiene
#    vivo il processo.
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends swi-prolog-nox \
 && rm -rf /var/lib/apt/lists/*

COPY RML_DOCS/RML_TESTS/monitor/ /opt/rml/
COPY RML_DOCS/RML_TESTS/metrics/*.pl /opt/specs/

ENV METRIC=pitch-range
ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "exec swipl -O -g 'sleep(31536000.0)' -p monitor=/opt/rml /opt/rml/http_monitor.pl -- /opt/specs/${METRIC}.pl ${PORT}"]