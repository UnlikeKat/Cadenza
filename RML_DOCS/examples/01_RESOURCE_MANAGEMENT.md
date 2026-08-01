# Resource management

Contenuti completi estratti dal sito ufficiale RMLatDIBRIS, senza riassumere le sezioni originali incluse in questo file.

## Fonti incluse
- Resource management: https://rmlatdibris.github.io/examples/resource.html
- Solution: non-exclusive resource: https://rmlatdibris.github.io/examples/solution-non-exclusive-resource.html
- Solution: non-exclusive2 resource: https://rmlatdibris.github.io/examples/solution-non-exclusive2-resource.html
- Solution: exclusive resource: https://rmlatdibris.github.io/examples/solution-exclusive-resource.html

---

## Resource management

Fonte: https://rmlatdibris.github.io/examples/resource.html

## Resource management verification

Incorrect resource management in software systems is a typical source of subtle bugs 
that are usually hard to detect and locate, especially in concurrent and distributed applications.
This is a typical control-oriented verification problem that can be managed with **RV**.

### Non-exclusive access to resources

#### Simplified specification

The following specification provides a pattern that can be easily adapted when resources can be accessed
in a non-exclusive way:

```js
// non-exclusive1
Main = {let rid; acquire(rid) (Main | use(rid)* release(rid))}?;
```

The pattern is based on the following event types with the corresponding meanings:
* `acquire(rid)`: resource `rid` has been acquired;
* `use(rid)`: resource `rid` has been used;
* `release(rid)`: resource `rid` has been released.

As expected, the specification is parametric in the resource identifier `rid`; as soon as a resource `rid` is
acquired, the specification is rewritten into a new one where the main specification is interleaved with `use(rid)* release(rid)` to allow the resource to
be used more times (zero included) before it is released.

The specification accepts non-exclusive access to the same resource; for instance, a trace where events match
in the corresponding order `acquire(42)`, `acquire(42)`, `release(42)` and `release(42)`, is accepted.

#### Exercise

