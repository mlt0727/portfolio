# 🧠 Lingtong Meng — Portfolio

Hi! I'm Lingtong, a Data Science & AI student at Florida International
University. This is my portfolio, and instead of a page you read, it's a
network you fly through.

👉 **See it live: https://lingtongmeng.com**

![forward pass](https://img.shields.io/badge/forward%20pass-education%20%E2%86%92%20skills%20%E2%86%92%20experience%20%E2%86%92%20projects-4fe3ff?style=flat-square)
![backward pass](https://img.shields.io/badge/backward%20pass-projects%20%E2%86%92%20experience%20%E2%86%92%20skills%20%E2%86%92%20education-ffb45c?style=flat-square)
![three.js](https://img.shields.io/badge/three.js-0.173-8b5cf6?style=flat-square)
![no build step](https://img.shields.io/badge/build-none-2ea44f?style=flat-square)

---

## 💡 Why a neural network?

A résumé is a list. A neural network is a story about how a result came to be.
I study data science, so I told my story the way a model learns:

| Stop | In the network | In my life |
|---|---|---|
| 🎓 Input layer | the data going in | My degree at FIU |
| 🧩 Hidden layers | what the network learned | My skills, two layers of them |
| 📉 Training | the loss curve going down | My experience, one epoch per role |
| 🚀 Output layer | what the network produces | My projects |
| 👋 Output | the result | Me, with links to reach me |
| ⏪ Backward pass | gradients flowing back | The same profile, plain and readable, in reverse |

Scrolling down is the forward pass. Keep scrolling past my name and you get the
backward pass: everything again, output to input, in a format you can skim in
thirty seconds. In a hurry? There's a **Skip intro** button that takes you
straight to the end.

## ✨ What's in the flight

- 🎥 **One continuous camera ride.** Your scroll wheel is the throttle. Each
  layer pauses long enough to read, then the camera moves on.
- 🃏 **Cards floating in 3D.** Every skill and project is attached to a glowing
  node in space. They appear far away, grow as you approach, and drift past.
- 📈 **A loss curve for a career.** My experience runs along an orange curve
  that keeps going down, with a spark racing along it and a live loss readout
  in the corner.
- ⚡ **Data flowing between layers.** Pulses travel along the connections from
  each layer into the next, so you can see the signal move.
- 🦴 **A spine down the readable page.** One node per section lights up as you
  scroll, and gradient dots keep falling toward the bottom.
- 📱 Works on phones, respects "reduce motion", and still reads fine without
  WebGL.

## 🛠️ How it's built

- Plain **HTML, CSS and JavaScript**. No framework, no bundler, no build step.
- **three.js** for the 3D scene (WebGL), vendored so nothing depends on a CDN.
- A small custom shader draws the glowing points; the loss curve is a tube,
  the links are line segments, the pulses are points moving along them.
- All content is ordinary HTML. Each card carries a `data-layer` attribute and
  the script turns it into a neuron, connects it, and keeps it tethered to its
  spot in space as the camera moves.
- The camera follows a keyframe table driven by scroll position, so the whole
  experience is deterministic: the same scroll always shows the same frame.
- Deployed on **Vercel** as static files.

## ▶️ Run it locally

Clone the repo and serve the folder with any static server (the page uses
JavaScript modules, so it won't run straight from the file system):

```bash
git clone https://github.com/mlt0727/portfolio.git
cd portfolio
python -m http.server 5173
```

Then open http://localhost:5173.

Want to poke at a specific chapter? Paste this in the browser console:

```js
const d = document.querySelector('[data-dive]');
const goP = p => scrollTo({ top: d.offsetTop + p * (d.offsetHeight - innerHeight) });
goP(0.185); // education      goP(0.55); // experience
goP(0.315); // hidden layer 1 goP(0.85); // projects
goP(0.425); // hidden layer 2 goP(1);    // name card
```

## 🧭 Fork it

Feel free to use this as a starting point for your own. Everything you'd
change lives in two places:

- `index.html` — the text, links and cards. Add a skill by adding a `<span>`,
  add a project by adding an `<article>`; the layout adapts.
- `main.js` — the `KEYS` table sets how long each layer pauses, `LAYERS` sets
  where each chapter sits in space.
