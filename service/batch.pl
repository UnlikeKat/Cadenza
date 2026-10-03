%% batch.pl ' le sette specifiche in un solo processo SWI-Prolog.
%%
%% Perch' esiste: il server lancia sette processi separati, uno per metrica.
%% Su un'istanza piccola l'avvio di Prolog costa circa un secondo ciascuno: sette
%% secondi fissi su ogni richiesta, anche quando l'allineamento ' istantaneo.
%% Misurato con mezza CPU e la stessa traccia: sette processi 1958 ms, un
%% processo 604 ms.
%%
%% Non ' una riforma del metodo: le clausole sono quelle che produce
%% rml-compiler, cambia solo quante volte si avvia l'interprete. I verdetti
%% devono restare identici, ed ' quello che va verificato a ogni modifica.
%%
%% Ogni specifica compilata dichiara il modulo `spec`, che non pu' essere
%% ridefinito finch' resta caricato: fra una specifica e l'altra il file va
%% scaricato, altrimenti il caricamento successivo muore con "No permission to
%% redefine module `spec'". Non si tentano retractall, perch' le clausole che
%% use_module porta in `user` sono statiche e non modificabili a runtime.
%%
%% `verify/2`, `verify/3` e `verify_end/1` arrivano da monitor.pl di RML@DIBRIS
%% (MIT, RML_DOCS/RML_TESTS/monitor/LICENSE): quel file ' uno script con
%% `:- initialization(main)`, quindi importarlo eseguirebbe il main e farebbe le
%% verifiche da solo. Sono le tre sole procedure servono (monitor.pl righe
%% 83-116), in versione silenziosa: il server vuole il codice di uscita, non
%% l'elenco degli eventi.
%%
%% I nomi delle metriche li passa Python, alternati al percorso del file: sono
%% gi' noti l', e ricavarli quiparsingando il percorso ' fragile.
%%
%% Uso: swipl -O -p monitor=<dir> batch.pl -- <traccia.jsonl> <nome1> <spec1.pl> [<nome2> <spec2.pl> ...]
%% Una riga per specifica: "<nome> <exit>", dove 0 = conforme, 1 = violata,
%% 2 = errore.

:- use_module(library(http/json)).
:- use_module(monitor(trace_expressions_semantics)).
:- initialization(main).

main :-
    current_prolog_flag(argv, [TraceFile | Rest]),
    Rest \== [],
    pair_up(Rest, Pairs),
    open_trace(TraceFile, Stream),
    forall(member(Name-Spec, Pairs), run_one(Name, Spec, Stream)),
    close(Stream),
    halt(0).

main :-
    format("batch.pl: attesi <traccia.jsonl> poi coppie <nome> <specifica.pl>~n"),
    halt(2).

pair_up([], []).
pair_up([Name, Spec | Rest], [Name-Spec | Pairs]) :-
    pair_up(Rest, Pairs).

open_trace(TraceFile, Stream) :-
    catch(open(TraceFile, read, Stream), Error, trace_error(2, Error)).

%% Una specifica: carica, prendi l'espressione, verifica, riporta, scarica.
run_one(Name, SpecFile, Stream) :-
    seek(Stream, 0, bof, _),
    (   catch(( load_spec(SpecFile, TraceExp), verify(Stream, TraceExp) -> Exit = 0 ; Exit = 1 ),
              Error, ( print_message(error, Error), Exit = 2 ))
    ->  true
    ;   Exit = 2
    ),
    unload_spec(SpecFile),
    format("~w ~w~n", [Name, Exit]).

load_spec(SpecFile, TraceExp) :-
    use_module(SpecFile),
    trace_expression(_, TraceExp).

unload_spec(SpecFile) :-
    catch(unload_file(SpecFile), _, true).

trace_error(Exit, _) :- format("~w ~w~n", ['monitor', Exit]).

%% '' da monitor.pl (RML@DIBRIS, MIT), versione silenziosa ''''''''''''''

verify_end(TraceExp) :- may_halt(TraceExp) -> true ; fail.

verify(TraceStream, TraceExp) :-
    catch(
        ( reject -> \+ verify(TraceStream, TraceExp, 1) ; verify(TraceStream, TraceExp, 1) ),
        error(syntax_error(json(illegal_json)), _),
        fail).

verify(TraceStream, TraceExp, EventId) :-
    json_read_dict(TraceStream, Event, [end_of_file(@(eof))]),
    (   Event == @(eof) -> verify_end(TraceExp)
    ;   next(TraceExp, Event, NewTraceExp)
    ->  NextEventId is EventId + 1,
        verify(TraceStream, NewTraceExp, NextEventId)
    ;   fail
    ).

%% Senza --reject l'esecuzione non conforme ' un normale fallimento.
reject :- fail.
