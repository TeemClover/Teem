# XIRCLE routes — interactive Clover X experience

Updated 2026-11-09. Read [ROUTE.md](ROUTE.md) before changing the journey. The owner explicitly wants interaction restored and expanded into one company brand walk.

## Main brand map

`/xircle/` combines scrolling with a playable six-station showroom. `brand-experience.js` / `brand-experience.css` own the scene, map and shared presentation. `brand-state.js` parses and serializes bounded URL state; `brand-catalog.js` supplies product/role/download data.

| Station fragment | What visitors can do |
|---|---|
| `#visit-hello` | Choose sleep, eating or movement; see the recommended route change |
| `#visit-signal` | Change sample time of day and collect/remove three illustrative signals |
| `#visit-connect` | Select App, Band or Scale and see their different roles |
| `#visit-routine` | Explore ABCD; enter the existing Absorb/Build rooms or read Control/Balance |
| `#visit-habix` | Inspect five products and open their existing source/reference pages |
| `#visit-finish` | Review visited stops and choose the official iOS/Android download |

Public URL fields are `at`, `path`, `moment`, `device`, `loop`, `product`, `sample`, `trail`. The bounded `at` field retains the current station when following section anchors such as `#official-media` or `#download`. The map exposes every stop and the current position. Browser Back/Forward, reload and restart must preserve or deliberately reset the corresponding state.

`#official-media` opens the official clip library; `category` and `watch` restore its local category/selection. `#download` is the static app download section. Neither area requires purchase or registration.

## RoutineX rooms

- `/routinex/absorb/` and `/routinex/build/` remain their existing immersive rooms.
- The brand entry adds `brand=xircle` and a bounded `return` to the current RoutineX stop. `routinex/brand-bridge.js` / `.css` add company wayfinding and replace personal exits only in that explicit context.
- Control and Daily Balance use existing `/xircle/doc/routinex/abcd/` references. Do not invent new product stages or an unimplemented room.

## Compatibility

`legacy-entry.js` / `route-contract.js` keep older entry paths as aliases rather than copies. `/xircle/routinex/` reaches the RoutineX station through its legacy `#routine` alias; former `#start`, `#sleep`, `#eat`, `#move`, `#body`, `#devices` and `#experience` anchors are mapped by `brand-state.js` where supported. Personal invitation/notebook modes never resume a personal funnel.

Case variants serve the same root. `/invite`, `/free`, `/join` retain the requested acquisition login/ref; the brand navigation itself uses the plain official login.

## Independent references

- `/xircle/learn/`: 21 searchable knowledge topics, category/results/reset URL state.
- `/xircle/learn/topic/`: short explanation, sources and related topics.
- `/xircle/hardware/`: App/Band/Scale explanations.
- `/xircle/products/`: product roles and source links.
- `/xircle/doc/`: 44 deep documents covering App, devices, Habix, RoutineX, care/role, source, ecosystem, commerce, Academy and XOS.

Use the label **ห้องความรู้**. These references remain directly readable; no personal appointment, notebook, game or account is a progress gate.
