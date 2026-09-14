# Quell

Chained OLL / PLL flashcards. Learn holds the card. Look up is a sheet over the session. Practice starts a subset.

The big picture is the case to execute. Reveal the alg when you need it; check the compounded last-layer after that alg on the cube you already have. Next always chains. If the case still has no name, Next asks for one before moving on.

The name sits in the diagram box, just above the picture — your name if you gave one, otherwise `OLL 13` / `T`. Click it to rename.

### Flow
- **Learn** — the flashcard. Mid-solve, **Look up** opens a sheet over the same card (chain, alg, and check stay put). Match a diagram; the alg docks above **Done**. Search is optional and not focused, so a cube in the other hand does not pop the keyboard.
- **Practice** — start a subset. One tap on OCLL, G, T, All PLL, … begins that queue on Learn. This page is not a catalog.
- **OLL / PLL** — last layer only. On Learn they change the session; on Practice they pick which queues to start; inside Look up they browse without touching the chain.
- **Top** — the case. **3D** — the cube in your hands.
- **Alg** — tap to reveal the moves; tap again to play.
- **After this alg** — tap to see the last layer you should have.
- **Menu** — local accounts. Names (and later training stats) live per account.

Algs follow [SolveTheCube](https://solvethecube.com/algorithms): easy to memoise and turn, built around sexy `(R U R' U')`, sledge `(R' F R F')`, and `(R U R' U)`.

Progress lives in the browser (`localStorage` + IndexedDB) so names survive deploys on the same origin. Space = next, R = reveal alg, L = look up, Escape = close look up / back to Learn.

Ship each pass to **https://quellcube.vercel.app**. Do not leave work sitting on a preview.

## Live

- **App:** https://quellcube.vercel.app
- **Linear:** [Quell](https://linear.app/menhir-holdings/project/quell-4c873f24ef7f) — authoritative SoT; see [STATUS.md](./STATUS.md)
- **Repo:** https://github.com/menhir-holdings/quell

## Issues

| ID | Title | Status |
|----|-------|--------|
| [MT-227](https://linear.app/menhir-holdings/issue/MT-227) | Learn overlay lookup + Practice start hub | In Review |
| [MT-198](https://linear.app/menhir-holdings/issue/MT-198) | Name in diagram, Change case, persist names | Done |
| [MT-197](https://linear.app/menhir-holdings/issue/MT-197) | Single chained flashcard + local accounts | Done |
| [MT-196](https://linear.app/menhir-holdings/issue/MT-196) | Learn unlearned chain states (superseded) | Canceled |
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
- Static alg data + localStorage / IndexedDB accounts

## License

All Rights Reserved © Menhir Holdings
