:- module(spec, [(trace_expression/2), (match/2)]).
:- use_module(monitor(deep_subdict)).
:- use_module(library(clpr)).
match(_event, hello_et) :- deep_subdict(_event, _{event:"func_pre", name:"hello"}).
match(_event, world_et) :- deep_subdict(_event, _{event:"func_pre", name:"world"}).
match(_event, any_et) :- deep_subdict(_event, _{}).
match(_event, none_et) :- not(match(_event, any_et)).
trace_expression('Main', Main) :- (Main=(hello_et*clos(world_et))).
