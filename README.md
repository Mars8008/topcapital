# topcapital

TOP CAPITAL LLC website (static HTML).

## Structure

```
*.html            pages — each contains only its own <main> content
partials/         shared layout, edited in ONE place
  header.html     logo + main menu
  footer.html     contact info, links, copyright
js/include.js     inserts the partials, marks the active menu item,
                  then loads vendors.js + designesia.js (+ page scripts)
css/, js/, images/, fonts/   theme assets
contact.php, get-a-quote.php form handlers (need a PHP server)
```

## Adding a new page

Copy any page (e.g. `services.html`), change the `<title>` and the `<main>` content.
Page-specific scripts go in `data-scripts`:

```html
<script src="js/include.js" data-scripts="js/validation-contact.js"></script>
```

## Running locally

The partials are loaded with `fetch()`, which does not work when opening the
file directly (`file://`). Start a local server instead:

```
python3 -m http.server 8000
```

then open http://localhost:8000
