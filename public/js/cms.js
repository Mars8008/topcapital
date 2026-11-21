/**
 * Renders admin-managed content (from MongoDB via /api) into the page.
 *
 * Markup hooks:
 *   data-cms="<renderer>"      element whose innerHTML is generated (see RENDERERS below)
 *   data-limit="3"             optional max number of items for list renderers
 *   data-bind="contact.email"  sets text (newlines become <br>)
 *   data-bind-src="about.image1"
 *   data-hide-empty            on a section: removed when its renderer has no items
 *
 * include.js calls CMS.render() BEFORE loading the theme scripts, so carousels,
 * tabs, accordions and animations are initialised on the real content.
 */
(function () {
    'use strict';

    // ---------- helpers ----------
    var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return ESC[c]; });
    }
    function nl2br(value) {
        return esc(value).replace(/\r?\n/g, '<br>');
    }
    function paragraphs(value, cls) {
        return String(value || '').split(/\n\s*\n/).filter(function (p) { return p.trim(); })
            .map(function (p) { return '<p' + (cls ? ' class="' + cls + '"' : '') + '>' + nl2br(p.trim()) + '</p>'; })
            .join('');
    }
    // Only allow http(s), mailto/tel, root-relative and plain relative URLs.
    function safeUrl(value) {
        var u = String(value || '').trim();
        if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(u) || /^[\w.-]+(\/[\w.\-%]*)*(\?[^:]*)?$/.test(u)) return esc(u);
        return '';
    }
    function get(obj, path) {
        return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
    }
    function delay(i, step) {
        return ((i * (step || 0.2)).toFixed(1)).replace(/^0/, '') + 's';
    }
    function query(name) {
        return new URLSearchParams(location.search).get(name);
    }
    function serviceUrl(s) { return 'service-single.html?slug=' + encodeURIComponent(s.slug); }
    function projectUrl(p) { return 'project-single.html?slug=' + encodeURIComponent(p.slug); }
    function limit(el, list) {
        var n = parseInt(el.getAttribute('data-limit'), 10);
        return n > 0 ? list.slice(0, n) : list;
    }
    function api(path) {
        return fetch('/api/' + path, { headers: { Accept: 'application/json' } }).then(function (res) {
            if (!res.ok) throw Object.assign(new Error(path + ' → ' + res.status), { status: res.status });
            return res.json();
        });
    }
    function stars(n) {
        return new Array(Math.max(1, Math.min(5, n || 5)) + 1).join('<i class="fa fa-star"></i>');
    }
    function whatsappUrl(v) {
        var digits = String(v || '').replace(/\D/g, '');
        return /^https?:/i.test(v) ? v : (digits ? 'https://wa.me/' + digits : '');
    }

    // ---------- shared fragments ----------
    function serviceCard(s, i) {
        return '' +
            '<div class="col-lg-4 col-sm-6">' +
            '  <div class="hover rounded-1 overflow-hidden relative text-light text-center wow fadeInRight" data-wow-delay="' + delay(i, 0.3) + '">' +
            '    <img src="' + safeUrl(s.image) + '" class="hover-scale-1-1 w-100" alt="' + esc(s.title) + '">' +
            '    <div class="abs w-100 px-4 hover-op-1 z-4 hover-mt-40 abs-centered">' +
            '      <div class="mb-3">' + esc(s.summary) + '</div>' +
            '      <a class="btn-line" href="' + serviceUrl(s) + '">View Details</a>' +
            '    </div>' +
                   (s.icon ? '<img src="' + safeUrl(s.icon) + '" class="abs abs-centered w-20 z-2" alt="">' : '') +
            '    <div class="abs bg-color z-2 top-0 w-100 h-100 hover-op-1"></div>' +
            '    <div class="abs z-2 bottom-0 mb-3 w-100 text-center hover-op-0"><h3 class="hs-4 mb-3">' + esc(s.title) + '</h3></div>' +
            '    <div class="gradient-edge-bottom color abs w-100 h-70 bottom-0"></div>' +
            '  </div>' +
            '</div>';
    }

    function projectCard(p, titleTag, titleClass) {
        var tags = [p.location, p.duration].filter(Boolean).map(function (t) {
            return '<span class="me-3 bg-light px-3 fs-14 rounded-1">' + esc(t) + '</span>';
        }).join('');
        return '' +
            '<div class="hover rounded-1 overflow-hidden relative mb-4">' +
            '  <a href="' + projectUrl(p) + '"><img src="' + safeUrl(p.coverImage) + '" class="w-100 hover-scale-1-2" alt="' + esc(p.title) + '"></a>' +
            '</div>' +
            '<' + titleTag + (titleClass ? ' class="' + titleClass + '"' : '') + '><a href="' + projectUrl(p) + '" class="text-dark">' + esc(p.title) + '</a></' + titleTag + '>' +
            (tags ? '<div class="d-flex flex-wrap gap-2 mb-3">' + tags + '</div>' : '') +
            '<p class="mb-0">' + esc(p.summary) + '</p>';
    }

    function pageHero(title, image) {
        return '' +
            '<section class="jarallax relative overflow-hidden z-1000 mt-80">' +
            '  <img src="' + safeUrl(image || 'images/background/1.webp') + '" class="jarallax-img" alt="">' +
            '  <div class="sw-overlay op-2"></div>' +
            '  <div class="gradient-edge-start light w-40 start-40 op-9 z-2"></div>' +
            '  <div class="abs w-40 h-100 bg-white top-0 start-0 op-9 z-2"></div>' +
            '  <div class="container relative z-2"><div class="row wow fadeInRight"><div class="col-lg-10">' +
            '    <h1 class="fs-sm-10vw mb-0">' + esc(title) + '</h1>' +
            '    <ul class="crumb"><li><a href="index.html">Home</a></li><li class="active">' + esc(title) + '</li></ul>' +
            '  </div></div></div>' +
            '</section>';
    }

    function notFound(what, back) {
        return pageHero(what + ' not found') +
            '<section><div class="container text-center">' +
            '<p>The ' + what.toLowerCase() + ' you are looking for does not exist or was removed.</p>' +
            '<a class="btn-main" href="' + back + '">Back</a></div></section>';
    }

    // ---------- renderers: (element, site) → html string | Promise<string> ----------
    var RENDERERS = {
        'services-grid': function (el, site) {
            return limit(el, site.services).map(serviceCard).join('');
        },

        'footer-services': function (el, site) {
            return limit(el, site.services).map(function (s) {
                return '<li><a href="' + serviceUrl(s) + '">' + esc(s.title) + '</a></li>';
            }).join('');
        },

        'service-detail': function (el, site) {
            var slug = query('slug') || (site.services[0] && site.services[0].slug);
            if (!slug) return notFound('Service', 'services.html');
            return api('services/' + encodeURIComponent(slug)).then(function (s) {
                document.title = s.title + ' | TOP CAPITAL LLC';
                var sidebar = site.services.map(function (o) {
                    var active = o.slug === s.slug;
                    return '<a href="' + serviceUrl(o) + '" class="' + (active ? 'bg-color text-light' : 'bg-light') + ' d-block p-3 px-4 rounded-10px mb-3 relative">' +
                        '<h5 class="mb-0">' + esc(o.title) + '</h5>' +
                        (active ? '<i class="icofont-long-arrow-right absolute abs-middle fs-24 end-20px"></i>' : '') + '</a>';
                }).join('');

                var highlight = s.highlightTitle || s.highlightText ? '' +
                    '<div class="spacer-single"></div>' +
                    '<div class="bg-light rounded-1 p-40 mb-5 wow fadeInUp"><div class="row align-items-center g-4">' +
                    (s.highlightValue ? '<div class="col-lg-3 text-center"><h2 class="fs-72 id-color mb-0">' + esc(s.highlightValue) + '</h2><p class="mb-0">' + esc(s.highlightLabel) + '</p></div>' : '') +
                    '<div class="col-lg-' + (s.highlightValue ? 9 : 12) + '"><h4 class="mb-3">' + esc(s.highlightTitle) + '</h4><p class="mb-0">' + nl2br(s.highlightText) + '</p></div>' +
                    '</div></div>' : '';

                var beforeAfter = s.beforeImage && s.afterImage ? '' +
                    '<div class="twentytwenty-container rounded-1 wow fadeInRight">' +
                    '<img src="' + safeUrl(s.beforeImage) + '" alt="Before" class="img-responsive">' +
                    '<img src="' + safeUrl(s.afterImage) + '" alt="After" class="img-responsive"></div>' +
                    '<div class="spacer-double"></div>' : '';

                var features = (s.features || []).length ? '' +
                    '<div class="row g-4">' + s.features.map(function (f, i) {
                        return '<div class="col-lg-6 wow fadeInUp" data-wow-delay="' + delay(i) + '"><div class="relative">' +
                            '<i class="' + esc(f.icon || 'fa-solid fa-check') + ' bg-color-op-2 id-color fs-32 pt-4 w-80px h-80px text-center absolute rounded-1"></i>' +
                            '<div class="ps-100"><h4>' + esc(f.title) + '</h4><p class="mb-0">' + nl2br(f.text) + '</p></div></div></div>';
                    }).join('') + '</div><div class="spacer-double"></div>' : '';

                var cta = s.ctaTitle ? '' +
                    '<div class="bg-color text-light rounded-1 p-40 relative overflow-hidden wow fadeInUp"><div class="row align-items-center g-3">' +
                    '<div class="col-lg-8"><h4 class="mb-2">' + esc(s.ctaTitle) + '</h4><p class="mb-0">' + nl2br(s.ctaText) + '</p></div>' +
                    '<div class="col-lg-4 text-lg-end"><a href="get-a-quote.html" class="btn-main bg-white text-dark">Get Free Consultation</a></div>' +
                    '</div></div>' : '';

                return pageHero(s.title) +
                    '<section><div class="container"><div class="row g-5">' +
                    '  <div class="col-lg-3">' + sidebar + '</div>' +
                    '  <div class="col-lg-9">' +
                    '    <div class="row g-4 gx-5 align-items-center">' +
                    '      <div class="col-lg-6"><div class="subtitle wow fadeInUp">' + esc(s.title) + '</div>' +
                    '        <h2 class="fs-40">' + esc(s.heading || s.title) + '</h2>' + paragraphs(s.content || s.summary) + '</div>' +
                    '      <div class="col-lg-6">' + (s.image ? '<img src="' + safeUrl(s.image) + '" class="img-fluid rounded-20px mb-4" alt="' + esc(s.title) + '">' : '') + '</div>' +
                    '    </div>' +
                         highlight + beforeAfter + features + cta +
                    '  </div>' +
                    '</div></div></section>';
            }).catch(function (err) {
                if (err.status === 404) return notFound('Service', 'services.html');
                throw err;
            });
        },

        'projects-grid': function (el, site) {
            return limit(el, site.projects).map(function (p) {
                return '<div class="col-md-4 col-sm-6">' + projectCard(p, 'h4') + '</div>';
            }).join('');
        },

        'projects-carousel': function (el, site) {
            var exclude = el.getAttribute('data-exclude-current') !== null ? query('slug') : null;
            return limit(el, site.projects.filter(function (p) { return p.slug !== exclude; }))
                .map(function (p) { return '<div class="item">' + projectCard(p, 'h3', 'hs-4') + '</div>'; })
                .join('');
        },

        'project-detail': function (el, site) {
            var slug = query('slug') || (site.projects[0] && site.projects[0].slug);
            if (!slug) return notFound('Project', 'projects.html');
            return api('projects/' + encodeURIComponent(slug)).then(function (p) {
                document.title = p.title + ' | TOP CAPITAL LLC';
                var meta = [['Category', p.category], ['Year', p.year], ['Location', p.location]]
                    .filter(function (m) { return m[1]; })
                    .map(function (m) { return '<div class="me-4 me-lg-5">' + m[0] + '<div class="hs-5">' + esc(m[1]) + '</div></div>'; })
                    .join('');
                var story = [['Project Brief', p.brief], ['Our Solution', p.solution]]
                    .filter(function (b) { return b[1]; })
                    .map(function (b) { return '<div class="col-md-6"><h3>' + b[0] + '</h3>' + paragraphs(b[1]) + '</div>'; })
                    .join('');
                var gallery = (p.gallery || []).map(function (img) {
                    var u = safeUrl(img);
                    return '<div class="col-lg-4 col-sm-6"><a href="' + u + '" class="image-popup d-block hover">' +
                        '<div class="relative overflow-hidden rounded-1">' +
                        '<div class="absolute start-0 w-100 hover-op-1 p-5 abs-middle z-2 text-center text-white z-3">View</div>' +
                        '<div class="absolute start-0 w-100 h-100 overlay-black-5 hover-op-1 z-2"></div>' +
                        '<img src="' + u + '" class="w-100 hover-scale-1-2" alt=""></div></a></div>';
                }).join('');
                var divider = '<div class="spacer-double"></div><div class="border-bottom"></div><div class="spacer-double"></div>';

                return '' +
                    '<section class="jarallax relative overflow-hidden z-1000 mt-80 mt-sm-50 p-0">' +
                    '  <img src="' + safeUrl(p.heroImage || p.coverImage) + '" class="w-100 wow scaleIn" alt="' + esc(p.title) + '">' +
                    '</section>' +
                    '<section><div class="container">' +
                    '  <div class="row g-4 align-items-center">' +
                    '    <div class="col-lg-7"><h2>' + esc(p.title) + '</h2><div class="d-flex flex-wrap">' + meta + '</div></div>' +
                    '    <div class="col-lg-5">' + paragraphs(p.description || p.summary, 'lead') + '</div>' +
                    '  </div>' +
                    (story ? divider + '<div class="row g-4">' + story + '</div>' : '') +
                    (gallery ? divider + '<div class="row g-4"><div class="col-lg-12"><h3 class="mb-0">Project Gallery</h3></div>' + gallery + '</div>' : '') +
                    '</div></section>';
            }).catch(function (err) {
                if (err.status === 404) return notFound('Project', 'projects.html');
                throw err;
            });
        },

        'about-highlights': function (el, site) {
            return (site.about.highlights || []).map(function (h, i) {
                return '<div class="col-md-3 col-sm-6 wow fadeInUp" data-wow-delay="' + delay(i + 3, 0.1) + '"><div class="relative">' +
                    '<span class="abs w-70px p-3 circle bg-color-op-2 d-block"><img src="images/icons-color/check.png" class="w-100" alt=""></span>' +
                    '<div class="ps-90"><h3 class="hs-4">' + esc(h) + '</h3></div></div></div>';
            }).join('');
        },

        // index.html: large cards with title, photo and rating
        'testimonials-cards': function (el, site) {
            return site.testimonials.map(function (t, i) {
                return '<div class="item"><div class="relative">' +
                    '<div class="abs fs-84 lh-1 id-color">' + String(i + 1).padStart(2, '0') + '</div>' +
                    '<div class="ms-100px ps-3">' +
                    (t.title ? '<h3 class="fs-32 col-lg-6 mb-4 lh-1-4">"' + esc(t.title) + '"</h3>' : '') +
                    '<p>"' + esc(t.text) + '"</p></div>' +
                    '<div class="border-bottom op-3 my-4"></div>' +
                    '<div class="d-flex justify-content-between"><div class="d-flex align-items-center">' +
                    (t.photo ? '<img class="w-70px circle me-3" src="' + safeUrl(t.photo) + '" alt="">' : '') +
                    '<div class="ps-4"><div class="hs-5 mb-1 fw-500 lh-1">' + esc(t.name) + '</div><small>' + esc(t.role) + '</small></div></div>' +
                    '<div class="de-rating-ext mt-4 xs-hide"><span class="d-stars">' + stars(t.rating) + '</span>' +
                    '<span class="ms-2 text-white">' + (t.rating || 5).toFixed(1) + '</span></div>' +
                    '</div></div></div>';
            }).join('');
        },

        // about.html: single centred quote slider
        'testimonials-quotes': function (el, site) {
            return site.testimonials.map(function (t) {
                return '<div class="item">' +
                    '<span class="d-stars id-color d-block mb-3">' + stars(t.rating) + '</span>' +
                    '<h3 class="mb-4 wow fadeInUp fs-36">' + esc(t.text) + '</h3>' +
                    '<span class="wow fadeInUp">' + esc(t.name) + '</span></div>';
            }).join('');
        },

        'team': function (el, site) {
            return site.team.map(function (m) {
                var socials = [['facebook', 'fa-facebook-f'], ['instagram', 'fa-instagram'], ['linkedin', 'fa-linkedin-in']]
                    .filter(function (s) { return m[s[0]]; })
                    .map(function (s) {
                        return '<a href="' + safeUrl(m[s[0]]) + '" target="_blank" rel="noopener"><i class="bg-color-op-2 id-color bg-hover-2 text-hover-white fa-brands ' + s[1] + '"></i></a>';
                    }).join('');
                return '<div class="col-lg-3 col-sm-6 text-center">' +
                    '<div class="bg-white relative border-gray rounded-1 overflow-hidden">' +
                    (m.photo ? '<img src="' + safeUrl(m.photo) + '" class="w-100" alt="' + esc(m.name) + '">' : '<div class="ratio ratio-1x1 bg-light"></div>') +
                    '<div class="abs w-100 start-0 bottom-0 z-3"><div class="p-40 text-light relative z-2">' +
                    '<h3 class="mb-0 text-uppercase lh-1-2">' + esc(m.name) + '</h3></div>' +
                    '<div class="gradient-edge-bottom color h-100"></div></div></div>' +
                    '<h4 class="mt-3">' + esc(m.role) + '</h4>' +
                    (socials ? '<div class="social-icons">' + socials + '</div>' : '') +
                    '</div>';
            }).join('');
        },

        'faq': function (el, site) {
            var groups = [];
            site.faq.forEach(function (f) {
                var g = groups.filter(function (x) { return x.name === f.category; })[0];
                if (!g) groups.push(g = { name: f.category || 'General', items: [] });
                g.items.push(f);
            });
            if (!groups.length) return '';
            var prefix = 'faq-' + Math.random().toString(36).slice(2, 7);
            var nav = groups.map(function (g, i) {
                return '<li' + (i === 0 ? ' class="active-tab"' : '') + '>' + esc(g.name) + '</li>';
            }).join('');
            var content = groups.map(function (g, gi) {
                return '<li><div class="accordion"><div class="accordion-section">' + g.items.map(function (f, fi) {
                    var id = prefix + '-' + gi + '-' + fi;
                    return '<div class="accordion-s1">' +
                        '<div class="accordion-section-title" data-tab="#' + id + '">' + esc(f.question) + '</div>' +
                        '<div class="accordion-section-content" id="' + id + '">' + nl2br(f.answer) + '</div></div>';
                }).join('') + '</div></div></li>';
            }).join('');
            return '<ul class="d-tab-nav mb-4">' + nav + '</ul><ul class="d-tab-content">' + content + '</ul>';
        },

        'contact-info': function (el, site) {
            var c = site.contact;
            return [
                ['icofont-location-pin', 'Address', esc(c.address)],
                ['icofont-envelope', 'Email', c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>' : ''],
                ['icofont-phone', 'Phone', c.phone ? '<a href="tel:' + esc(c.phone.replace(/[^\d+]/g, '')) + '">' + esc(c.phone) + '</a>' : ''],
                ['icofont-clock-time', 'Working Hours', nl2br(c.hours)],
            ].filter(function (r) { return r[2]; }).map(function (r) {
                return '<div class="col-md-6"><i class="abs fs-28 p-3 bg-color text-light rounded-1 ' + r[0] + '"></i>' +
                    '<div class="ms-80px"><h4 class="mb-0">' + r[1] + '</h4>' + r[2] + '</div></div>';
            }).join('');
        },

        'contact-map': function (el, site) {
            var src = site.contact.mapEmbedUrl;
            if (!/^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/.test(src || '')) return '';
            return '<iframe src="' + esc(src) + '" class="w-100 rounded-1" height="400" style="border:0" loading="lazy" ' +
                'referrerpolicy="no-referrer-when-downgrade" allowfullscreen title="Map"></iframe>';
        },

        'social-links': function (el, site) {
            var c = site.contact;
            return [['facebook', 'fa-facebook-f', c.facebook], ['instagram', 'fa-instagram', c.instagram], ['whatsapp', 'fa-whatsapp', whatsappUrl(c.whatsapp)]]
                .filter(function (s) { return s[2]; })
                .map(function (s) {
                    return '<a href="' + safeUrl(s[2]) + '" target="_blank" rel="noopener" aria-label="' + s[0] + '"><i class="fa-brands ' + s[1] + '"></i></a>';
                }).join('');
        },
    };

    function applyBindings(site) {
        document.querySelectorAll('[data-bind]').forEach(function (el) {
            var v = get(site, el.getAttribute('data-bind'));
            if (v != null && v !== '') el.innerHTML = nl2br(v);
        });
        document.querySelectorAll('[data-bind-src]').forEach(function (el) {
            var v = safeUrl(get(site, el.getAttribute('data-bind-src')));
            if (v) el.setAttribute('src', v.replace(/&amp;/g, '&'));
        });
    }

    function renderElement(el, site) {
        var name = el.getAttribute('data-cms');
        var fn = RENDERERS[name];
        if (!fn) return Promise.resolve(console.warn('[cms] unknown renderer', name));
        return Promise.resolve(fn(el, site)).then(function (html) {
            var section = el.closest('[data-hide-empty]');
            if (!html && section) section.remove();
            else el.innerHTML = html;
        });
    }

    window.CMS = {
        render: function () {
            // include.js starts this request early so it runs in parallel with the partials.
            return (window.CMS_SITE || api('site')).then(function (site) {
                window.CMS.site = site;
                applyBindings(site);
                var els = Array.prototype.slice.call(document.querySelectorAll('[data-cms]'));
                return Promise.all(els.map(function (el) { return renderElement(el, site); }));
            });
        },
    };
})();
