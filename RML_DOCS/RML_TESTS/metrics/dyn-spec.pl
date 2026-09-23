:- module(spec, [(trace_expression/2), (match/2)]).
:- use_module(monitor(deep_subdict)).
:- use_module(library(clpr)).
match(_event, noteOn_et(Num, Vel)) :- deep_subdict(_event, _{type:"noteon", note:_{number:Num, rawAttack:Vel}}).
match(_event, noteOn_et) :- match(_event, noteOn_et(_, _)).
match(_event, forteNote_et(Num, Vel)) :- match(_event, noteOn_et(Num, Vel)),
	{(Vel >= 80)}.
match(_event, forteNote_et) :- match(_event, forteNote_et(_, _)).
match(_event, any_et) :- deep_subdict(_event, _{}).
match(_event, none_et) :- not(match(_event, any_et)).
trace_expression('Main', Main) :- (Main=star(((noteOn_et>>forteNote_et);1))).
