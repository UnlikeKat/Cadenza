%% batch.pl Ã¢â‚¬â€ le sette specifiche in un solo processo SWI-Prolog.
%%
%% PerchÃƒÂ© esiste: il server lancia sette processi separati, uno per metrica.
%% Su un'istanza piccola l'avvio di Prolog costa circa un secondo ciascuno: sette
%% secondi fissi su ogni richiesta, anche quando l'allineamento ÃƒÂ¨ istantaneo.
%% Qui l'infrastruttura di monitoraggio si carica una volta sola e le specifiche
%% si eseguono in sequenza.
%%
%% Non ÃƒÂ¨ una riforma del metodo: le clausole sono quelle che produce
%% rml-compiler, cambia solo quante volte si avvia l'interprete. I verdetti
%% devono restare identici, ed ÃƒÂ¨ quello che va verificato a ogni modifica.
%%
%% Ogni specifica compilata dichiara il modulo `spec`, che non puÃƒÂ² essere
%% ridefinito finchÃƒÂ© resta caricato: fra una specifica e l'altra il file va
%% scaricato, altrimenti la seconda caricamento muore con "No permission to
%% redefine module `spec'". Non si tentano retractall, perchÃƒÂ© le clausole che
%% use_module porta in `user` sono statiche e non modificabili a runtime.
%%
%% `verify/2`, `verify/3` e `verify_end/1` arrivano da monitor.pl di RML@DIBRIS
%% (MIT, RML_DOCS/RML_TESTS/monitor/LICENSE): quel file ÃƒÂ¨ uno script con
%% `:- initialization(main)`, quindi non si puÃƒÂ² importare senza eseguire il
%% main e fare le sette verifiche da sole. Sono le tre sole procedure servono
%% (monitor.pl, righe 83-116), in versione silenziosa: il server non vuole
%% l'elenco degli eventi, solo il codice di uscita.
%%
%% Uso: swipl -O -p monitor=<dir> batch.pl -- <traccia.jsonl> <spec1.pl> [<spec2.pl> ...]
%% Una riga per specifica: "<nome> <exit>", dove 0 = conforme, 1 = violata,
%% 2 = errore. I nomi li decide Python, non questo file.

:- use_module(library(http/json)).
:- use_module(monitor(trace_expressions_semantics)).
:- initialization(main).

main :-
    %% Con il separatore `--` il nome dello script non finisce in argv: gli
    %% argomenti arrivano puliti, come in monitor.pl.
    current_prolog_flag(argv, [TraceFile | Specs]),
    open_trace(TraceFile, Stream),
    forall(member(Spec, Specs), run_one(Spec, Stream)),
    close(Stream),
    halt(0).

main :-
    format("batch.pl: attesi <traccia.jsonl> e almeno una specifica~n"),
    halt(2).

open_trace(TraceFile, Stream) :-
    catch(open(TraceFile, read, Stream), Error, trace_error(2, Error)).

%% Una specifica: carica, prendi l'espressione, verifica, riporta, scarica.
run_one(SpecFile, Stream) :-
    spec_name(SpecFile, Name),
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

spec_name(SpecFile, Name) :-
    file_base_name(SpecFile, '.pl', Name).

trace_error(Exit, _) :- format("~w ~w~n", ['monitor', Exit]).

%% Ã¢â€â‚¬Ã¢â€â‚¬ da monitor.pl (RML@DIBRIS, MIT), versione silenziosa Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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

%% Senza --reject l'esecuzione non conforme ÃƒÂ¨ un normale fallimento: se
%% --reject fosse attivo la traccia respinta dovrebbe risultare conforme.
reject :- fail.
