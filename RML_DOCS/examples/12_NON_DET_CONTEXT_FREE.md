# Non-deterministic context-free examples

Contenuti completi estratti dal sito ufficiale RMLatDIBRIS, senza riassumere le sezioni originali incluse in questo file.

## Fonti incluse
- Non-deterministic Context Free examples: https://rmlatdibris.github.io/examples/non-detCF.html

---

## Non-deterministic Context Free examples

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