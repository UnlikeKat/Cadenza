:- module(spec, [(trace_expression/2), (match/2)]).
:- use_module(monitor(deep_subdict)).
:- use_module(library(clpr)).
match(_event, noteOn_et(Num)) :- deep_subdict(_event, _{type:"noteon", note:_{number:Num}}),
	{((Num >= 21),(Num =< 108))}.
match(_event, noteOff_et(Num)) :- deep_subdict(_event, _{type:"noteoff", note:_{number:Num}}),
	{((Num >= 21),(Num =< 108))}.
match(_event, noteOn_et) :- match(_event, noteOn_et(_)).
match(_event, noteOff_et) :- match(_event, noteOff_et(_)).
match(_event, noteEvent_et) :- match(_event, noteOn_et).
match(_event, noteEvent_et) :- match(_event, noteOff_et).
match(_event, any_et) :- deep_subdict(_event, _{}).
match(_event, none_et) :- not(match(_event, any_et)).
trace_expression('Main', Main) :- (Main=star(noteEvent_et)).
