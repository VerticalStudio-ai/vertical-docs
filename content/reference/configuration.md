---
title: Site configuration
description: Set the site name, the repository link and the accent colour, and replace the logo and the favicon.
order: 3
---

A site is branded with one configuration file and two images. Change `docs.config.json` for the name, the repository link and the accent colour, and replace `public/logo.svg` and `public/favicon.svg` for the logo.

## docs.config.json

```json
{
	"name": "docs-kit",
	"repo": "https://github.com/ztsrdev/docs-kit",
	"accent": "#171717"
}
```

| Field | Used for |
|---|---|
| `name` | The text next to the logo and the end of the browser tab title. |
| `repo` | The GitHub link in the header. |
| `accent` | The colour of links, the current page in the sidebar, the focus ring and the edge of a callout. |

## Accent colour

`accent` is one CSS colour, such as `#0070f3`. The site keeps the hue and adjusts the lightness for each theme, so the same colour is readable on the light and on the dark background.

The default, `#171717`, is a neutral colour: the site is black on white in the light theme and white on black in the dark theme.

## Logo and favicon

| File | Shown |
|---|---|
| `public/logo.svg` | In the header, 20 pixels high, next to the name. |
| `public/favicon.svg` | In the browser tab. |

The logo is placed in the page as inline SVG. Draw it with `fill="currentColor"` and the logo takes the text colour of the theme.
