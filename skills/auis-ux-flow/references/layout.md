# Layout

Positions are yours to choose: there is no auto-layout. A readable compiled view comes from three decisions: the direction, the lanes, and where the shared cards sit.

## Sizes

- A card is **216 px wide**. Height follows its content: about **100 px** for a title and a note, about **130** for a decision with a question, up to **180** with a note, a route and states.
- `x`, `y` are the card's top-left corner.
- The lane spacings below assume plain cards. If a lane holds tall cards, add the difference (260 instead of 220).

## Direction

| | `direction: "right"` | `direction: "down"` (default) |
|---|---|---|
| Journeys run | left to right | top to bottom |
| Use when | most cases: screens are wide, and the map fills a landscape canvas | long journeys with few lanes; reading order matters more than width |
| Step spacing | **320** between columns | **190** between rows (200+ around decisions) |
| Lane spacing | **220** between lanes | **440** between columns |
| Default edge | out of the right side, into the left | out of the bottom, into the top |

Aim for a board roughly twice as wide as it is tall. A tall narrow board renders small.

## Lanes and the trunk

1. Give each scenario-specific stretch its own **lane**.
2. Put the cards several scenarios share on a **trunk**, between the lanes that use them.
3. Lanes leave the trunk at a gate and come back at a convergence.

```
direction: "right"

lane A        [a1] → [a2] ─┐
                           ▼
trunk  [entry] → <gate> ……… [shared] → [end]
                   │       ▲
lane B             └→ [b1] ─┘
```

With constants:

```js
const COL = (n) => n * 320
const A_Y = 0
const TRUNK_Y = 220
const B_Y = 440
```

A **detour** (a gate sends some people away and they come back) reads best as a small loop next to the lane it leaves: out through one side of the gate, back into the card where the journey resumes, with the return edge as `kind: "cross"`.

## Keep each scenario compact

The lens draws a band around the bounding box of a scenario's cards. If a scenario's cards are scattered across the board, its band swallows other lanes. Keep a scenario to its own lane plus the trunk.

## Edges

- Same lane, next step: no sides needed.
- Changing lanes: leave or enter through the side that faces the other lane. From a trunk gate up to a lane above: `fromSide: "top"`. From a lane back down into a trunk card: `toSide: "top"`.
- Two edges entering the same card should use **different sides**, or they overlap on the last stretch.
- Two parallel lines that still overlap: give one an `offset` (try 30 to 50).
- Every card accepts edges on all four sides, in and out.
- **A hub card with five or more edges** (the screen every journey passes through) cannot give each edge its own side. Group them: everything arriving on the side the journeys come from, everything leaving on the opposite side, and the other two sides for lanes above and below. Edges that share a side should come from the same direction, so they merge instead of crossing; separate their last stretch with `offset`.
- `offset` is how far a line runs straight out of a card before turning. On a U-turn (out and back in through the same side) it is how far the loop sticks out.
- Keep labels short (under 28 characters). The gap between two cards in a row is about 100 px; a long label runs over the cards.

## Check

Run the validator: it reports overlapping cards, a straight edge through a card, a band that covers other journeys, and long labels. It cannot see lines that cross or share a stretch. Open the viewer and look at each lens (`index.html#/<slug>?focus=<scenario-id>`): one connected path, one compact band, no line running through a card. People can drag cards in the viewer and send the new positions back with **Copy for agent**.
