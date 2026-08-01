# Robotic systems

Contenuti completi estratti dal sito ufficiale RMLatDIBRIS, senza riassumere le sezioni originali incluse in questo file.

## Fonti incluse
- Robotic systems: https://rmlatdibris.github.io/examples/ros.html

---

## Robotic systems

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