Which of the following traces is correct (that is, verdict **True** is returned by the monitor) according to the specification *non-exclusive1* [above](#simplified-specification)? (see the [solution](https://rmlatdibris.github.io/examples/solution-non-exclusive-resource.html))

1. trace with events matching in the corresponding order   `acquire(42)` `acquire(42)` `use(42)` `release(42)` `use(42)` `release(42)` 
2. trace with events matching in the corresponding order   `acquire(42)` `acquire(42)` `release(42)` `use(42)` `use(42)` `release(42)` 
3. trace with events matching in the corresponding order   `acquire(42)` `acquire(43)` `use(43)` `release(42)` `use(42)` `release(43)` 
4. trace with events matching in the corresponding order   `acquire(42)` `acquire(42)` `release(42)` `use(42)`  `release(42)` `use(42)` 

#### A more precise specification 

The specification for non-exclusive access to resources defined above does not
track the entities that access the resources; the more precise specification below uses event types
`acquire(eid,rid)`, `use(eid,rid)` and `release(eid,rid)`, where `eid` is the identity of the entity interacting with
resource `rid`.

```js
// non-exclusive2
notAcqRel(eid,rid) not matches acquire(eid,rid) | release(eid,rid);

Main = {let eid,rid; acquire(eid,rid) ((Main | use(eid,rid)* release(eid,rid)) /\ notAcqRel(eid,rid)* release(eid,rid) all)}?;
```
The derived event type `notAcqRel(eid,rid)` matches any event which does not match `acquire(eid,rid)` or `release(eid,rid)`.

The intersection operator imposes the further constraint that entity `eid` can acquire resource `rid` only if
it does not hold it already; this implies that an entity can reacquire a resource only after it has
released it. This is possible thanks to the `all` operator following `release(eid,rid)`.

#### Exercise

Which of the following traces is correct (that is, verdict **True** is returned by the monitor) according to the specification *non-exclusive2* [above](#a-more-precise-specification)? (see the [solution](https://rmlatdibris.github.io/examples/solution-non-exclusive2-resource.html))

1. trace with events matching in the corresponding order   `acquire(0,42)` `acquire(1,42)` `use(1,42)` `release(1,42)` `use(0,42)` `release(0,42)` 
2. trace with events matching in the corresponding order   `acquire(0,42)` `acquire(1,42)` `release(0,42)` `use(1,42)` `use(1,42)` `release(1,42)` 
3. trace with events matching in the corresponding order   `acquire(0,42)` `acquire(0,43)` `use(0,43)` `release(0,42)` `use(0,42)` `release(0,43)` 
4. trace with events matching in the corresponding order   `acquire(0,42)` `acquire(1,42)` `use(1,42)` `use(0,42)`  `release(1,42)` `acquire(0,42)` `release(0,42)`  

### Exclusive access to resources

Mutually exclusive access to resources can be imposed by slightly changing the specification *non-exclusive2* [above](#a-more-precise-specification);
we just need to modify the definition of event type `notAcqRel(eid,rid)`, to forbid acquisition of resource `rid` by any entity,
and not just `eid`. In this way the specification on the right-hand-side of intersection ensures that acquisition of `rid` is allowed
only after `rid` has been released by `eid`. This is possible thanks to the `all` operator following `release(eid,rid)`.


```js
// exclusive
notAcqRel(eid,rid) not matches acquire(_,rid) | release(eid,rid);

Main = {let eid,rid; acquire(eid,rid) ((Main | use(eid,rid)* release(eid,rid)) /\ notAcqRel(eid,rid)* release(eid,rid) all)}?;
```

#### Exercise

Which of the following traces is correct (that is, verdict **True** is returned by the monitor) according to the specification *exclusive* [above](#exclusive-access-to-resources)? (see the [solution](https://rmlatdibris.github.io/examples/solution-exclusive-resource.html))

1. trace with events matching in the corresponding order   `acquire(0,42)` `acquire(1,42)` `use(1,42)` `use(0,42)`  `release(1,42)` `acquire(0,42)` `release(0,42)`  
2. trace with events matching in the corresponding order   `acquire(0,42)` `use(0,42)` `acquire(1,43)` `release(0,42)` `use(1,42)` `release(1,43)` 
3. trace with events matching in the corresponding order   `acquire(0,42)` `use(0,42)` `acquire(0,43)` `use(0,43)` `release(0,42)`  `release(0,43)`
4. trace with events matching in the corresponding order   `acquire(0,42)` `use(0,42)` `release(0,42)` `acquire(1,43)` `use(1,43)` `release(1,43)`

---

## Solution: non-exclusive resource

Fonte: https://rmlatdibris.github.io/examples/solution-non-exclusive-resource.html

## Solution
Which of the following traces is correct (that is, verdict **True** is returned by the monitor) according to the specification *non-exclusive1*? 

```js
// non-exclusive1
Main = {let id; acquire(id) (Main | use(id)* release(id))}?;
```

1. trace with events matching in the corresponding order   `acquire(42)` `acquire(42)` `use(42)` `release(42)` `use(42)` `release(42)` 
2. trace with events matching in the corresponding order   `acquire(42)` `acquire(42)` `release(42)` `use(42)` `use(42)` `release(42)` 
3. trace with events matching in the corresponding order   `acquire(42)` `acquire(43)` `use(43)` `release(42)` `use(42)` `release(43)` 
4. trace with events matching in the corresponding order   `acquire(42)` `acquire(42)` `release(42)` `use(42)`  `release(42)` `use(42)` 

Traces 1 and 2 are correct, whereas traces 3 and 4 are not because of the last event 
matching `use(42)`: resource 42 is not currently acquired.

---

## Solution: non-exclusive2 resource

Fonte: https://rmlatdibris.github.io/examples/solution-non-exclusive2-resource.html

## Solution

Which of the following traces is correct (that is, verdict **True** is returned by the monitor) according to the specification *non-exclusive2*?

```js
// non-exclusive2
notAcqRel(eid,rid) not matches acquire(eid,rid) | release(eid,rid);

Main = {let eid,rid; acquire(eid,rid) ((Main | use(eid,rid)* release(eid,rid)) /\ notAcqRel(eid,rid)* release(eid,rid) all)}?;
```

1. trace with events matching in the corresponding order   `acquire(0,42)` `acquire(1,42)` `use(1,42)` `release(1,42)` `use(0,42)` `release(0,42)` 
2. trace with events matching in the corresponding order   `acquire(0,42)` `acquire(1,42)` `release(0,42)` `use(1,42)` `use(1,42)` `release(1,42)` 
3. trace with events matching in the corresponding order   `acquire(0,42)` `acquire(0,43)` `use(0,43)` `release(0,42)` `use(0,42)` `release(0,43)` 
4. trace with events matching in the corresponding order   `acquire(0,42)` `acquire(1,42)` `use(1,42)` `use(0,42)`  `release(1,42)` `acquire(0,42)` `release(0,42)`  

Traces 1 and 2 are correct, whereas traces 3 and 4 are not:
* in trace 3 entity 0 tries to use resource 42 after it has released it;
* in trace 4 entity 0 tries to acquire the already acquired resource 42.

---

## Solution: exclusive resource

Fonte: https://rmlatdibris.github.io/examples/solution-exclusive-resource.html

## Solution

Which of the following traces is correct (that is, verdict **True** is returned by the monitor) according to the specification *exclusive*?

```js
// exclusive
notAcqRel(eid,rid) not matches acquire(_,rid) | release(eid,rid);

Main = {let eid,rid; acquire(eid,rid) ((Main | use(eid,rid)* release(eid,rid)) /\ notAcqRel(eid,rid)* release(eid,rid) all)}?;
```

1. trace with events matching in the corresponding order   `acquire(0,42)` `acquire(1,42)` `use(1,42)` `use(0,42)`  `release(1,42)` `acquire(0,42)` `release(0,42)`  
2. trace with events matching in the corresponding order   `acquire(0,42)` `use(0,42)` `acquire(1,43)` `release(0,42)` `use(1,42)` `release(1,43)` 
3. trace with events matching in the corresponding order   `acquire(0,42)` `use(0,42)` `acquire(0,43)` `use(0,43)` `release(0,42)`  `release(0,43)`
4. trace with events matching in the corresponding order   `acquire(0,42)` `use(0,42)` `release(0,42)` `acquire(1,43)` `use(1,43)` `release(1,43)` 

Traces 3 and 4 are correct, whereas traces 1 and 2 are not:
* in trace 1 entity 1 tries to acquire resource 42 already held by entity 0;
* in trace 2 entity 1 tries to use resource 42 without having acquired it.

---