# RML - guida completa dal sito ufficiale

> Raccolta strutturata delle pagine pubbliche del sito RMLatDIBRIS, esclusa la pagina separata `Selected publications` (`biblio.md`) come richiesto. Le sezioni mantengono esempi e specifiche RML utili per studiare monitor, compilatore e regole custom.

## Fonti incluse
- Home: https://rmlatdibris.github.io/
- An introductory guide: https://rmlatdibris.github.io/rml.html
- Implementation: https://rmlatdibris.github.io/implementation.html
- Examples index: https://rmlatdibris.github.io/examples.html
- Examples / Resource management: https://rmlatdibris.github.io/examples/resource.html
- Examples / Solution: non-exclusive resource: https://rmlatdibris.github.io/examples/solution-non-exclusive-resource.html
- Examples / Solution: non-exclusive2 resource: https://rmlatdibris.github.io/examples/solution-non-exclusive2-resource.html
- Examples / Solution: exclusive resource: https://rmlatdibris.github.io/examples/solution-exclusive-resource.html
- Examples / Data types: https://rmlatdibris.github.io/examples/data-type.html
- Examples / Stacks: https://rmlatdibris.github.io/examples/lifo.html
- Examples / Solution: stack1: https://rmlatdibris.github.io/examples/solution-stack1.html
- Examples / Solution: stack2: https://rmlatdibris.github.io/examples/solution-stack2.html
- Examples / Queues: https://rmlatdibris.github.io/examples/fifo.html
- Examples / Solution: queue1: https://rmlatdibris.github.io/examples/solution-queue1.html
- Examples / Solution: queue2: https://rmlatdibris.github.io/examples/solution-queue2.html
- Examples / Solution: queue3: https://rmlatdibris.github.io/examples/solution-queue3.html
- Examples / Solution: queue4: https://rmlatdibris.github.io/examples/solution-queue4.html
- Examples / Solution: queue5: https://rmlatdibris.github.io/examples/solution-queue5.html
- Examples / Sets: https://rmlatdibris.github.io/examples/set.html
- Examples / Solution: set1: https://rmlatdibris.github.io/examples/solution-set1.html
- Examples / Solution: set2: https://rmlatdibris.github.io/examples/solution-set2.html
- Examples / Priority queues: https://rmlatdibris.github.io/examples/priority.html
- Examples / Lists: https://rmlatdibris.github.io/examples/list.html
- Examples / Object-oriented interfaces: https://rmlatdibris.github.io/examples/ooi.html
- Examples / Solution: iterator: https://rmlatdibris.github.io/examples/solution-iter.html
- Examples / Solution: iterators: https://rmlatdibris.github.io/examples/solution-iters.html
- Examples / Solution: lists and iterators: https://rmlatdibris.github.io/examples/solution-lists-iters.html
- Examples / Interaction protocols: https://rmlatdibris.github.io/examples/protocol.html
- Examples / Internet of Things: https://rmlatdibris.github.io/examples/iot.html
- Examples / Sensors and anomaly detection: https://rmlatdibris.github.io/examples/sensor.html
- Examples / Robotic systems: https://rmlatdibris.github.io/examples/ros.html
- Examples / Regular expressions: https://rmlatdibris.github.io/examples/regexp.html
- Examples / Non-deterministic Context Free: https://rmlatdibris.github.io/examples/non-detCF.html
- Downloads: https://rmlatdibris.github.io/downloads.html

## Indice rapido
- Concetti base: eventi JSON, event types, operatori, verdict, filtri, specifiche parametriche e generiche.
- Implementazione: compilazione verso trace expressions, stack SWI-Prolog, ANTLR, Kotlin/JVM, monitor offline/online e strumentazione Node.js.
- Esempi: gestione risorse, strutture dati, interfacce object-oriented, protocolli, IoT, robotica, espressioni regolari e casi context-free non deterministici.
- Download: repository ufficiali per compilatore, monitor, instrumentation e running examples.

---

## Home

Fonte: https://rmlatdibris.github.io/

## Welcome to the Web site of RML!

* * *

