# 🧠 Lingtong Meng — Portfolio

My personal portfolio, built as a flight through a neural network.

Scroll down and you fly from the **input layer** to the **output layer**:
education → skills → experience → projects → me. Keep scrolling and you read the
same story backwards, like backpropagation. 🙂

🌐 **Live:** https://lingtongmeng.com

![forward pass: education → skills → experience → projects](https://img.shields.io/badge/forward%20pass-education%20%E2%86%92%20skills%20%E2%86%92%20experience%20%E2%86%92%20projects-4fe3ff?style=flat-square)
![backward pass: projects → experience → skills → education](https://img.shields.io/badge/backward%20pass-projects%20%E2%86%92%20experience%20%E2%86%92%20skills%20%E2%86%92%20education-ffb45c?style=flat-square)
![three.js 0.173](https://img.shields.io/badge/three.js-0.173-8b5cf6?style=flat-square)
![no build step](https://img.shields.io/badge/build-none-2ea44f?style=flat-square)

---

## 💡 The idea

A résumé is a list. A neural network is a story about how a result came to be.
So I shaped my résumé like a network:

| Stop | What it is in the network | What it is in my life |
|---|---|---|
| 🎓 Input layer | the data that goes in | Education |
| 🧩 Hidden layers | what the network learned | Skills (two layers) |
| 📉 Training | the loss curve going down | Experience, one epoch per role |
| 🚀 Output layer | what the network produces | Projects |
| 👋 Output | the result | A card with my name and links |
| ⏪ Backward pass | gradients flowing back | A plain, readable profile in reverse |

No matter how someone arrives, **projects are the first thing they see**: the
flight ends on them, "Skip intro" lands right after them, and the readable page
starts with them.

## ✨ What you'll see

- 🎥 **One long camera flight.** Scrolling moves the camera. Each layer pauses
  for a moment so you can read it, then flies on.
- 🃏 **Cards that float in 3D.** Every skill tag and card is pinned to a
  glowing node in space. They fade in from far away, grow as you approach, and
  slide past.
- 📈 **A real loss curve.** Experience rides along a glowing orange curve that
  goes down over time, with a little spark running down it and a live "loss"
  number in the corner.
- ⚡ **Data flowing between layers.** Small pulses travel along the connections
  from each layer into the next.
- 🪪 **A landing card** with email, GitHub, LinkedIn and résumé.
- 🦴 **A spine on the readable page.** One node per section lights up as you
  scroll; gradient dots keep falling down the line to the bottom.
- ⏭️ **Skip intro** for people in a hurry.
- 📱 Works on phones (cards stack vertically), respects "reduce motion", and
  still shows the text if WebGL is unavailable.

## 🛠️ Built with

- Plain **HTML + CSS + JavaScript**. No framework, no bundler, no build step.
- **three.js 0.173** for the 3D scene, copied into `vendor/` so nothing depends
  on a CDN.
- A tiny custom shader for the glowing points; everything else is standard
  three.js lines, tubes and sprites.
- The spine on the readable page is pure CSS animation.
- Hosted on **Vercel** as static files.

## 📁 Files

```
index.html   all the content: hero, flight cards, landing card, readable page
style.css    colours, layout, responsive rules
main.js      3D scene, camera path, card placement, pulses, spine
vendor/      three.js
resume.pdf   my résumé
```

## ▶️ Run it locally

The page uses JavaScript modules, so it needs a tiny web server. Opening
`index.html` directly from disk will show only text.

```bash
python -m http.server 5173
```

Then open http://localhost:5173 in your browser. Any static server works.

## ✅ How to check it works

There's no automated test suite; it's a visual project, so you look at it.
Quick checklist after a change:

1. 🖱️ Scroll the whole flight slowly. Every chapter title should appear, pause,
   and hand over to the next without an empty stretch or overlapping cards.
2. 🎯 Jump straight to a chapter from the browser console:
   ```js
   const d = document.querySelector('[data-dive]');
   const goP = p => scrollTo({ top: d.offsetTop + p * (d.offsetHeight - innerHeight) });
   goP(0.185); // education
   goP(0.315); // hidden layer 1
   goP(0.425); // hidden layer 2
   goP(0.55);  // experience
   goP(0.85);  // projects
   goP(1);     // name card
   ```
3. ⏭️ Click **Skip intro** — it should land on the name card.
4. ⬇️ Scroll the readable page to the very bottom — the Contact node on the
   spine should light up.
5. 📱 Shrink the window to phone width — cards stack, nothing overflows.
6. 🐞 Open the console — no errors (a missing favicon 404 is fine for now).
7. 🔗 Click every link. Links that are still `href=""` show as struck-through
   on purpose until they're filled in.

## ✏️ Changing things

- **Text and links:** edit `index.html`. Skills are
  `<span class="tag" data-layer="1">` or `"2"`. Experience cards are
  `<article class="card" data-layer="t">`, oldest first. Projects are
  `data-layer="e"`. Add or remove as many as you like; the layout adapts.
- **How long each layer pauses:** the `KEYS` table in `main.js`. Two rows with
  the same `z` are a pause.
- **Colours:** the variables at the top of `style.css`.
- **Résumé:** replace `resume.pdf`.

## 🚀 Deploy

It's just static files. On Vercel: import the repo, leave *Build Command* and
*Output Directory* empty, deploy, then add your domain under *Settings →
Domains*. Every push to `main` redeploys automatically.

## 🙏 Credits

Inspired by the scroll-through-a-black-hole flight on
[samuelpt.com](https://www.samuelpt.com/). Rebuilt from scratch around a
neural-network story. Made with three.js.
