# Stack e proprieta LIFO

Contenuti completi estratti dal sito ufficiale RMLatDIBRIS, senza riassumere le sezioni originali incluse in questo file.

## Fonti incluse
- Stacks / LIFO: https://rmlatdibris.github.io/examples/lifo.html
- Solution: stack1: https://rmlatdibris.github.io/examples/solution-stack1.html
- Solution: stack2: https://rmlatdibris.github.io/examples/solution-stack2.html

---

## Stacks / LIFO

Fonte: https://rmlatdibris.github.io/examples/lifo.html

## Verification of stacks and LIFO properties

Stacks are a quite common data type, and system correctness may often depends on LIFO properties;  
for instance, absence of data races in multi-threaded programs can be guaranteed by nested locks, whose implementation follows
the LIFO strategy.

The specifications are based on the following basic event types:
* `push(val)`: value `val` has been pushed on the stack;
* `pop(val)`: value `val` has been popped from the stack;
* `size(s)`: `s` has been computed as the size of the stack.	

### Single stack with push and pop

We start by considering the simple problem of verifying a single stack with just the `push` and `pop` operations.
```js
// stack1: single stack with push and pop

Main = Stack!;
Stack = { let val; push(val) Stack pop(val) }*;
```
The specification assumes that the stack is initially empty; In  `Stack`,  for every event matching `push(val)` a corresponding subsequent event
matching `pop(val)` is expected; therefore `push` and `pop` events must be balanced. The prefix closure operator in `Main` allows the generated monitor to emit the **True** verdict even when the stack is not empty after the last event of the trace.

The `*` operator allows a more compact version for the definition of `Stack`; without the Kleene start we would need  the following version:
```js
Stack = { let val; push(val) Stack pop(val) Stack }?;
```
#### Exercise
Show that the following variation of *stack1* is not correct. (see the [solution](https://rmlatdibris.github.io/examples/solution-stack1.html))
```js
Main = Stack!;
Stack = { let val; (push(val) Stack pop(val))* };
```

### Single stack with push, pop and size
Let us now consider a more elaborated example where the specification has to verify also the `size` operation;
to manage this, we need to introduce the state variable `s` with a generic specification, to track the size of the stack.
If we follow the pattern of specification *stack1* we get a rather compact specification which is, however, not so readable.

```js
// stack2: single stack with push, pop and size

Main = Stack<0>!;
Stack<s> = size(s)* { let val; push(val)  Stack<s+1> pop(val) size(s)* }*;
```
The definition of `Main` is pretty clear: now `Stack` is generic and, therefore, has to be applied
to the value 0, since the specification assumes that the stack is initially empty.
The part that concerns us is the definition of `Stack<s>`;  perhaps, a more readable definition for `Stack<s>` is
```js
Stack<s> = size(s)* { let val; push(val) Stack<s+1> pop(val) Stack<s> }?;
```
The version above makes more explicit how the state variable `s` changes in reaction to the events; this is made even more evident in the
following version:
```js
Stack<s> = size(s) Stack<s> \/ { let val; push(val) Stack<s+1> pop(val) Stack<s> }?;
```
#### Approach 'by decomposition'

Even the last version of `Stack` above suffers from a problem: the pattern does not scale well
when new kinds of events have to be verified; let us consider, for instance, to extend
the specification to check also the `top` operation (see the [exercise below](#exercise-1)).
In this case, a pattern based on an approach 'by decomposition' helps to solve this problem:
with the use of the filter and intersection operators we can divide the verification problem
into simpler sub-problems.

```js
// stack2: single stack with push, pop and size
// approach 'by decomposition' 

Main = ((not_size>>Stack) /\ Size<0>)!;
Stack = { let val; push(val) Stack pop(val) }*;
Size<s> = (size(s) Size<s> \/ pop Size<s-1> \/ push Size<s+1>)?;
```
`Stack` now coincides with the definition given for *stack1* and concerns verification of the events matching
`push` or `pop` only; for this reason, the filter with event type `not_size` is needed in `Main`.

The new generic `Size` verifies events of type `size`, but also events of type `push` and `pop` must be involved,
because the size of the stack depends on `push` and `pop`; however, in this case tracking the pushed/popped values
is not needed.

The specification requires the definition of the following derived event types:

```js
push matches push(_); 
pop matches pop(_); 
not_size not matches size(_);
```
Despite its verbosity, this pattern favors extension of the specification (see the [exercise below](#exercise-1)). 

#### Exercise
Extend the 'by decomposition' version of [specification *stack2*](#approach-by-decomposition) to verify also the top operation with the corresponding basic event type: (see the [solution](https://rmlatdibris.github.io/examples/solution-stack2.html))

* `top(val)`: value `val` has been computed as the top of the stack.

*Hint*: exploit the following facts:

* events of type `size` and `top` are independent;
* events of type `top` depend from events of type `push` and `pop`.

### Multiple stacks with push, pop and size

```js
// stacks: multiple stacks with push, pop and size, approach 'by decomposition' 

// event types needed for the approach 'by decomposition'  
push matches push(_,_); 
pop matches pop(_,_); 
not_size not matches size(_,_);

Main = {let id; new(id) (Main | (Single<id> free(id)))}?; 

Single<id> = ((not_size>>Stack<id>)/\Size<id,0>)!;
Stack<id> = { let val; push(id,val) Stack<id> pop(id,val) }*;
Size<id,s> = (size(id,s) Size<id,s> \/ pop Size<id,s-1> \/ push Size<id,s+1>)?; 
```

---

## Solution: stack1

Fonte: https://rmlatdibris.github.io/examples/solution-stack1.html

## Solution

Show that the following variation of *stack1* is not correct. 
```js
Main = Stack!;
Stack = { let val; (push(val) Stack pop(val))* };
```
The monitor generated from the specification fails to emit the **True** verdict for the trace
with events matching in the corresponding order   `push(1)` `pop(1)` `push(2)` `pop(2)`. 

The problem is that variable `val` is instantiated with a specific value *v* when the first event of type `push` is matched, therefore
all `push` events occurring when the stack is empty will have to match that value *v*.

---

## Solution: stack2

Fonte: https://rmlatdibris.github.io/examples/solution-stack2.html

## Solution

Extend the 'by decomposition'  version of [specification *stack2*](https://rmlatdibris.github.io/examples/lifo.html#approach-by-decomposition) to verify also the top operation with the corresponding event type:

* `top(val)`: value `val` has been computed as the top of the stack.

```js
// stack3: single stack with push, pop, size, and top with the approach 'by decomposition'

// event types needed for the approach 'by decomposition'   
push matches push(_); 
pop matches pop(_); 
not_size not matches size(_);
not_top not matches top(_);

Main = relevant >>((not_size>>Stack)/\(not_top>>Size<0>))!;
Stack = { let val; push(val) top(val)* Stack top(val)* pop(val) }*;
Size<s> = (size(s) Size<s> \/ pop Size<s-1> \/ push Size<s+1>)?;
```

---