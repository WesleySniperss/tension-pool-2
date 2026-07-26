# VTools Tension Pool

A Foundry VTT implementation of the Angry GM's Time Pool / Tension Pool, built as a
companion to the [VTools](https://github.com/WesleySniperss/vtools) toolbar hub.

Foundry compatibility: **v13 minimum, verified on v14.365**.

## Layout

```
src/scripts/*.ts      source of record — edit these
src/styles/module.css source of record for styling
scripts/module.js     BUILD OUTPUT loaded by Foundry (module.json "esmodules")
styles/module.css     BUILD OUTPUT loaded by Foundry (module.json "styles")
templates/pool.hbs    handlebars template, not built
lang/en.json          localization, not built
```

> **Editing `src/` alone changes nothing in-game.** Foundry loads the built files at
> `scripts/module.js` and `styles/module.css`. Run the build after every source change.

```bash
npm install
npm run build      # writes scripts/module.js + styles/module.css
npm run watch      # rebuild on change
npm run typecheck  # tsc --noEmit
```

`npm run typecheck` needs Foundry's type definitions to be fully clean; without them
the ambient `game` / `foundry` / `Hooks` globals report as unknown. The build itself
does not type-check, so it works regardless.

## Renamed from `tension-pool-2`

This module previously shipped under the id `tension-pool-2`. Everything namespaced
was renamed so both can be installed side by side without colliding: module id,
i18n keys (`VTP.*`), CSS classes (`vtp-*`), the DOM id, the Dice So Nice colorset,
and the public hooks.

Settings stored under the old id are copied across automatically on first launch —
see `src/scripts/migration.ts`. The old values are read, never deleted.

## Public API

Available on every client as `game.modules.get("vtools-tension-pool").api`. The
getters work for anyone; the mutating calls are GM-only and warn otherwise, because
the pool is stored in world-scoped settings.

```js
const api = game.modules.get("vtools-tension-pool").api;
await api.add(3);        // add dice, auto-rolls on overflow
await api.remove(1);
await api.roll();        // roll and clear
await api.clear();
await api.customRoll(4); // roll N dice without touching the pool
api.getDiceCount();
api.getPoolSize();
```

Hooks:

| Hook | Payload |
| --- | --- |
| `vtoolsTensionPoolReady` | the API object |
| `vtoolsTensionPoolRolled` | `{ diceCount, results, hasComplication, complicationCount }` |
| `vtoolsTensionPoolComplication` | same, fired only when a 1 was rolled |

## Roll visibility

The **Roll Visibility** setting applies to the whole event, not just the dice: on
`GM Only`, the roll result, the on-screen banner, the sound and the chat line are
all restricted to GM clients, and players see a single ominous placeholder message.
