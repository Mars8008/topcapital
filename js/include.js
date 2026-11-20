/**
 * Shared layout loader.
 *
 * Every page contains placeholders such as <div data-include="header"></div>.
 * This script replaces them with the matching file from /partials, marks the
 * current menu item as active, and then loads the page scripts in order
 * (they must run AFTER the header exists, otherwise the menu is not initialised).
 *
 * Usage (at the end of <body>):
 *   <script src="js/include.js" data-scripts="js/validation-contact.js"></script>
 *
 * data-scripts: optional, space-separated list of page-specific scripts.
 *
 * Note: fetch() does not work over file:// — open the site through a web server
 * (e.g. `python3 -m http.server`) when testing locally.
 */
(function () {
    'use strict';

    var CORE_SCRIPTS = ['js/vendors.js', 'js/designesia.js'];

    var self = document.currentScript;
    var pageScripts = (self.getAttribute('data-scripts') || '').split(/\s+/).filter(Boolean);

    function includePartial(el) {
        var url = 'partials/' + el.getAttribute('data-include') + '.html';
        return fetch(url)
            .then(function (res) {
                if (!res.ok) throw new Error(url + ' → ' + res.status);
                return res.text();
            })
            .then(function (html) {
                el.outerHTML = html;
            });
    }

    function markActiveMenu() {
        var page = location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('#mainmenu a.menu-item').forEach(function (a) {
            if (a.getAttribute('href') === page) a.classList.add('active');
        });
    }

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = src;
            s.async = false;
            s.onload = resolve;
            s.onerror = function () { reject(new Error('Failed to load ' + src)); };
            document.body.appendChild(s);
        });
    }

    function loadScriptsInOrder(list) {
        return list.reduce(function (chain, src) {
            return chain.then(function () { return loadScript(src); });
        }, Promise.resolve());
    }

    var slots = Array.prototype.slice.call(document.querySelectorAll('[data-include]'));

    Promise.all(slots.map(includePartial))
        .then(markActiveMenu)
        .then(function () { return loadScriptsInOrder(CORE_SCRIPTS.concat(pageScripts)); })
        .then(function () {
            // Theme scripts hide the preloader and lay out galleries on window "load".
            // If that event already fired while we were fetching, fire it again.
            if (document.readyState === 'complete') {
                window.dispatchEvent(new Event('load'));
            }
        })
        .catch(function (err) {
            console.error('[include.js]', err);
            var loader = document.getElementById('de-loader');
            if (loader) loader.style.display = 'none';
        });
})();
