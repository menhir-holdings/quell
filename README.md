# Quell

Learn full OLL and PLL by practicing the cases you keep.

Two lists: **Learn** (not in rotation yet) and **Practice** (the ones you are drilling). Name a case whatever helps you remember it — that name shows on the case screen and on the selection grid.

### Flow
- **OLL / PLL** — last layer only.
- **Learn** — pick a case, optional custom name, mark it **Learned** to move it into practice. The next unlearned case stays where you were in the list.
- **Practice** — one flow. Execute the alg from a known start (last layer oriented for OLL, solved for PLL). No get-to scramble.
  - **Random / Pick** — how **Next** chooses. Persists until you change it. Tapping a grid cell jumps once and leaves that choice alone.
  - **Chain** — keep the cube from the last alg and compound. Off = each round starts fresh.
  - Tap the check card to see the end-state top view; tap again to play it in 3D.
- **Menu** — reset every learned case back to Learn. Names stay.

Algs follow [SolveTheCube](https://solvethecube.com/algorithms): easy to memoise and turn, built around sexy `(R U R' U')`, sledge `(R' F R F')`, and `(R U R' U)`.

Progress lives in the browser (`localStorage`). Space = next in Practice, R = reveal.

## Live

- **App:** https://quellcube.vercel.app
- **Linear:** [Quell](https://linear.app/menhir-holdings/project/quell-4c873f24ef7f) — authoritative SoT; see [STATUS.md](./STATUS.md)
- **Repo:** https://github.com/menhir-holdings/quell

## Issues

| ID | Title | Status |
|----|-------|--------|
| [MT-195](https://linear.app/menhir-holdings/issue/MT-195) | Practice chaining, unified next | Done |
| [MT-194](https://linear.app/menhir-holdings/issue/MT-194) | STC 2D, alg-card reveal, Learned | Done |
| [MT-193](https://linear.app/menhir-holdings/issue/MT-193) | OLL/PLL learn + practice UX | Done |
| [MT-192](https://linear.app/menhir-holdings/issue/MT-192) | v1 trainer (superseded UX) | Closed |

## Develop

```bash
npm install
npm run dev
```

## Stack

- Vite + TypeScript
- `cubing` (TwistyPlayer) as an MPL library
- Static alg data + localStorage progress

## License

All Rights Reserved © Menhir Holdings
