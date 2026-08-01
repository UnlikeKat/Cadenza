# Set

Contenuti completi estratti dal sito ufficiale RMLatDIBRIS, senza riassumere le sezioni originali incluse in questo file.

## Fonti incluse
- Sets: https://rmlatdibris.github.io/examples/set.html
- Solution: set1: https://rmlatdibris.github.io/examples/solution-set1.html
- Solution: set2: https://rmlatdibris.github.io/examples/solution-set2.html

---

## Sets

Fonte: https://rmlatdibris.github.io/examples/set.html

## Verification of sets

The specifications are based on the following basic event types:
* `add(el,res)`: element `el` has been added to the set, with computed boolean result `res`: `true` if `el` was not in the set, `false` otherwise;
* `del(el,res)`: element `el` has been deleted from the set, with computed boolean result `res`: `true` if `el` was in the set, `false` otherwise;
* `size(s)`: `s` has been computed as the size of the set.	

### Single set with add and delete

```js
// set1: single set with add and delete
del_false matches del(_,false); 
not_add_true_del(el) not matches add(el,true) | del(el,_);

Main = Set!;
Set = del_false* {let el; add(el,true) ((Set | add(el,false)* del(el,true)) /\ not_add_true_del(el)* del(el,true) all)}?;
```
#### Exercise
Show that specification *set1* is in fact an extension of the pattern for [exclusive access to resources](https://rmlatdibris.github.io/examples/resource.html#exclusive-access-to-resources),
restricted to the case 'single entity', since it verifies a single set. (see the [solution](https://rmlatdibris.github.io/examples/solution-set1.html))

### Single set with add, delete and size
To verify also the `size` operation we need to introduce the state variable `s` with a generic specification, to track the size of the set,
as also done for [stacks](https://rmlatdibris.github.io/examples/lifo.html#single-stack-with-push-pop-and-size).

#### Exercise
Extend version *set1* of the specification of sets, to verify also `size` by following the approach 'by decomposition' as done
for [stacks](https://rmlatdibris.github.io/examples/lifo.html#by-decomposition-approach). (see the [solution](https://rmlatdibris.github.io/examples/solution-set2.html))

---

## Solution: set1

Fonte: https://rmlatdibris.github.io/examples/solution-set1.html

## Solution
For convenience the two specifications are copied below:

```js
// exclusive
notAcqRel(eid,rid) not matches acquire(_,rid) | release(eid,rid);

Main = {let eid,rid; acquire(eid,rid) ((Main | use(eid,rid)* release(eid,rid)) /\ notAcqRel(eid,rid)* release(eid,rid) all)}?;
```

```js
// set1: single set with add and delete
del_false matches del(_,false); 
not_add_true_del(el) not matches add(el,true) | del(el,_);

Main = Set!;
Set = del_false* {let el; add(el,true) ((Set | add(el,false)* del(el,true)) /\ not_add_true_del(el)* del(el,true) all)}?;
```

The similarity between the two specifications can be outlined in terms of event types:
* `add(el,true)` corresponds to `acquire(_,el)`
* `add(el,false)` corresponds to `use(_,el)`
* `del(el,true)` corresponds to `release(_,el)`
* `not_add_true_del(el)` corresponds to `notAcqRel(_,el)`

There are, however, two differences:

* specification *set1* uses the `!` operator, since in general a program is considered correct if it terminates with a non-empty set, but not
if it has not released some acquired resource;
* specification *set1* verifies also events of type `del_false`; in terms of resource management, this could correspond in verifying
also the events of type 'acquisition of the resource has been negated'.

---

## Solution: set2

Fonte: https://rmlatdibris.github.io/examples/solution-set2.html

## Solution

```js
// set2: single set with add, delete and size

not_add_true_del(el) not matches add(el,true) | del(el,_);

// event types needed for the approach 'by decomposition' 
add(res) matches add(_,res); 
del(res) matches del(_,res); 
not_size not matches size(_);

Main = ((not_size>>Set)/\Size<0>)!;
Set = del(false)* {let el; add(el,true) ((Set | add(el,false)* del(el,true)) /\ not_add_true_del(el)* del(el,true) all)}?;
Size<s> = ((size(s)\/add(false)\/del(false))Size<s>\/add(true)Size<s+1>\/del(true)Size<s-1>)?;
```

---