# Queue e proprieta FIFO

Contenuti completi estratti dal sito ufficiale RMLatDIBRIS, senza riassumere le sezioni originali incluse in questo file.

## Fonti incluse
- Queues / FIFO: https://rmlatdibris.github.io/examples/fifo.html
- Solution: queue1: https://rmlatdibris.github.io/examples/solution-queue1.html
- Solution: queue2: https://rmlatdibris.github.io/examples/solution-queue2.html
- Solution: queue3: https://rmlatdibris.github.io/examples/solution-queue3.html
- Solution: queue4: https://rmlatdibris.github.io/examples/solution-queue4.html
- Solution: queue5: https://rmlatdibris.github.io/examples/solution-queue5.html

---

## Queues / FIFO

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

## Solution: queue1

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

## Solution: queue2

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

## Solution: queue3

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

## Solution: queue4

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

## Solution: queue5

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