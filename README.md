# TensorLib Verified Dtype Universe

Interactive visualization of [TensorLib](https://github.com/leanprover/TensorLib)'s progress toward mechanized mixed-precision arithmetic semantics.

Each node is a dtype or theorem. Edges show cast relationships (lossless/lossy) and proof dependencies. Nodes fill up as PRs merge.

## Run locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## How it updates

A GitHub Actions workflow runs every 6 hours, fetches merged PRs from `leanprover/TensorLib`, and updates `data.json`. Nodes with a `pr` field get marked complete when that PR merges.

To update manually:

```bash
# requires gh CLI authenticated
node scripts/update-data.js
```

## Adding new nodes

Edit `data.json`. Each node has:

```json
{
  "id": "float8",
  "label": "Float8",
  "category": "float",
  "status": "planned",
  "pr": null
}
```

- `category`: `integer`, `float`, or `theorem`
- `status`: `complete`, `in_progress`, or `planned`
- `pr`: GitHub PR number (node auto-completes when PR merges)

Edges connect nodes:

```json
{ "source": "int8", "target": "bfloat16", "type": "lossless", "verified": true }
```

- `type`: `lossless`, `lossy`, `proves`, or `depends`
- `verified`: whether TensorLib has a proof for this relationship

## Embed in your site

Copy `index.html`, `style.css`, `app.js`, and `data.json` into your static assets. The only external dependency is D3.js loaded from CDN.

Or use an iframe:

```html
<iframe src="path/to/tensorlib-viz/index.html" width="100%" height="600" frameborder="0"></iframe>
```
