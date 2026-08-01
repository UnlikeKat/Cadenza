# Object-oriented interfaces

Contenuti completi estratti dal sito ufficiale RMLatDIBRIS, senza riassumere le sezioni originali incluse in questo file.

## Fonti incluse
- Object-oriented interfaces: https://rmlatdibris.github.io/examples/ooi.html
- Solution: iterator: https://rmlatdibris.github.io/examples/solution-iter.html
- Solution: iterators: https://rmlatdibris.github.io/examples/solution-iters.html
- Solution: lists and iterators: https://rmlatdibris.github.io/examples/solution-lists-iters.html

---

## Object-oriented interfaces

Fonte: https://rmlatdibris.github.io/examples/ooi.html

## Iterators

The specifications are based on the following event types:
* `hasNext(b)`: boolean `b` has been returned by `hasNext`;
* `next`: `next` has been called;

### Single iterator

```js
// iterator: single iterator, strong version

// enforces best practice:
//   hasNext can only be called once per try
//   hasNext(true) requires next to be called
//   the iterator must be fully consumed

Main = (hasNext(true) next)* hasNext(false);
```
#### Exercise
Modify *iterator* above to define a weak version which
verifies only that events of type `next` occur after events of type `hasNext(true)` and
that the result of 'hasNext' can change only after `next`;
multiple consecutive occurrences of events of type `hasNext` are allowed, as long as they are coherent, and
the iterator is not required to be fully consumed.
(see the [solution](https://rmlatdibris.github.io/examples/solution-iter.html))

### Multiple iterators

To verify multiple iterators, the following additional event type needs to be defined:
* `newIter(id)`: a new iterator `id` has been created;

```js
// iterators: multiple iterators, strong version

// works with traces generated from iterators.js
// enforces best practice: hasNext can only be called once per try, hasNext(id,true) requires next(id) to be called,
// iterators must be fully consumed

Main = {let id; newIter(id)(Iterator<id>|Main)}?;
Iterator<id> = (hasNext(id,true) next(id))* hasNext(id,false);
```

#### Exercise
Modify *iterators* above to define a weak version which
verifies only that events of type `next(id)` occur after events of type `hasNext(id,true)` and
that the result of `hasNext(id,res)` can change only after `next(id)`;
multiple consecutive occurrences of events of type `hasNext` are allowed, as long as they are coherent, and
iterators are not required to be fully consumed.
(see the [solution](https://rmlatdibris.github.io/examples/solution-iters.html))

*Hint*: a new event type `freeIter(id)` is needed to ensure that iterator `id` has been deallocated and can no longer be used, otherwise the generated
monitor cannot stop verifying the behavior of iterator `id`.

### Multiple iterators over a single list

To verify multiple iterators over a single list, the following additional event type needs to be defined:
* `list`: the list has been structurally modified (its lenght has been changed);

```js
// list_iterators: multiple iterators over a single list, weak version

// verifies only that next(id) occurs after hasNext(id,true) and that the result of hasNext(id,res) can change only after next(id)
// multiple consecutive occurrences of hasNext are allowed, as long as they are coherent
// the iterator is not required to be fully consumed

hasNext_or_next(id) matches hasNext(id,_) | next(id);
iterator matches newIter(_) | hasNext_or_next(_) | freeIter(_);
not_newIter not matches newIter(_);
list_or_iter(id) matches hasNext_or_next(id) | freeIter(id) | list;

Main = ListSafe /\ iterator >> Iterators;

ListSafe = not_newIter* {let id; newIter(id)(ListSafeIter<id> /\ ListSafe)}?;
ListSafeIter<id> = list_or_iter(id) >> hasNext_or_next(id)* list* freeIter(id) all;

// specification already defined
Iterators = {let id; newIter(id)(Iterator<id> freeIter(id)|Iterators)}?;
Iterator<id> = ((hasNext(id,true)+ next(id))* hasNext(id,false)+)!;
```
The intersection and filter operators allow a compositional definition:
`Iterators` corresponds to `Main` as defined in [iterators](https://rmlatdibris.github.io/examples/solution-iters.html#solution).


#### Exercise
Modify [*list_iterators*](#multiple-iterators-over-a-single-list) above to specify multiple iterators over multiple lists (weak version).
(see the [solution](https://rmlatdibris.github.io/examples/solution-lists-iters.html))

*Hint*: assumes that now `list` and `newIter` have the following semantics:

* `list(id)`: list id has been structurally modified (its lenght has been changed);
* `newIter(lsid,itid)`: a new iterator `itid` has been created for list `lsid`;

Consequently, extends the definition of event type `list_or_iter` and of specifications
`ListSafe` and `ListSafeIter`.

---

## Solution: iterator

Fonte: https://rmlatdibris.github.io/examples/solution-iter.html

Modify [*iterator*](https://rmlatdibris.github.io/examples/ooi.html#single-iterator) above to define a weak version which
verifies only that events of type `next` occur immediately after events of type `hasNext(true)` and
that the result of 'hasNext' can change only after `next`;
multiple consecutive occurrences of events of type `hasNext` are allowed, as long as they are coherent and
the iterator is not required to be fully consumed.

## Solution

```js 
// iterator2: single iterator, weak version

// verifies only that next occurs immediately after hasNext(true) and that the result of hasNext can change only after next
// multiple consecutive occurrences of hasNext are allowed, as long as they are coherent
// the iterator is not required to be fully consumed

Main = Iterator!;
Iterator = (hasNext(true)+ next)* hasNext(false)+;
```
The definition exploits the **prefix closure operator** `!` for readability; an equivalent, but more involved, specification
can be given with the union operator.

```js 
Main = hasNext(true)+ (next Main)? \/ hasNext(false)*;
```

---

## Solution: iterators

Fonte: https://rmlatdibris.github.io/examples/solution-iters.html

Modify [*iterators*](https://rmlatdibris.github.io/examples/ooi.html#multiple-iterators) above to define a weak version which
verifies only that events of type `next(id)` occur after events of type `hasNext(id,true)` and
that the result of `hasNext(id,res)` can change only after `next(id)`;
multiple consecutive occurrences of events of type `hasNext` are allowed, as long as they are coherent, and
iterators are not required to be fully consumed.

## Solution

```js 
// iterators2: multiple iterators, weak version

// verifies only that next(id) occurs after hasNext(id,true) and that the result of hasNext(id,res) can change only after next(id)
// multiple consecutive occurrences of hasNext are allowed, as long as they are coherent
// iterators are not required to be fully consumed

Main = {let id; newIter(id)(Iterator<id> freeIter(id)|Main)}?;
Iterator<id> = ((hasNext(id,true)+ next(id))* hasNext(id,false)+)!;
```

---

## Solution: lists and iterators

Fonte: https://rmlatdibris.github.io/examples/solution-lists-iters.html

Modify [*list_iterators*](https://rmlatdibris.github.io/examples/ooi.html#multiple-iterators-over-a-single-list) above to specify multiple iterators over multiple lists (weak version).
(see the [solution](https://rmlatdibris.github.io/examples/solution-lists-iters.html))

## Solution

```js 
// lists_iterators: multiple iterators over multiple lists, weak version

newIter(id) matches newIter(_,id);
hasNext_or_next(id) matches hasNext(id,_) | next(id);
iterator matches newIter(_) | hasNext_or_next(_) | freeIter(_);
not_newIter not matches newIter(_);
list_or_iter(lsid,itid) matches hasNext_or_next(itid) | freeIter(itid) | list(lsid);

Main = ListSafe /\ iterator >> Iterators;

ListSafe = not_newIter* {let lsid,itid; newIter(lsid,itid)(ListSafeIter<lsid,itid> /\ ListSafe)}?;
ListSafeIter<lsid,itid> = list_or_iter(lsid,itid) >> hasNext_or_next(itid)* list(lsid)* freeIter(itid) all;

// specification already defined
Iterators = {let id; newIter(id)(Iterator<id> freeIter(id)|Iterators)}?;
Iterator<id> = ((hasNext(id,true)+ next(id))* hasNext(id,false)+)!;
```

---