![Logo](https://rmlatdibris.github.io/images/logoBW.png)
The development of RML  was partially funded by the [MUR project “T-LADIES” (PRIN 2020TL3X8X)](https://cazzola.di.unimi.it/t-ladies.html)

### [An introductory guide](https://rmlatdibris.github.io/rml.html)

### [Implementation](https://rmlatdibris.github.io/implementation.html)

### [Some examples](https://rmlatdibris.github.io/examples.html)

### [Downloads](https://rmlatdibris.github.io/downloads.html)

---

## An introductory guide

Fonte: https://rmlatdibris.github.io/rml.html

## An introductory guide to **RML**

**RML** is a rewriting-based and system agnostic **Domain Specific Language** for **Runtime Verification**
which decouples monitoring from instrumentation by allowing users to write specifications and
to synthesize monitors from them, independently of the **System Under Scrutiny** (**SUS**) and its instrumentation. 

**RML** can monitor **non-context-free** properties, for instance the following specification allows
monitoring of [**FIFO** properties](https://rmlatdibris.github.io/examples/fifo.html):

```js
// FIFO queues

enq(val) matches {event:'func_pre',name:'enqueue',args:[val]};
deq(val) matches {event:'func_post',name:'dequeue',res:val};
deq matches deq(_);

Main = {let val; enq(val) ((deq | Main) /\ (deq >> (deq(val) all)))}!;
```

### Events
**RML** is based on a general model where events are represented by object literals, with
the standard **JavaScript** syntax. Consequently, monitors generated from
**RML** specifications process events with the universal data-interchange format **JSON**.

Specific event models can be conceived, depending on the kinds of properties events can have.
For instance, the specification of **FIFO** queues above is based on a simple model consisting of the
following properties keys:
- `event`, specifying two possible kinds of events: 'func_pre' and 'func_post', corresponding,
to *function calls* and *returns from functions*, respectively;
-  `name`, specifying the name of the involved function;
-  `args`, specifying the array of the arguments passed to the function;
-  `res`, specifying the returned value, if `event` has value 'func_post'.

As an example, the following objects

```js
{event:'func_pre',name:'enqueue',args:[val]}

{event:'func_post',name:'dequeue',args:[],res:val}
```
specify the following events, respectively:
- function `enqueue` has been called with a single argument of value `val`;
- function `dequeue` has been called with no arguments, and returned value `val`.


### Event types
Event types define  sets of events and coincide with what is often referred as symbolic events in the **RV** jargon.
In **RML**  event types are terms built on top of names, associated with arities, and subterms representing data values of primitive, array, or object type;
the simplest way to define event types is by pattern matching, as in the following example:
```js
enq(val) matches {event:'func_pre',name:'enqueue',args:[val]};
deq(val) matches {event:'func_post',name:'dequeue',res:val};
```  

It is also possible to define derived event types, as below: 
```js
enq matches enq(_);
deq matches deq(_);
```

Four event types are defined above: `enq` and `deq`, each with both arity 0 and 1; event types can be overloaded: the same name can be
used for event types with different arities; we explicitly indicate the arity to distinguish overloaded event types as in `enq/0` and `enq/1`.
In this example the definitions for  `enq/0` and `deq/0` are derived from those of `enq/1` and `deq/1`, respectively.

The meaning of the definitions above is as follows:
- `enq(val)` matches all calls to function `enqueue` with single argument `val`;
- `enq` matches all events matching `enq(val)`, for any `val`;
- `deq(val)` matches all returns from function `dequeue` with result `val`
- `deq` matches all events matching `deq(val)`, for any `val`.

Event type definitions support also **negation**; furthermore, the **predefined event types** `none` and `any`
can be used to match no event and all events, respectively.

Event types favor modular and reusable specifications and enhance readability;
for instance, the specification of queues above can be easily adapted if one has to verify a library where the operations for enqueueing and dequeing
use different names, by only changing the definitions of `enq(val)` and `deq(val)`:

```js
enq(val) matches {event:'func_pre',name:'add',args:[val]};
deq(val) matches {event:'func_post',name:'remove',res:val};
```  

### Definition of event types with numerical constraints
Sometimes pattern matching is not expressive enough to define event types; the specification of [priority queues](https://rmlatdibris.github.io/examples/priority.html), for instance,
requires an event type `deq` to verify that a dequeued integer verifies an inequality constraint.

```js
deq_geq(val) matches deq(val2) with val2 >= val;
```

Event type `deq_geq(val)` matches all events corresponding to dequeuing an integer greater than or equal to `val`.  
When defining an event type, **RML** allows the possibility of adding a set of inequality constraints over real numbers that have to be satisfied
in case one of the specified patterns matches the event; the possibility of satisfying numerical constraints is quite useful in domains
such as [IoT](https://rmlatdibris.github.io/examples/iot.html) or [robotic systems](https://rmlatdibris.github.io/examples/ros.html). 

```js
check_der(val1,time1,val2,time2) matches sensor(val2,time2)  // checks derivative anomaly of a sensor
			       with delta==(val2-val1)/(time2-time1) && abs(delta) <= 1; 
```

### Basic and derived operators
An **RML** specification denotes a set of event traces, obtained by combining simpler sets with the following basic binary operators (in
decreasing order of precedence):
- *concatenation* (juxtaposition) enforces sequentiality; 
- *intersection* (`/\`) requires simultaneous verification of multiple properties;  
- *union* (`\/`) expresses alternatives;
- *shuffle* (`|`)  allows interleaving of events in traces. 

Furthermore, the unary postfix operator `!`, with higher precedence on the other operators,
can be used to consider as valid all prefixes of a set of traces and, thus, change the [verdicts emitted](#monitor-verdicts) 
by monitors.

Specifications can be (mutually) recursive, and the keyword `empty` is the basic constant operator
denoting the set containing just the empty trace.

Thanks to recursion and the basic operators above, several derived operators can be defined.

Standard postfix operators `?`, `+` and `*` are borrowed from regular expressions: 
for any expression `exp`, `(exp)?` is equivalent to `empty \/ (exp)`,
while `(exp)*` and `(exp)+` correspond to the following specifications `Star` and `Plus`, respectively:
```js
Star = empty \/ (exp) Star  // exp*
Plus = (exp) Star  // exp+
```
Another useful derived operator is the constant `all` which denotes the universe of all traces, and is an abbreviation for
`any*`.

#### Scalable and compositional specifications with shuffle and intersection
While concatenation and union are familiar operators used in many contexts, including regular expressions and context-free grammars,
shuffle and intersection are not so widespread, therefore some starting example is needed
to explain why they are so useful in **RML** and, more in general, in runtime verification and monitoring,
to favor conciseness and readability of specifications.

Let us consider the specification of the alternating bit protocol [DeniélouYoshida2012](https://link.springer.com/chapter/10.1007%2F978-3-642-28869-2_10) which has to verify the following
three properties, where event types `msg(1)`, `msg(2)`, `ack(1)`, and `ack(2)` are assumed to be mutually disjoint:
1. for any event `e_1` matching `msg(1)` there must be a subsequent event `e_2` matching `ack(1)` and no other
event matching `msg(1)` is allowed to occur between `e_1` and `e_2`;
2. for any event `e_1` matching `msg(2)` there must be a subsequent event `e_2` matching `ack(2)` and no other
event matching `msg(2)` is allowed to occur between `e_1` and `e_2`;
3. for any event `e_1` matching `msg(1)` there must be a subsequent event `e_2` matching `msg(2)` and no other
event matching `msg(1)` is allowed to occur between `e_1` and `e_2`.

Because of the independence of their event types, the first two properties can be conveniently combined with the shuffle operator: 

```js
Prop1_2 = (msg(1)ack(1))* | (msg(2)ack(2))*;
```

However, the same consideration does not apply to property 3; in this case, intersection is needed to allow a compositional
specification:

```js
no_msg not matches msg(_);
  
Prop1_2 = (msg(1)ack(1))* | (msg(2)ack(2))*;
Prop3 = (msg(1) no_msg* msg(2) no_msg*)*;
Main = Prop1_2/\Prop3;
```

Event type `no_msg` matches all events that do not match `msg(_)`, and is needed
because `Prop3` involves only events of type `msg(1)` or `msg(2)`, while
`Prop1_2` checks also events of type `ack(1)` or `ack(2)`; indeed,
the combination `Prop1_2/\(msg(1)msg(2))*` specifies only the empty trace.

The specification of the alternating bit protocol could be equivalently obtained in a non compositional way by defining a state machine
that is able to monitor the three properties above and that can
be directly translated into an **RML** specification which, however, would be much less readable.

Property 3 has been specified with a standard regular expression, but the obtained specification
is not so simple to parse and understand. Thanks again to the independence of the involved event types,
shuffle allows a more concise and readable specification:

```js
no_msg not matches msg(_);
  
Prop1_2 = (msg(1)ack(1))* | (msg(2)ack(2))*;
Prop3 = (msg(1) msg(2))* | no_msg*;
Main = Prop1_2/\Prop3;
```

This pattern obtained through the combination of the shuffle and
intersection operators occurs so often when composing specifications of different properties that it justifies the
introduction of the derived *filter* operator.

#### Monitor verdicts 

Any time it receives a new event, the monitor generated from an **RML** specification emits a verdict in a 4-valued logic:
- **True**: the event trace monitored so far is correct, and any continuation will be correct as well;  
- **Maybe True**: the event trace monitored so far is correct, but some of its continuations are not correct; 
- **Maybe False**: the event trace monitored so far is not correct, but some of its continuations are correct;  
- **False**: the event trace monitored so far is not correct, and any continuation will be incorrect as well.

The first and last values are called *conclusive* since in those cases no other monitoring is required
to decide whether the **SUS** is correct or not; the others are *inconclusive* and
require the monitor to keep running.

The derived constant `all` is useful to allow monitors to emit **True** as verdict.

Let us consider, for instance, `deq >> (deq(val) all)` which is
part of the specification for **FIFO** properties as defined at the beginning of this page; according to the filter operator,
traces restricted to events matching type `deq` must verify `deq(val) all`, that is, they must start with an event matching
`deq(val)` and then can continue with any possible trace: after checking that the initial event matches `deq(val)`, the monitor can emit
the **True** verdict. Therefore, the specification `deq >> (deq(val) all)` defines the following constraint: the first dequeue operation, if any, must return
`val` as value.

A very useful operator for driving monitor verdicts is the **prefix closure operator** `!`; let us consider again the specification for
**FIFO** queues:
```js
// FIFO queues

enq(val) matches {event:'func_pre',name:'enqueue',args:[val]};
deq(val) matches {event:'func_post',name:'dequeue',res:val};
deq matches deq(_);

Main = {let val; enq(val) ((deq | Main) /\ (deq >> (deq(val) all)))};
```
Such a specification does not employ the constant `empty`, therefore it denotes a set where all traces are
necessarily infinite; this means that the only verdicts that can be emitted are **False** or **Possibly False**.
What can we do to allow the monitor to emit also **Possibly True** verdicts?
We need to specify that also all finite prefixes of the traces defined by the specification above are allowed;
the simplest way to do that is to employ the post-fix operator `!`:
```js
// FIFO queues

enq(val) matches {event:'func_pre',name:'enqueue',args:[val]};
deq(val) matches {event:'func_post',name:'dequeue',res:val};
deq matches deq(_);

Main = {let val; enq(val) ((deq | Main) /\ (deq >> (deq(val) all)))}!;
```
At this point, another question could arise: 'ok, now **Possibly True** verdicts can be emitted, but what about **True**?';
let us recall the meaning of the **True** verdict: the event trace monitored so far is correct, and any continuation will be correct as well.
Can this happen when monitoring a program which manipulates a queue? Not really! The best we can get is
**Possibly True**: the event trace monitored so far is correct, but some of its continuations are not correct; indeed, at each time
an event corresponding to dequeueing an incorrect value could occur.

#### Filter operators
The specification of property 3 of the [alternating bit protocol](#scalable-and-compositional-specifications-with-shuffle-and-intersection) can be
further simplified by using a filter operator:

```js
msg matches msg(_);

Prop1_2 = (msg(1)ack(1))* | (msg(2)ack(2))*;
Prop3 = msg >> (msg(1) msg(2))*;
Main = Prop1_2/\Prop3;
```

The specification `msg >> (msg(1) msg(2))*` denotes the set of all traces verifying
`(msg(1) msg(2))*` when only all events matching event type
`msg` are kept; event type `msg` matches all events matching `msg(_)`.

The `>>` operator can be generalized into a conditional filter which takes an
additional operand: `eventType >> Spec1 : Spec2` denotes the set of all traces verifying
`Spec1` when only all events matching `eventType` are kept, and
`Spec2` when only all events not matching `eventType` are kept.
The less general version `eventType >> Spec` presented above is equivalent to
`eventType >> Spec : all`.

Conditional filter can be derived from
the shuffle, intersection and star operators, with the assumption, as it is the case of **RML**, that event types
are closed w.r.t. negation.

### Parametric specifications

A specification is called **parametric** if it is able to express properties depending on the data values carried by the monitored events;
this is an important feature to ensure effectiveness of **RV**.

A very simple form of parametricty can be obtained in **RML** by allowing data value variables in specifications; let us consider again
the problem of verifying that files are properly opened and closed;
[property 1](#scalable-and-compositional-specifications-with-shuffle-and-intersection) defined above is oversimplified because it does not take into account an important detail:
an event matching `close` is correctly coupled with a previous event matching `open` only if the two events refer to the same file descriptor `fd`.
Typically, `fd` is returned by a call to function `open`, and it must be passed as an argument when calling `close`, but the value `fd` will
be known only at runtime.

A naive solution to the problem could be as follows:
```js
open(val) matches {event:'func_post',name:'open',res:val};
close(val) matches {event:'func_pre',name:'close',args:[val]};
oc not matches open(_) | close(_);

Main = oc >> (open(fd) close(fd))*;  // limited parametricity 
```
Variable `fd` is bound to the actual value when `open(fd)` is matched by an event for the first time; anyway, such a solution
works only partially: we do not have to know in advance the value of the file descriptor to write the specification,
but, anyway, we can check the correct use of `open` and `close` only for a unique file descriptor!

This is due to the fact that in the specification `fd` is used globally, whereas we would need to declare it as a local variable
to correctly delimit its scope:
```js
Main = oc >> {let fd; open(fd) close(fd)}*;  // true parametricity 
```
In **RML** the `let` keyword is used for declaring data value variables, as `fd` in the example, and the curly braces delimit their scope; now
it is possible to check the correct use of `open` and `close` for different file descriptors (although only one file at time can be opened; see [Examples](https://rmlatdibris.github.io/examples.html) for a complete specification).

As a final remark, the solution with limited parametricity provided above corresponds to the following specification, where the scope of `fd` goes beyond the Kleene operator `*`:
```js
Main = oc >> {let fd; (open(fd) close(fd))*}; 
```

### Generic specifications
Declaring data value variables in specifications allows us to make them parametric in the data values carried by the monitored events,
but still the **RML** features presented so far do not allow monitors to perform simple computations and to assign their values to variables:
initialization of `let` variables is fully driven by event matching.

Generic specifications allow users to declare parameters and to initialize them with values computed from expressions.
Let us consider for instance the problem of extending the specification of **FIFO** queues above to track call to the
`size` function returning the number of elements in the queue; this is not possible if we are not able to increment and decrement
integer values. 
```js
// FIFO queues with size
enq(val) matches {event:'func_pre',name:'enqueue',args:[val]};
deq(val) matches {event:'func_post',name:'dequeue',res:val};
size(val) matches {event:'func_post',name:'size',res:val};
enq matches enq (_);
deq matches deq (_);
enqDeq matches enq | deq ;


Queue = {let val; enq(val) ((deq | Queue) /\ (deq >> (deq(val) all)))}; // checks enqueue and dequeue
Size<s> = (size(s) Size<s>) \/ (enq Size<s+1>) \/ (deq Size<s-1>); // checks size

Main = ((enqDeq>>Queue) /\ Size<0>)!;
```
The main specification is the conjunction of two properties: `Queue` checking that `enqueue` and `dequeue` behave correctly, and
`Size<s>` checking calls to `size`. The filter operator with the event type `enqDeq` is needed, because the `Queue` specification
is restricted to event of types `enq` or `deq`; although the `Size<s>` specification checks only the `size` function,
calls to `enqueue` and `dequeue` have to be monitored as well to keep track of the correct size of the queue.

`Size<s>` is a generic specification declaring the single parameter `s` corresponding to the size of the queue; such parameters are called *state variables* because they define attributes of the state of the monitor generated from the specification. In `Main` the generic is applied to `0` because the queue is assumed to be initially empty;  the generic is defined recursively: either `size` is called and returns `s` (that is, the same value
held by the parameter `s`) and then the trace has to continue according to `Size<s>` (that is, the generic is applied with the same size),
or `enqueue` is called and then the trace has to continue according to `Size<s+1>` (that is, the generic is applied with the size increased by `1`),
or `dequeue` is called and then the trace has to continue according to `Size<s-1>` (that is, the generic is applied with the size decreased by `1`).

#### Conditional expression
Let us consider the problem of checking that a trace contains exactly *n* events matching `eventType`, where *n* is a parameter; in this
case the conditional expression is required to correctly define the corresponding specification:
```js
Repeat<n> = if (n>0) eventType Repeat<n-1> else empty;
```
If `Repeat<n>` is applied to a non positive integer, then the only accepted trace is the empty one.

---

## Implementation

Fonte: https://rmlatdibris.github.io/implementation.html

## Implementation

RML [Fra19] compiles down to an operational, low-level formalism, named
(parametric) trace expressions [AFM16,AFM17,AFFM17]. Trace expressions and their predecessors, [global types](https://ieeexplore.ieee.org/document/8187184?arnumber=8187184) (behavioral types for verification of interaction protocols), have been used to model and verify, among the others (see the [selected publications list](https://rmlatdibris.github.io/biblio.html)),  multiagent systems [ADM13,BMA15] and IoT systems [ABFM15b,AFDL+17,LAFO+18].

An optimized implementation of trace expressions has been
developed in [SWI-Prolog](https://www.swi-prolog.org/), thanks to its native support for
cyclic terms and coinductive logic programming [SMBG06].

The current RML compiler uses [ANTLR](https://www.antlr.org/), a powerful and flexible parser generator targeting Java. 

The Prolog
translation is implemented in [Kotlin](https://kotlinlang.org/), which runs on the JVM
and is fully interoperable with the generated Java parser.

A Prolog monitor is available, expecting a specification file
as an argument, which then verifies a sequence of events. Both
an offline monitor (reading from a log file) and on online one
(receiving events through an HTTP interface) exist.
Finally, as an example of an instrumentation layer, a Node.js
static instrumentation tool is available on the repository.



### Bibliography

*[ABFM15b]* Ancona D., Briola D., Ferrando A., Mascardi V. (2015) Runtime verification of fail-uncontrolled and ambient intelligence systems: A uniform approach. Intelligenza Artificiale 9(2): 131-148 [Bibtex from DBLP](https://dblp.uni-trier.de/rec/bibtex/journals/ia/AnconaBFM15)

*[ADM13]* Ancona D., Drossopoulou S., Mascardi V. (2013) Automatic Generation of Self-monitoring MASs from Multiparty Global Session Types in Jason. In: Baldoni M., Dennis L., Mascardi V., Vasconcelos W. (eds) Declarative Agent Languages and Technologies X. DALT 2012. Lecture Notes in Computer Science, vol 7784. Springer, Berlin, Heidelberg [Bibtex from DBLP](https://dblp.uni-trier.de/rec/bibtex/conf/dalt/AnconaDM12)

*[AFDL+17]* Ancona D., Franceschini L., Delzanno G., Leotta M., Ribaudo M., Ricca F. (2017)
Towards Runtime Monitoring of Node.js and Its Application to the Internet of Things. In Proceedings First Workshop on Architectures, Languages and Paradigms for IoT, ALP4IoT@iFM 2017: 27-42 [Bibtex from DBLP](https://dblp.uni-trier.de/rec/bibtex/journals/corr/abs-1802-01790)

*[AFM16]* Ancona D., Ferrando A., Mascardi V. (2016) Comparing Trace Expressions and Linear Temporal Logic for Runtime Verification. In: Ábrahám E., Bonsangue M., Johnsen E. (eds) Theory and Practice of Formal Methods. Lecture Notes in Computer Science, vol 9660. Springer, Cham [Bibtex from DBLP](https://dblp.uni-trier.de/rec/bibtex/conf/birthday/AnconaFM16)

*[AFFM17]* Ancona D., Ferrando A., Franceschini L., Mascardi V. (2017) Parametric Trace Expressions for Runtime Verification of Java-Like Programs. In Proceedings of the 19th Workshop on Formal Techniques for Java-like Programs (FTFJP'17). ACM, New York, NY, USA, Article 10, 6 pages. DOI: https://doi.org/10.1145/3103111.3104037 [Bibtex from DBLP](https://dblp.uni-trier.de/rec/bibtex/conf/ecoop/AnconaFFM17)

*[AFM17]* Ancona D., Ferrando A., Mascardi V. (2017) Parametric Runtime Verification of Multiagent Systems. In Proceedings of the 16th Conference on Autonomous Agents and MultiAgent Systems (AAMAS '17). International Foundation for Autonomous Agents and Multiagent Systems, Richland, SC, 1457-1459 [Bibtex from DBLP](https://dblp.uni-trier.de/rec/bibtex/conf/atal/AnconaFM17)

*[BMA15]* Briola D., Mascardi V., Ancona D. (2015) Distributed Runtime Verification of JADE Multiagent Systems. In: Camacho D., Braubach L., Venticinque S., Badica C. (eds) Intelligent Distributed Computing VIII. Studies in Computational Intelligence, vol 570. Springer, Cham [Bibtex from DBLP](https://dblp.uni-trier.de/rec/bibtex/conf/idc/BriolaMA14)

*[Fra19]* Franceschini L. (2019) RML: runtime monitoring language: a system-agnostic DSL for runtime verification. In Proceedings of the Conference Companion of the 3rd International Conference on Art, Science, and Engineering of Programming (Programming '19), Stefan Marr and Walter Cazzola (Eds.). ACM, New York, NY, USA, Article 28, 3 pages. DOI: https://doi.org/10.1145/3328433.3328462 [Bibtex from DBLP](https://dblp.uni-trier.de/rec/bibtex/conf/programming/Franceschini19)

*[LAFO+18]* Leotta M., Ancona D., Franceschini L., Olianas D., Ribaudo M., Ricca F. (2018) Towards a Runtime Verification Approach for Internet of Things Systems. In: Pautasso C., Sánchez-Figueroa F., Systä K., Murillo Rodríguez J. (eds) Current Trends in Web Engineering. ICWE 2018. Lecture Notes in Computer Science, vol 11153. Springer, Cham [Bibtex from DBLP](https://dblp.uni-trier.de/rec/bibtex/conf/icwe/LeottaAFORR18)

*[SMBG06]* Simon,  L.,  Mallya,  A.,  Bansal,  A.,  and  Gupta,  G. (2006)
Coinductive logic programming. In Logic Programming (Berlin, Heidelberg, 2006),
S. Etalle and M. Truszczyński, Eds., Springer Berlin Heidelberg, pp. 330-345

---

## Examples index

Fonte: https://rmlatdibris.github.io/examples.html

## Examples of **RML** specifications

This page contains several useful **RML** examples and patterns that can be used to verify
several kinds of properties in different domains.

### [Resource management](https://rmlatdibris.github.io/examples/resource.html)

### [Data types](https://rmlatdibris.github.io/examples/data-type.html)

### [Object-oriented interfaces](https://rmlatdibris.github.io/examples/ooi.html)

### [Interaction protocols](https://rmlatdibris.github.io/examples/protocol.html)

### [Internet Of Things](https://rmlatdibris.github.io/examples/iot.html)

### [Robotic systems](https://rmlatdibris.github.io/examples/ros.html)

### [Regular expressions](https://rmlatdibris.github.io/examples/regexp.html)

### [Non-deterministic Context Free examples](https://rmlatdibris.github.io/examples/non-detCF.html)

---

## Examples / Resource management

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

## Examples / Solution: non-exclusive resource

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

## Examples / Solution: non-exclusive2 resource

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

## Examples / Solution: exclusive resource

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

## Examples / Data types

Fonte: https://rmlatdibris.github.io/examples/data-type.html

## Verification of data types

**RML** allows the verification of several data types, including **FIFO** queues and lists, which require a formalism 
more powerful than context-free grammars. Specifications are implementation independent, therefore
they can be used to verify different implementations of the same data type, also with different programming languages (provided
that an instrumentation to generate events is available).

### [Stacks](https://rmlatdibris.github.io/examples/lifo.html)

### [Queues](https://rmlatdibris.github.io/examples/fifo.html)

### [Sets](https://rmlatdibris.github.io/examples/set.html)

### [Priority Queues](https://rmlatdibris.github.io/examples/priority.html)

### [Lists](https://rmlatdibris.github.io/examples/list.html)

---

## Examples / Stacks

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

## Examples / Solution: stack1

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

## Examples / Solution: stack2

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

## Examples / Queues

Fonte: https://rmlatdibris.github.io/examples/fifo.html

## Verification of queues and FIFO properties

The specifications are based on the following basic event types:
* `enq(val)`: value `val` has been inserted in the queue;
* `deq(val)`: value `val` has been removed from the queue;
* `peek(val)`: value `val` is retrieved but not removed from the head of the queue.

### Randomized queues with enqueue and dequeue

```js
// queue1: single random queue with enqueue and dequeue 
Main = Queue!; 
Queue = {let val; enq(val) (deq(val) | Queue)}; 
```

### Randomized queues with enqueue, dequeue and peek

#### Exercise
Show that the following extension of *queue1*, that should verify also `peek`, is not correct. (see the [solution](https://rmlatdibris.github.io/examples/solution-queue1.html))

```js
// queue2: incorrect specification!
Main = Queue!; 
Queue = {let val; enq(val) (peek(val)*deq(val) | Queue)}; 
 ```

#### Exercise
Fix the incorrect version of *queue2* by following the approach 'by decomposition', that is, by imposing a constraint with the intersection operator.
(see the [solution](https://rmlatdibris.github.io/examples/solution-queue2.html))


### Randomized queues with no repetitions, enqueue and dequeue 

```js
// queue3: single random queue with no repetitions, enqueue and dequeue
Main = Queue!; 
Queue = {let val; enq(val) (enq(val)* deq(val) | Queue)}; 
```

### Randomized queues with no repetitions, enqueue, dequeue and peek 

#### Exercise
Extend specification *queue3* to verify `peek`.
(see the [solution](https://rmlatdibris.github.io/examples/solution-queue3.html))

### FIFO queues with enqueue and dequeue 

```js
// queue5: single FIFO queue with enqueue and dequeue 

deq matches deq(_);

Main = Queue!; 
Queue={let val; enq(val) ((deq|Queue)/\(deq>>deq(val) all))};
```

### FIFO queues with enqueue, dequeue and peek

#### Exercise
Extend specification *queue5* to verify `peek`. (see the [solution](https://rmlatdibris.github.io/examples/solution-queue4.html))

*Hint*: the pattern used for *queue2* and *queue4*  does not work!


### FIFO queues with no repetitions, enqueue and dequeue 

#### Exercise
Extend specification [*queue3*](#randomized-queues-with-no-repetitions-enqueue-and-dequeue) to verify FIFO queues with no repetitions, `enqueue` and `dequeue`. (see the [solution](https://rmlatdibris.github.io/examples/solution-queue5.html))

---

## Examples / Solution: queue1

Fonte: https://rmlatdibris.github.io/examples/solution-queue1.html

## Solution

Show that the following extension of *queue1*, that should verify also `peek`, is not correct. 

```js
// queue2: incorrect specification!
Main = Queue!; 
Queue = {let val; enq(val) ( peek(val)*deq(val) | Queue)}; 
```

The monitor generated from the specification emits the **True** verdict for the incorrect trace
with events matching in the corresponding order  `enq(1)` `enq(2)` `peek(1)` `peek(2)`.

---

## Examples / Solution: queue2

Fonte: https://rmlatdibris.github.io/examples/solution-queue2.html

## Solution

Fix the incorrect version of *queue2* by following the approach 'by decomposition', that is, by imposing a constraint with the intersection operator.

```js
// queue2: incorrect specification!
Main = Queue!; 
Queue = {let val; enq(val) (peek(val)*deq(val) | Queue)}; 
```

The following one is a correct specification:

```js
// queue2: single random queue with enqueue, dequeue and peek
peek_deq matches peek(_) | deq(_);

Main = (Queue/\peek_deq>>Seq)!; 
Queue = {let val; enq(val) (peek(val)*deq(val) | Queue)}; 
Seq = {let val; peek(val)*deq(val)}*;
```

---

## Examples / Solution: queue3

Fonte: https://rmlatdibris.github.io/examples/solution-queue3.html

## Solution
Extend [specification *queue3*](https://rmlatdibris.github.io/examples/fifo.html#randomized-queues-with-no-repetitions-enqueue-and-dequeue) to verify `peek`.

```js
// queue4: single random queue with no repetitions, enqueue, dequeue and peek

peek_deq matches peek(_) | deq(_);

Main = (Queue/\peek_deq>>Seq)!; 
Queue = {let val; enq(val) ((enq(val)\/peek(val))* deq(val) | Queue)}; 
Seq = {let val; peek(val)*deq(val)}*;
```

---

## Examples / Solution: queue4

Fonte: https://rmlatdibris.github.io/examples/solution-queue4.html

## Solution
Extend specification [*queue5*](https://rmlatdibris.github.io/examples/fifo.html#fifo-queues-with-enqueue-and-dequeue) to verify `peek`.

```js
// queue6: single FIFO queue with enqueue, dequeue and peek

deq matches deq(_);
peek matches peek(_);
peek_deq matches peek | deq;

Main = Queue!; 
Queue = {let val; enq(val) ((peek* deq|Queue)/\(peek_deq>>peek(val)* deq(val) all))};
```

---

## Examples / Solution: queue5

Fonte: https://rmlatdibris.github.io/examples/solution-queue5.html

## Solution

Extend specification [*queue3*](https://rmlatdibris.github.io/examples/fifo.html#randomized-queues-with-no-repetitions-enqueue-and-dequeue) to verify FIFO queues with no repetitions, `enqueue` and `dequeue`.

```js
// queue7
// single FIFO queue with no repetitions, enqueue and dequeue

deq matches deq(_);

Main = Queue!; 
Queue={let val; enq(val) ((enq(val)* deq|Queue)/\(deq>>deq(val) all))};
```

---

## Examples / Sets

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

## Examples / Solution: set1

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

## Examples / Solution: set2

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

## Examples / Priority queues

Fonte: https://rmlatdibris.github.io/examples/priority.html

## Verification of priority queues

The specifications are based on the following basic event types:
* `enq(val)`: value `val` has been inserted in the queue;
* `deq(val)`: value `val` has been removed from the queue;
* `peek(val)`: value `val` is retrieved but not removed from the head of the queue.

### Priority queues with no repetitions, enqueue and dequeue 

```js
// priority-queue1: single priority queue with no repetitions, enqueue and dequeue 

deq_geq(val) matches deq(val2) with val2 >= val;
deq matches deq(_);

Main = (Queue/\Sorted)!;
Queue = {let val; enq(val) (enq(val)* deq(val) | Queue)}; 
Sorted = {let val; enq(val) ((deq_geq(val) >> deq(val) all) /\ Sorted)} \/ (deq Sorted);
```

### Priority queues with repetitions, enqueue and dequeue 

```js
// priority-queue2: single priority queue with repetitions, enqueue and dequeue 

deq_geq(val) matches deq(val2) with val2 >= val;
enq_deq_geq(val) matches enq(val) | deq_geq(val); 
deq matches deq(_);


Main = (Queue/\Sorted)!;
Queue = {let val; enq(val) (deq(val) | Queue)}; 
Sorted = {let val; enq(val) ((enq_deq_geq(val) >> Cons<val> all) /\ Sorted)} \/ (deq Sorted);
Cons<val> = deq(val) \/ (enq(val) (deq(val) | Cons<val>));
```

---

## Examples / Lists

Fonte: https://rmlatdibris.github.io/examples/list.html

## Verification of lists

The specifications are based on the following basic event types:

* `insert(index,elem)` element `elem` has been inserted in the list at index `index`;
* `remove(index,elem)` element `elem` has been removed from the list at index `index`;
* `get(index,elem)` element `elem` has been retrieved (but not removed) from the list at index `index`;
* `size(size)` `size` has been returned as the size of the list.

Indexes are assumed to start from 0.

### A simple specification which only checks correct use of indexes

```js
// Additional events for CheckIndex
insert_in_bounds(size) matches insert(index,_) with index >= 0 && index <= size;
remove_in_bounds(size) matches remove(index,_) with index >= 0 && index < size;
get_in_bounds(size) matches get(index,_) with index >= 0 && index < size;
get_size(size) matches size(size)|get_in_bounds(size);

CheckIndex<size> =
    get_size(size)* (insert_in_bounds(size) CheckIndex<size+1> \/ remove_in_bounds(size) CheckIndex<size-1>);
```

### Full specification

```js
// Additional events for Main
add_rm_get matches insert(_,_)|remove(_,_)|get(_,_);

// Additional events for CheckIndex
insert_in_bounds(size) matches insert(index,_) with index >= 0 && index <= size;
remove_in_bounds(size) matches remove(index,_) with index >= 0 && index < size;
get_in_bounds(size) matches get(index,_) with index >= 0 && index < size;
get_size(size) matches size(size)|get_in_bounds(size);

// Additional events for CheckElem
not_insert not matches  insert(_,_);

// Additional events for GetElem
increased(i) matches insert(index,_) with index <= i;
decreased(i) matches remove(index,_) with index < i;
irrelevant_modification(i) matches insert(index,_) | remove(index,_) with index > i;
irrelevant_get(i) matches get(index,_)  with index != i;
irrelevant(i) matches irrelevant_modification(i) | irrelevant_get(i);
					
Main = (CheckIndex<0> /\ add_rm_get >> CheckElem)!;
CheckIndex<size> =
    get_size(size)* (insert_in_bounds(size) CheckIndex<size+1> \/ remove_in_bounds(size) CheckIndex<size-1>);
CheckElem =
    not_insert* {let index,elem; insert(index,elem) (GetElem<index,elem> /\ CheckElem)};
GetElem<index,elem> =
    (irrelevant(index) \/ get(index,elem)) GetElem<index,elem> \/ 
    increased(index) GetElem<index+1,elem> \/
    decreased(index) GetElem<index-1,elem> \/
    remove(index,elem) all;
```

#### Credits
[Luca Ciccone](https://www.dibris.unige.it/ciccone-luca) collaborated to the development of these examples

---

## Examples / Object-oriented interfaces

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

## Examples / Solution: iterator

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

## Examples / Solution: iterators

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

## Examples / Solution: lists and iterators

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

## Examples / Interaction protocols

Fonte: https://rmlatdibris.github.io/examples/protocol.html

## Verification of interaction protocols

### FIPA Request Protocol

Simple version, no uniqueness of message id is verified

```rml
send(sender,receiver,performative,content,msgId) matches {sender:{name:sender}, unicastReceiver:{name:receiver}, performative:performative, messageNumber:msgId,content:content};
send(sender,receiver,performative,msgId) matches {sender:{name:sender}, unicastReceiver:{name:receiver}, performative:performative, messageNumber:msgId};
request(sender,receiver,msgId) matches send(sender,receiver,'REQUEST',msgId);
agree(sender,receiver,msgId) matches send(sender,receiver,'AGREE',msgId);
refuse(sender,receiver,msgId) matches send(sender,receiver,'REFUSE',msgId);
failure(sender,receiver,msgId) matches send(sender,receiver,'FAILURE',msgId);
informDone(sender,receiver,msgId) matches send(sender,receiver,'INFORM',msgId);
informResult(sender,receiver,msgId) matches send(sender,receiver,'INFORM',_,msgId);

relevant matches send(_,_,_,_) | send(_,_,_,_,_);

Main = relevant >> Request;

Request = {let initiator, participant, msgId; request(initiator,participant,msgId) (ManageRequest<initiator,participant,msgId> | Request)}?;

ManageRequest<initiator,participant,msgId> = Agree<participant,initiator,msgId>\/refuse(participant,initiator,msgId);

Agree<participant,initiator,msgId> = agree(participant,initiator,msgId)?(failure(participant,initiator,msgId)\/informDone(participant,initiator,msgId)\/informResult(participant,initiator,result,msgId));
```

Specification requiring also the uniqueness of message id

```rml
send(sender,receiver,performative,content,msgId) matches {sender:{name:sender}, unicastReceiver:{name:receiver}, performative:performative, messageNumber:msgId,content:content};
send(sender,receiver,performative,msgId) matches {sender:{name:sender}, unicastReceiver:{name:receiver}, performative:performative, messageNumber:msgId};
request(sender,receiver,msgId) matches send(sender,receiver,'REQUEST',msgId);
agree(sender,receiver,msgId) matches send(sender,receiver,'AGREE',msgId);
refuse(sender,receiver,msgId) matches send(sender,receiver,'REFUSE',msgId);
failure(sender,receiver,msgId) matches send(sender,receiver,'FAILURE',msgId);
informDone(sender,receiver,msgId) matches send(sender,receiver,'INFORM',msgId);
informResult(sender,receiver,msgId) matches send(sender,receiver,'INFORM',_,msgId);

request(msgId) matches request(_,_,msgId);
notRequest not matches request(_,_,_);
closedRequest(msgId) matches refuse(_,_,msgId) | failure(_,_,msgId) | informDone(_,_,msgId) | informResult(_,_,msgId);
notRequestOrClosedRequest(msgId) not matches request(msgId) | closedRequest(msgId);

relevant matches send(_,_,_,_) | send(_,_,_,_,_);

Main = relevant >> (Request /\ UniqueId);

Request = {let initiator, participant, msgId; request(initiator,participant,msgId) (ManageRequest<initiator,participant,msgId> | Request)}?;

ManageRequest<initiator,participant,msgId> = Agree<participant,initiator,msgId>\/refuse(participant,initiator,msgId);

Agree<participant,initiator,msgId> = agree(participant,initiator,msgId)?(failure(participant,initiator,msgId)\/informDone(participant,initiator,msgId)\/informResult(participant,initiator,result,msgId));

UniqueId = notRequest* {let msgId; request(msgId) (notRequestOrClosedRequest(msgId)* closedRequest(msgId) all /\ UniqueId) }?;
```

### Alternating bit protocol

The specifications are based on the following event types:
* `msg(ty)`: message of type `ty` has been received
* `ack(ty)`: acknowledge of type `ty` has been received

#### Specification for two message types 

```js
// alt-bit: alternating bit protocol with two message types

msg matches msg(_);
ack matches ack(_);
type(ty) matches msg(ty)|ack(ty);

Main = (msg>>MM) /\ MA;
MM = msg(1)msg(2)MM;
MA = {let ty; msg(ty) ((type(ty) >> ack(ty) all) /\ (ack(ty) | MA))};
```

#### Specification for arbitrary message types 

```js
// alt-bit-gen: alternating bit protocol with arbitrary message types

msg matches msg(_);
ack matches ack(_);
type(ty) matches msg(ty)|ack(ty);

Main = (msg>>msg(1) BS<1>) /\ MA;
BS<ty> = {let ty2; msg(ty2) if(ty2==ty+1) BS<ty2> else MM<2,ty>};
MM<ty,max> = msg(ty) if(ty>=max) MM<1,max> else MM<ty+1,max>; 
MA = {let ty; msg(ty) ((type(ty) >> ack(ty) all) /\ (ack(ty) | MA))};
```

---

## Examples / Internet of Things

Fonte: https://rmlatdibris.github.io/examples/iot.html

## Verification of IoT systems

### [Sensors and anomaly detection](https://rmlatdibris.github.io/examples/sensor.html)

---

## Examples / Sensors and anomaly detection

Fonte: https://rmlatdibris.github.io/examples/sensor.html

## Sensors and anomaly detection

### Value range anomaly 

```js
// range: range anomaly detection for single or multiple sensors

sensor_in_range(min,max) matches sensor(val) with min<=val && val<=max;

Main = CheckRange<22,24>;
CheckRange<min,max> = sensor_in_range(min,max)*;
```

### Timestamp anomaly

```js
// timestamp: timestamp anomaly detection for single or multiple sensors

check_time(time1,time2) matches sensor(time2) with time2 > time1;

Main = {let time; sensor(time) CheckTime<time>}!;
CheckTime<time1> = {let time2; check_time(time1,time2) CheckTime<time2>};
```

### Value derivative anomaly

```js
// derivative: derivative anomaly detection for single or multiple sensors

check_der(val1,time1,val2,time2) matches sensor(val2,time2)
			       with delta==(val2-val1)/(time2-time1) && abs(delta) <= 1; 

Main = {let val1,time1; sensor(val1,time1) CheckDer<val1,time1>}!;
CheckDer<val1,time1> = {let val2, time2; check_der(val1,time1,val2,time2) CheckDer<val2,time2>};
```

### Damped harmonic oscillator

```js
// anomaly detection of a damped harmonic oscillator with a distance sensor 

// based on the standard equation
// pos(time) = amplitude e^(-zeta omega_0 time) sin(omega_1 time + phase)
// where zeta=c/(2 sqrt(mk)) is the damping ratio,
//      omega_0=sqrt(k/m) is the undamped angular frequency,
//      k is the spring constant, c is the viscous damping coefficient,
//      omega_1=sqrt(1 - zeta^2) omega_0 is the angular frequency

sensor(pos,time) matches {event:'func_post',name:'sensor',res:{position:pos, time:time}};

check_dots(pos1, time1, pos2, time2) matches sensor(pos2,time2)
			       with
			       e==2.718 && k==5000 && c==18.6*10^-6 && m==1 && phase==0 && error==10^-5
			       &&
			       zeta==c/(2*(m*k)^0.5) && omega0==(k/m)^0.5 && omega1==omega0*(1-zeta^2)^0.5
			       &&
			       delta1==pos1-amplitude*(e^(-zeta*omega0*time1)*sin(omega1*time1+phase))
			       &&
			       delta2==pos2-amplitude*(e^(-zeta*omega0*time2)*sin(omega1*time2+phase))
			       &&
			       delta1 <= error
			       &&
			       delta1 >= -error
			       &&
			       delta2 <= error
			       &&
			       delta2 >= -error;
			       
Main = {let pos1, time1; sensor(pos1, time1) CheckDot<pos1, time1>}!;
CheckDot<pos1, time1> = {let pos2, time2; check_dots(pos1, time1, pos2, time2) CheckDot<pos2,time2>};
```

---

## Examples / Robotic systems

Fonte: https://rmlatdibris.github.io/examples/ros.html

## Speed control of Curiosity rover

```js
left_speed matches {event:'func_pre', name:'command', args:[{topic:'wheels_control',direction:'left',speed:val}]} with val <= 10;
right_speed matches {event:'func_pre', name:'command', args:[{topic:'wheels_control',direction:'right',speed:val}]} with val <= 10;
forward_speed matches {event:'func_pre', name:'command', args:[{topic:'wheels_control',direction:'forward',speed:val}]} with val <= 15;
backward_speed matches {event:'func_pre', name:'command', args:[{topic:'wheels_control',direction:'backward',speed:val}]} with val <= 15;

relevant matches {event:'func_pre', name:'command'};

Main = relevant>>(left_speed \/ right_speed \/ forward_speed \/ backward_speed)*;
```

---

## Examples / Regular expressions

Fonte: https://rmlatdibris.github.io/examples/regexp.html

## Multi-line C comments

### Built from a regular expression

```js
// built from regexp /\*/*(([^*/][^*]*)?\*+)*/

star matches {event:'func_pre',name:'star'};
slash matches {event:'func_pre',name:'slash'};
other matches {event:'func_pre',name:'other'};

not_star_slash matches other;
not_star matches slash | other;

Main=slash star slash* ((not_star_slash not_star*)?star+)* slash;
```

### Built from a DFA

```js
// built from  a DFA 

star matches {event:'func_pre',name:'star'};
slash matches {event:'func_pre',name:'slash'};
other matches {event:'func_pre',name:'other'};

not_star_slash matches other;
not_star matches slash | other;

Main=slash star Inner;
Inner=not_star Inner \/ star MayStop;
MayStop=slash \/ star MayStop \/ not_star_slash Inner;
```

### ReDoS

```js
a matches {event:'func_pre',name:'a'};
b matches {event:'func_pre',name:'b'};

Main = (a+)+;
```

---

## Examples / Non-deterministic Context Free

Fonte: https://rmlatdibris.github.io/examples/non-detCF.html

### Language a^k b^h c^j with k=h or h=j and k,h,j>0

```js
a matches {event:'func_pre',name:'a'};
b matches {event:'func_pre',name:'b'};
c matches {event:'func_pre',name:'c'};

Main = a A<0>;
A<n> = a A<n+1> \/ b B<0,n>;
B<n,k> = b B<n+1,k-1> \/ c if(k==0) c* else C<n>;
C<n> = if(n>0) c C<n-1> else empty;
```

---

## Downloads

Fonte: https://rmlatdibris.github.io/downloads.html

## Downloads

### [Compiler](https://github.com/RMLatDIBRIS/compiler)

### [Monitor interpreter](https://github.com/RMLatDIBRIS/monitor)

### [Instrumentation](https://github.com/RMLatDIBRIS/instrumentation)

### [Running examples](https://github.com/RMLatDIBRIS/running_examples)

---
