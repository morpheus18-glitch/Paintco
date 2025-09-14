# ProPaint Co. — Smart Photo Quotes

A production-ready Next.js site for a painting company with an instant photo quote feature.

## Features
- Marketing site (Home, Services, Contact anchors)
- Smart Photo Quote: drag/drop 1–5 images, inputs (height, coats, finish)
- Serverless API with `sharp`-based image heuristics for fast ballparks
- Pluggable estimator: swap in a CV model later without changing the UI

## Quickstart
```bash
pnpm i   # or npm i / yarn
pnpm dev # http://localhost:3000
