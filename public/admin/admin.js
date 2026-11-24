/* TOP CAPITAL — admin panel (vanilla JS single-page app, hash routing). */
(function () {
    'use strict';

    // =====================================================================
    // Helpers
    // =====================================================================
    var $ = function (sel, root) { return (root || document).querySelector(sel); };
    var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

    var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }

    // Site images are stored relative to the site root ("images/x.webp"); make them work from /admin/.
    function imgSrc(u) {
        u = String(u || '').trim();
        if (!u) return '';
        return /^(https?:)?\/\//.test(u) || u.charAt(0) === '/' ? u : '/' + u;
    }

    function formatDate(iso) {
        var d = new Date(iso);
        return isNaN(d) ? '' : d.toLocaleString('mn-MN', { dateStyle: 'medium', timeStyle: 'short' });
    }

    function toast(text, type) {
        var el = document.createElement('div');
        el.className = 'toast-msg ' + (type || '');
        el.textContent = text;
        $('#toasts').appendChild(el);
        setTimeout(function () { el.remove(); }, type === 'error' ? 6000 : 3000);
    }

    function api(method, path, body) {
        var opts = { method: method, credentials: 'same-origin', headers: { Accept: 'application/json' } };
        if (body instanceof FormData) {
            opts.body = body;
        } else if (body !== undefined) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }
        return fetch('/api/' + path, opts).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) {
                if (res.status === 401 && path !== 'auth/login') {
                    showLogin();
                }
                if (!res.ok) throw new Error(data.error || ('Алдаа (' + res.status + ')'));
                return data;
            });
        });
    }

    function uploadImage(file) {
        var fd = new FormData();
        fd.append('file', file);
        return api('POST', 'admin/media', fd).then(function (r) { return r.url; });
    }

    // Run an async action with a disabled button and error toast.
    function busy(btn, promise) {
        var label = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = 'Түр хүлээнэ үү…';
        return promise.catch(function (err) {
            toast(err.message, 'error');
            throw err;
        }).finally(function () {
            btn.disabled = false;
            btn.innerHTML = label;
        });
    }

    // =====================================================================
    // Schema-driven form builder
    //
    // Field: { name, label, type, help, rows, required, placeholder, fields (for list), scalar (list of plain values) }
    // Types: text | textarea | number | checkbox | image | select | list
    // Section header: { section: 'Title' }
    // =====================================================================
    var uid = 0;

    function fieldHtml(f, value, prefixAttr) {
        var id = 'f' + (++uid);
        var attr = prefixAttr + '="' + esc(f.name) + '"';
        var help = f.help ? '<div class="form-text">' + esc(f.help) + '</div>' : '';
        var label = '<label class="form-label" for="' + id + '">' + esc(f.label) + (f.required ? ' <span class="text-danger">*</span>' : '') + '</label>';
        var common = 'id="' + id + '" ' + attr + (f.required ? ' required' : '') + (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '');
        var col = f.col || 'col-12';

        switch (f.type) {
            case 'textarea':
                return '<div class="' + col + '">' + label + '<textarea class="form-control" rows="' + (f.rows || 4) + '" ' + common + '>' + esc(value) + '</textarea>' + help + '</div>';
            case 'number':
                return '<div class="' + col + '">' + label + '<input type="number" class="form-control" ' + common + ' value="' + esc(value) + '"' + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '') + '>' + help + '</div>';
            case 'checkbox':
                return '<div class="' + col + '"><div class="form-check form-switch"><input type="checkbox" class="form-check-input" ' + common + (value ? ' checked' : '') + '>' +
                    '<label class="form-check-label" for="' + id + '">' + esc(f.label) + '</label></div>' + help + '</div>';
            case 'select':
                return '<div class="' + col + '">' + label + '<select class="form-select" ' + common + '>' + f.options.map(function (o) {
                    return '<option value="' + esc(o) + '"' + (String(value) === String(o) ? ' selected' : '') + '>' + esc(o) + '</option>';
                }).join('') + '</select>' + help + '</div>';
            case 'image':
                return '<div class="' + col + '">' + label +
                    '<div class="image-field" data-image-field>' +
                    '  <img class="preview" alt="" src="' + esc(imgSrc(value)) + '"' + (value ? '' : ' style="visibility:hidden"') + '>' +
                    '  <div class="controls">' +
                    '    <input type="text" class="form-control mb-2" ' + common + ' value="' + esc(value) + '" placeholder="Зургийн холбоос эсвэл доорх товчоор оруулна">' +
                    '    <label class="btn btn-sm btn-outline-secondary mb-0">Зураг сонгох…<input type="file" accept="image/*" hidden data-upload></label>' +
                    '    <button type="button" class="btn btn-sm btn-link text-danger" data-clear-image>Арилгах</button>' +
                    '  </div>' +
                    '</div>' + help + '</div>';
            case 'list':
                return '<div class="' + col + '">' + (f.label ? '<label class="form-label">' + esc(f.label) + '</label>' : '') + help +
                    '<div data-list="' + esc(f.name) + '"></div>' +
                    '<button type="button" class="btn btn-sm btn-outline-secondary" data-add="' + esc(f.name) + '">+ ' + esc(f.addLabel || 'Нэмэх') + '</button></div>';
            default:
                return '<div class="' + col + '">' + label + '<input type="text" class="form-control" ' + common + ' value="' + esc(value) + '">' + help + '</div>';
        }
    }

    function readField(el) {
        if (el.type === 'checkbox') return el.checked;
        if (el.type === 'number') return el.value === '' ? undefined : Number(el.value);
        return el.value.trim();
    }

    function wireImageFields(root) {
        $$('[data-image-field]', root).forEach(function (box) {
            if (box.dataset.wired) return;
            box.dataset.wired = '1';
            var input = $('input[type=text]', box);
            var preview = $('.preview', box);
            function refresh() {
                preview.src = imgSrc(input.value);
                preview.style.visibility = input.value.trim() ? 'visible' : 'hidden';
            }
            input.addEventListener('input', refresh);
            $('[data-clear-image]', box).addEventListener('click', function () { input.value = ''; refresh(); });
            $('[data-upload]', box).addEventListener('change', function (e) {
                var file = e.target.files[0];
                if (!file) return;
                var label = e.target.parentNode;
                label.classList.add('disabled');
                uploadImage(file).then(function (url) {
                    input.value = url;
                    refresh();
                    toast('Зураг амжилттай орлоо', 'success');
                }).catch(function (err) {
                    toast(err.message, 'error');
                }).finally(function () {
                    label.classList.remove('disabled');
                    e.target.value = '';
                });
            });
        });
    }

    function renderListItem(listEl, f, value) {
        var item = document.createElement('div');
        item.className = 'list-item';
        var inner = f.scalar
            ? fieldHtml(Object.assign({}, f.scalar, { name: '__value' }), value, 'data-sub')
            : f.fields.map(function (sf) { return fieldHtml(sf, value ? value[sf.name] : sf.default, 'data-sub'); }).join('');
        item.innerHTML =
            '<div class="list-item-head"><span class="idx"></span>' +
            '<button type="button" class="btn btn-sm btn-light" data-move="-1" title="Дээш">↑</button>' +
            '<button type="button" class="btn btn-sm btn-light" data-move="1" title="Доош">↓</button>' +
            '<button type="button" class="btn btn-sm btn-outline-danger" data-remove>Устгах</button></div>' +
            '<div class="row g-3">' + inner + '</div>';
        listEl.appendChild(item);
        wireImageFields(item);
        renumber(listEl, f);
        return item;
    }

    function renumber(listEl, f) {
        $$(':scope > .list-item', listEl).forEach(function (item, i) {
            $('.idx', item).textContent = (f.itemLabel || '№') + ' ' + (i + 1);
        });
    }

    function buildForm(container, fields, values) {
        values = values || {};
        var html = '<div class="row g-3">';
        fields.forEach(function (f) {
            if (f.section) {
                html += '<div class="col-12"><div class="form-section">' + esc(f.section) + '</div></div>';
            } else {
                var v = values[f.name];
                html += fieldHtml(f, v === undefined ? (f.default !== undefined ? f.default : '') : v, 'data-field');
            }
        });
        container.innerHTML = html + '</div>';
        wireImageFields(container);

        fields.filter(function (f) { return f.type === 'list'; }).forEach(function (f) {
            var listEl = $('[data-list="' + f.name + '"]', container);
            (values[f.name] || []).forEach(function (v) { renderListItem(listEl, f, v); });
            $('[data-add="' + f.name + '"]', container).addEventListener('click', function () {
                var item = renderListItem(listEl, f, f.scalar ? '' : null);
                var first = $('input, textarea', item);
                if (first) first.focus();
            });
            listEl.addEventListener('click', function (e) {
                var item = e.target.closest('.list-item');
                if (!item || item.parentNode !== listEl) return;
                if (e.target.hasAttribute('data-remove')) {
                    if (confirm('Энэ мөрийг устгах уу?')) item.remove();
                } else if (e.target.dataset.move === '-1' && item.previousElementSibling) {
                    listEl.insertBefore(item, item.previousElementSibling);
                } else if (e.target.dataset.move === '1' && item.nextElementSibling) {
                    listEl.insertBefore(item.nextElementSibling, item);
                }
                renumber(listEl, f);
            });
        });

        return {
            getValues: function () {
                var out = {};
                fields.forEach(function (f) {
                    if (f.section) return;
                    if (f.type === 'list') {
                        var listEl = $('[data-list="' + f.name + '"]', container);
                        out[f.name] = $$(':scope > .list-item', listEl).map(function (item) {
                            if (f.scalar) return readField($('[data-sub="__value"]', item));
                            var obj = {};
                            $$('[data-sub]', item).forEach(function (el) { obj[el.dataset.sub] = readField(el); });
                            return obj;
                        }).filter(function (v) {
                            return f.scalar ? v !== '' : Object.keys(v).some(function (k) { return v[k] !== '' && v[k] !== undefined; });
                        });
                    } else {
                        out[f.name] = readField($('[data-field="' + f.name + '"]', container));
                    }
                });
                return out;
            },
            validate: function () {
                var bad = $$('[required]', container).filter(function (el) { return !el.value.trim(); });
                bad.forEach(function (el) { el.classList.add('is-invalid'); el.addEventListener('input', function () { el.classList.remove('is-invalid'); }, { once: true }); });
                if (bad.length) { bad[0].focus(); toast('Заавал бөглөх талбаруудыг бөглөнө үү', 'error'); }
                return !bad.length;
            },
        };
    }

    // =====================================================================
    // Field schemas
    // =====================================================================
    var SERVICE_FIELDS = [
        { section: 'Үндсэн мэдээлэл' },
        { name: 'title', label: 'Үйлчилгээний нэр', required: true, col: 'col-md-8' },
        { name: 'published', label: 'Сайт дээр харуулах', type: 'checkbox', default: true, col: 'col-md-4 d-flex align-items-end' },
        { name: 'summary', label: 'Товч тайлбар', type: 'textarea', rows: 3, help: 'Үйлчилгээний жагсаалтын карт дээр харагдана.' },
        { name: 'image', label: 'Үндсэн зураг', type: 'image', col: 'col-md-6' },
        { name: 'icon', label: 'Карт дээрх цагаан икон', type: 'image', col: 'col-md-6', help: 'Ил тод дэвсгэртэй PNG/SVG.' },

        { section: 'Дэлгэрэнгүй хуудас' },
        { name: 'heading', label: 'Гарчиг', placeholder: 'Жишээ нь: Create a Beautiful Kitchen Designed for Modern Living' },
        { name: 'content', label: 'Үндсэн текст', type: 'textarea', rows: 7, help: 'Догол мөр тусгаарлахдаа хооронд нь нэг хоосон мөр үлдээнэ.' },

        { section: 'Онцлох блок' },
        { name: 'highlightValue', label: 'Тоо', placeholder: '15+', col: 'col-md-3' },
        { name: 'highlightLabel', label: 'Тайлбар', placeholder: 'Years Experience', col: 'col-md-3' },
        { name: 'highlightTitle', label: 'Гарчиг', col: 'col-md-6' },
        { name: 'highlightText', label: 'Текст', type: 'textarea', rows: 3 },

        { section: 'Өмнө / Дараа зураг (гүйлгэдэг харьцуулалт)' },
        { name: 'beforeImage', label: 'Өмнө', type: 'image', col: 'col-md-6' },
        { name: 'afterImage', label: 'Дараа', type: 'image', col: 'col-md-6', help: 'Хоёуланг нь оруулсан үед л харагдана.' },

        { section: 'Онцлог шинжүүд' },
        {
            name: 'features', type: 'list', addLabel: 'Онцлог нэмэх', itemLabel: 'Онцлог',
            fields: [
                { name: 'title', label: 'Гарчиг', col: 'col-md-6' },
                { name: 'icon', label: 'Икон (Font Awesome класс)', default: 'fa-solid fa-check', col: 'col-md-6', help: 'Жишээ: fa-solid fa-hammer — fontawesome.com/icons' },
                { name: 'text', label: 'Тайлбар', type: 'textarea', rows: 2 },
            ],
        },

        { section: 'Уриалга (доод ногоон блок)' },
        { name: 'ctaTitle', label: 'Гарчиг', placeholder: 'Ready to Build Your Dream Kitchen?' },
        { name: 'ctaText', label: 'Текст', type: 'textarea', rows: 2 },
    ];

    var PROJECT_FIELDS = [
        { section: 'Үндсэн мэдээлэл' },
        { name: 'title', label: 'Төслийн нэр', required: true, col: 'col-md-8' },
        { name: 'published', label: 'Сайт дээр харуулах', type: 'checkbox', default: true, col: 'col-md-4 d-flex align-items-end' },
        { name: 'category', label: 'Ангилал', placeholder: 'Kitchen Remodeling', col: 'col-md-6' },
        { name: 'year', label: 'Он', placeholder: String(new Date().getFullYear()), col: 'col-md-6' },
        { name: 'location', label: 'Байршил', placeholder: 'Aldie, VA', col: 'col-md-6' },
        { name: 'duration', label: 'Хугацаа', placeholder: 'Completed in 6 Weeks', col: 'col-md-6' },
        { name: 'summary', label: 'Товч тайлбар', type: 'textarea', rows: 3, help: 'Төслийн жагсаалтын карт дээр харагдана.' },

        { section: 'Зургууд' },
        { name: 'coverImage', label: 'Нүүр зураг (карт)', type: 'image', col: 'col-md-6' },
        { name: 'heroImage', label: 'Дэлгэрэнгүй хуудасны том зураг', type: 'image', col: 'col-md-6', help: 'Хоосон бол нүүр зургийг ашиглана.' },
        { name: 'gallery', label: 'Зургийн цомог', type: 'list', addLabel: 'Зураг нэмэх', itemLabel: 'Зураг', scalar: { type: 'image', label: 'Зураг' } },

        { section: 'Дэлгэрэнгүй' },
        { name: 'description', label: 'Танилцуулга', type: 'textarea', rows: 3 },
        { name: 'brief', label: 'Төслийн зорилго (Project Brief)', type: 'textarea', rows: 5 },
        { name: 'solution', label: 'Бидний шийдэл (Our Solution)', type: 'textarea', rows: 5 },
    ];

    var HOME_FIELDS = [
        { section: 'Hero — нүүрний том хэсэг' },
        { name: 'heroTitle1', label: 'Гарчиг (1-р мөр)', col: 'col-md-6' },
        { name: 'heroTitle2', label: 'Гарчиг (2-р мөр, өнгөтэй)', col: 'col-md-6' },
        { name: 'heroText', label: 'Тайлбар текст', type: 'textarea', rows: 3 },
        { name: 'heroButtonText', label: 'Товчны текст', col: 'col-md-6' },
        { name: 'heroButtonLink', label: 'Товч дарахад очих хуудас', col: 'col-md-6', placeholder: 'get-a-quote.html',
          help: 'Жишээ: get-a-quote.html, contact.html, services.html' },
        { name: 'slides', label: 'Арын зургууд (ээлжлэн солигдоно)', type: 'list', addLabel: 'Зураг нэмэх', itemLabel: 'Зураг',
          help: 'Хэвтээ, том зураг (1920px орчим өргөнтэй) тохиромжтой. ↑↓ товчоор дарааллыг өөрчилнө.',
          scalar: { type: 'image', label: 'Зураг' } },
        { name: 'stats', label: 'Тоон үзүүлэлтүүд (hero доод хэсэг)', type: 'list', addLabel: 'Үзүүлэлт нэмэх', itemLabel: 'Үзүүлэлт',
          fields: [
              { name: 'value', label: 'Тоо', placeholder: '10+', col: 'col-md-3' },
              { name: 'label', label: 'Тайлбар', placeholder: 'Years Experience', col: 'col-md-5' },
              { name: 'icon', label: 'Икон', type: 'select', default: 'fa-solid fa-house', col: 'col-md-4',
                options: ['fa-solid fa-house', 'fa-solid fa-hammer', 'fa-solid fa-face-smile', 'fa-solid fa-user-check',
                    'fa-solid fa-star', 'fa-solid fa-award', 'fa-solid fa-trophy', 'fa-solid fa-users', 'fa-solid fa-building',
                    'fa-solid fa-paint-roller', 'fa-solid fa-ruler-combined', 'fa-solid fa-clock', 'fa-solid fa-thumbs-up', 'fa-solid fa-check'] },
          ] },

        { section: 'Before & After — өмнө/дараа харьцуулалт' },
        { name: 'beforeAfterSubtitle', label: 'Жижиг гарчиг', col: 'col-md-6' },
        { name: 'beforeAfterTitle', label: 'Гарчиг', col: 'col-md-6' },
        { name: 'beforeImage', label: 'ӨМНӨ (засварын өмнөх зураг)', type: 'image', col: 'col-md-6' },
        { name: 'afterImage', label: 'ДАРАА (засварын дараах зураг)', type: 'image', col: 'col-md-6',
          help: 'Хоёр зураг ижил хэмжээтэй, ижил өнцгөөс авсан байвал гулсуулах үед зөв харагдана.' },
    ];

    var ABOUT_FIELDS = [
        { section: 'Танилцуулга (Нүүр хуудас болон Бидний тухай хуудсанд харагдана)' },
        { name: 'subtitle', label: 'Жижиг гарчиг', placeholder: 'About TOP CAPITAL' },
        { name: 'heading', label: 'Гарчиг', type: 'textarea', rows: 2, help: 'Шинэ мөрөнд шилжүүлэхийг хүсвэл Enter дарна.' },
        { name: 'text', label: 'Текст', type: 'textarea', rows: 5 },
        { name: 'image1', label: 'Том зураг', type: 'image', col: 'col-md-6' },
        { name: 'image2', label: 'Жижиг зураг', type: 'image', col: 'col-md-6' },
        { section: 'Давуу талууд (Бидний тухай хуудас)' },
        { name: 'highlights', type: 'list', addLabel: 'Давуу тал нэмэх', itemLabel: 'Давуу тал', scalar: { type: 'text', label: 'Текст' } },
    ];

    var TESTIMONIAL_FIELDS = [
        {
            name: 'items', type: 'list', addLabel: 'Сэтгэгдэл нэмэх', itemLabel: 'Сэтгэгдэл',
            fields: [
                { name: 'name', label: 'Нэр', col: 'col-md-6' },
                { name: 'role', label: 'Төсөл / байршил', placeholder: 'Kitchen Remodel, Austin, TX', col: 'col-md-6' },
                { name: 'title', label: 'Гарчиг', col: 'col-md-9' },
                { name: 'rating', label: 'Үнэлгээ', type: 'select', options: [5, 4, 3, 2, 1], default: 5, col: 'col-md-3' },
                { name: 'text', label: 'Сэтгэгдэл', type: 'textarea', rows: 3 },
                { name: 'photo', label: 'Зураг', type: 'image' },
            ],
        },
    ];

    var TEAM_FIELDS = [
        {
            name: 'items', type: 'list', addLabel: 'Гишүүн нэмэх', itemLabel: 'Гишүүн',
            help: 'Хоосон бол "Our Team" хэсэг сайт дээр харагдахгүй.',
            fields: [
                { name: 'name', label: 'Нэр', col: 'col-md-6' },
                { name: 'role', label: 'Албан тушаал', col: 'col-md-6' },
                { name: 'photo', label: 'Зураг', type: 'image' },
                { name: 'facebook', label: 'Facebook холбоос', col: 'col-md-4' },
                { name: 'instagram', label: 'Instagram холбоос', col: 'col-md-4' },
                { name: 'linkedin', label: 'LinkedIn холбоос', col: 'col-md-4' },
            ],
        },
    ];

    var FAQ_FIELDS = [
        {
            name: 'items', type: 'list', addLabel: 'Асуулт нэмэх', itemLabel: 'Асуулт',
            help: 'Ижил ангилалтай асуултууд сайт дээр нэг таб дотор харагдана.',
            fields: [
                { name: 'category', label: 'Ангилал (таб)', placeholder: 'Planning & Design', col: 'col-md-4' },
                { name: 'question', label: 'Асуулт', col: 'col-md-8' },
                { name: 'answer', label: 'Хариулт', type: 'textarea', rows: 2 },
            ],
        },
    ];

    var CONTACT_FIELDS = [
        { section: 'Холбоо барих мэдээлэл (Footer болон Contact хуудсанд)' },
        { name: 'phone', label: 'Утас', col: 'col-md-6' },
        { name: 'email', label: 'И-мэйл', col: 'col-md-6' },
        { name: 'address', label: 'Хаяг', type: 'textarea', rows: 2 },
        { name: 'hours', label: 'Ажлын цаг', type: 'textarea', rows: 2, placeholder: 'Monday - Sat: 8:30 AM - 4:00 PM' },
        { section: 'Сошиал хаягууд' },
        { name: 'facebook', label: 'Facebook холбоос', col: 'col-md-4' },
        { name: 'instagram', label: 'Instagram холбоос', col: 'col-md-4' },
        { name: 'whatsapp', label: 'WhatsApp дугаар', placeholder: '+1 510 590 0089', col: 'col-md-4' },
        { section: 'Газрын зураг' },
        { name: 'mapEmbedUrl', label: 'Google Maps embed холбоос', help: 'Google Maps → Share → Embed a map → "src=" доторх https://www.google.com/maps/embed?... хаягийг хуулна. Хоосон бол газрын зураг харагдахгүй.' },
    ];

    // =====================================================================
    // Pages
    // =====================================================================
    var page = function () { return $('#page'); };
    function setTitle(t) { $('#page-title').textContent = t; document.title = t + ' | Админ'; }

    function loading() { page().innerHTML = '<div class="text-muted p-4">Ачаалж байна…</div>'; }

    function saveBar(extra) {
        return '<div class="sticky-save"><button type="submit" class="btn btn-brand px-4">Хадгалах</button>' + (extra || '') + '</div>';
    }

    // ----- dashboard -----
    function dashboard() {
        setTitle('Хянах самбар');
        loading();
        Promise.all([api('GET', 'admin/stats'), api('GET', 'admin/messages')]).then(function (r) {
            var s = r[0], msgs = r[1].slice(0, 5);
            function stat(label, num, href) {
                return '<div class="col-6 col-lg-3"><a class="stat" href="' + href + '"><div class="num">' + num + '</div><div>' + label + '</div></a></div>';
            }
            page().innerHTML =
                '<div class="row g-3 mb-4">' +
                stat('Үйлчилгээ', s.services, '#/services') + stat('Төсөл', s.projects, '#/projects') +
                stat('Нийт мессеж', s.messages, '#/messages') + stat('Уншаагүй мессеж', s.unread, '#/messages') +
                '</div>' +
                '<div class="card-box"><h2>Түргэн үйлдэл</h2><div class="d-flex flex-wrap gap-2">' +
                '<a class="btn btn-brand" href="#/services/new">+ Шинэ үйлчилгээ</a>' +
                '<a class="btn btn-brand" href="#/projects/new">+ Шинэ төсөл</a>' +
                '<a class="btn btn-outline-secondary" href="#/home">Нүүр хуудас засах</a>' +
                '<a class="btn btn-outline-secondary" href="#/about">Бидний тухай засах</a>' +
                '<a class="btn btn-outline-secondary" href="#/contact">Холбоо барих засах</a>' +
                '</div></div>' +
                '<div class="card-box"><h2>Сүүлийн мессежүүд</h2>' +
                (msgs.length ? msgs.map(function (m) {
                    return '<div class="item-row"><div class="info"><strong>' + (m.read ? '' : '● ') + esc(m.name) +
                        ' <span class="badge bg-light text-dark">' + (m.type === 'quote' ? 'Үнийн санал' : 'Мессеж') + '</span></strong>' +
                        '<small>' + esc(m.message) + '</small></div><small class="text-muted">' + formatDate(m.createdAt) + '</small></div>';
                }).join('') + '<a href="#/messages" class="d-inline-block mt-2">Бүгдийг харах →</a>' : '<p class="text-muted mb-0">Одоогоор мессеж ирээгүй байна.</p>') +
                '</div>';
        }).catch(function (e) { toast(e.message, 'error'); });
    }

    // ----- generic collection list (services / projects) -----
    function collectionList(opts) {
        setTitle(opts.title);
        loading();
        api('GET', 'admin/' + opts.path).then(function (items) {
            page().innerHTML =
                '<div class="toolbar"><a class="btn btn-brand" href="#/' + opts.path + '/new">+ ' + esc(opts.newLabel) + '</a>' +
                '<span class="text-muted small ms-auto">↑↓ товчоор сайт дээрх дарааллыг өөрчилнө</span></div>' +
                '<div class="card-box p-0" id="list">' +
                (items.length ? items.map(function (it) {
                    return '<div class="item-row" data-id="' + it._id + '">' +
                        '<img class="thumb" src="' + esc(imgSrc(it[opts.imageKey])) + '" alt="">' +
                        '<div class="info"><strong>' + esc(it.title) + (it.published ? '' : ' <span class="badge bg-secondary">Нуугдсан</span>') + '</strong>' +
                        '<small>' + esc(it.summary) + '</small></div>' +
                        '<div class="actions">' +
                        '<button class="btn btn-sm btn-light" data-move="-1" title="Дээш">↑</button>' +
                        '<button class="btn btn-sm btn-light" data-move="1" title="Доош">↓</button>' +
                        '<a class="btn btn-sm btn-outline-secondary" target="_blank" rel="noopener" href="/' + opts.publicPage + '?slug=' + encodeURIComponent(it.slug) + '">Харах</a>' +
                        '<a class="btn btn-sm btn-brand" href="#/' + opts.path + '/' + it._id + '">Засах</a>' +
                        '<button class="btn btn-sm btn-outline-danger" data-delete>Устгах</button>' +
                        '</div></div>';
                }).join('') : '<p class="text-muted p-4 mb-0">Одоогоор бүртгэл алга. "' + esc(opts.newLabel) + '" товчийг дарж нэмнэ үү.</p>') +
                '</div>';

            var list = $('#list');
            list.addEventListener('click', function (e) {
                var row = e.target.closest('.item-row');
                if (!row) return;
                if (e.target.hasAttribute('data-delete')) {
                    var name = $('strong', row).textContent;
                    if (!confirm('"' + name + '"-г бүр мөсөн устгах уу? Энэ үйлдлийг буцаах боломжгүй.')) return;
                    api('DELETE', 'admin/' + opts.path + '/' + row.dataset.id).then(function () {
                        row.remove();
                        toast('Устгагдлаа', 'success');
                    }).catch(function (err) { toast(err.message, 'error'); });
                } else if (e.target.dataset.move) {
                    var dir = e.target.dataset.move;
                    if (dir === '-1' && row.previousElementSibling) list.insertBefore(row, row.previousElementSibling);
                    else if (dir === '1' && row.nextElementSibling) list.insertBefore(row.nextElementSibling, row);
                    else return;
                    var ids = $$('.item-row', list).map(function (r) { return r.dataset.id; });
                    api('POST', 'admin/' + opts.path + '-order', { ids: ids })
                        .then(function () { toast('Дараалал хадгалагдлаа', 'success'); })
                        .catch(function (err) { toast(err.message, 'error'); });
                }
            });
        }).catch(function (e) { toast(e.message, 'error'); });
    }

    // ----- generic collection editor -----
    function collectionEdit(opts, id) {
        var isNew = id === 'new';
        setTitle(isNew ? opts.newLabel : opts.editLabel);
        loading();
        (isNew ? Promise.resolve({}) : api('GET', 'admin/' + opts.path + '/' + id)).then(function (doc) {
            page().innerHTML =
                '<a href="#/' + opts.path + '" class="d-inline-block mb-3">← Жагсаалт руу буцах</a>' +
                '<form class="card-box" id="edit-form" novalidate><div id="fields"></div>' +
                saveBar(isNew ? '' : '<a class="btn btn-outline-secondary" target="_blank" rel="noopener" href="/' + opts.publicPage + '?slug=' + encodeURIComponent(doc.slug) + '">Сайт дээр харах ↗</a>') +
                '</form>';
            var form = buildForm($('#fields'), opts.fields, doc);
            $('#edit-form').addEventListener('submit', function (e) {
                e.preventDefault();
                if (!form.validate()) return;
                var btn = $('button[type=submit]', e.target);
                busy(btn, api(isNew ? 'POST' : 'PUT', 'admin/' + opts.path + (isNew ? '' : '/' + id), form.getValues()))
                    .then(function (saved) {
                        toast('Амжилттай хадгалагдлаа', 'success');
                        if (isNew) location.hash = '#/' + opts.path + '/' + saved._id;
                    }).catch(function () {});
            });
        }).catch(function (e) { toast(e.message, 'error'); location.hash = '#/' + opts.path; });
    }

    var SERVICES = { path: 'services', title: 'Үйлчилгээ', newLabel: 'Шинэ үйлчилгээ', editLabel: 'Үйлчилгээ засах', imageKey: 'image', publicPage: 'service-single.html', fields: SERVICE_FIELDS };
    var PROJECTS = { path: 'projects', title: 'Төслүүд', newLabel: 'Шинэ төсөл', editLabel: 'Төсөл засах', imageKey: 'coverImage', publicPage: 'project-single.html', fields: PROJECT_FIELDS };

    // ----- settings sections (about / contact / testimonials / team / faq) -----
    // wrap: lists are stored as arrays; the form edits them as { items: [...] }.
    function settingsPage(section, title, fields, intro, wrap) {
        setTitle(title);
        loading();
        api('GET', 'admin/settings').then(function (settings) {
            var value = settings[section] || (wrap ? [] : {});
            page().innerHTML =
                (intro ? '<p class="text-muted">' + intro + '</p>' : '') +
                '<form class="card-box" id="settings-form" novalidate><div id="fields"></div>' +
                saveBar('<a class="btn btn-outline-secondary" target="_blank" rel="noopener" href="/' + ({ contact: 'contact.html', home: '' }[section] ?? 'about.html') + '">Сайт дээр харах ↗</a>') +
                '</form>';
            var form = buildForm($('#fields'), fields, wrap ? { items: value } : value);
            $('#settings-form').addEventListener('submit', function (e) {
                e.preventDefault();
                if (!form.validate()) return;
                var data = form.getValues();
                busy($('button[type=submit]', e.target), api('PUT', 'admin/settings/' + section, wrap ? data.items : data))
                    .then(function () { toast('Амжилттай хадгалагдлаа', 'success'); })
                    .catch(function () {});
            });
        }).catch(function (e) { toast(e.message, 'error'); });
    }

    // ----- messages -----
    var DETAIL_LABELS = {
        company: 'Компани', project_description: 'Төслийн тайлбар', project_type: 'Төслийн төрөл', property_size: 'Талбайн хэмжээ',
        budget: 'Төсөв', timeline: 'Хугацаа', style: 'Загвар', start_date: 'Эхлэх огноо', address: 'Хаяг', requirements: 'Нэмэлт шаардлага',
    };

    function messages() {
        setTitle('Ирсэн мессеж');
        loading();
        api('GET', 'admin/messages').then(function (list) {
            if (!list.length) {
                page().innerHTML = '<div class="card-box text-muted">Одоогоор мессеж ирээгүй байна. Сайтын Contact болон Get a Quote маягтаар ирсэн хүсэлтүүд энд харагдана.</div>';
                return;
            }
            page().innerHTML = '<div class="card-box p-0" id="msgs">' + list.map(function (m) {
                var details = Object.keys(m.details || {}).filter(function (k) { return k !== 'project_description'; }).map(function (k) {
                    return '<tr><th>' + esc(DETAIL_LABELS[k] || k) + '</th><td>' + esc(m.details[k]) + '</td></tr>';
                }).join('');
                return '<div class="item-row msg ' + (m.read ? '' : 'unread') + '" data-id="' + m._id + '" data-read="' + m.read + '">' +
                    '<div class="info">' +
                    '<strong>' + esc(m.name) + ' <span class="badge ' + (m.type === 'quote' ? 'bg-warning text-dark' : 'bg-light text-dark') + '">' + (m.type === 'quote' ? 'Үнийн санал' : 'Мессеж') + '</span></strong>' +
                    '<div class="small text-muted mb-2">' + formatDate(m.createdAt) + ' · <a href="mailto:' + esc(m.email) + '">' + esc(m.email) + '</a>' +
                    (m.phone ? ' · <a href="tel:' + esc(m.phone) + '">' + esc(m.phone) + '</a>' : '') + '</div>' +
                    '<div style="white-space:pre-wrap">' + esc(m.message) + '</div>' +
                    (details ? '<table class="table table-sm msg-details mt-2 mb-0">' + details + '</table>' : '') +
                    '</div>' +
                    '<div class="actions align-self-start">' +
                    '<button class="btn btn-sm btn-light" data-toggle-read>' + (m.read ? 'Уншаагүй болгох' : 'Уншсан') + '</button>' +
                    '<a class="btn btn-sm btn-brand" href="mailto:' + esc(m.email) + '?subject=' + encodeURIComponent('Re: TOP CAPITAL') + '">Хариулах</a>' +
                    '<button class="btn btn-sm btn-outline-danger" data-delete>Устгах</button>' +
                    '</div></div>';
            }).join('') + '</div>';

            $('#msgs').addEventListener('click', function (e) {
                var row = e.target.closest('.item-row');
                if (!row) return;
                if (e.target.hasAttribute('data-delete')) {
                    if (!confirm('Энэ мессежийг устгах уу?')) return;
                    api('DELETE', 'admin/messages/' + row.dataset.id).then(function () { row.remove(); refreshUnread(); });
                } else if (e.target.hasAttribute('data-toggle-read')) {
                    var read = row.dataset.read !== 'true';
                    api('PATCH', 'admin/messages/' + row.dataset.id, { read: read }).then(function () {
                        row.dataset.read = String(read);
                        row.classList.toggle('unread', !read);
                        e.target.textContent = read ? 'Уншаагүй болгох' : 'Уншсан';
                        refreshUnread();
                    });
                }
            });
        }).catch(function (e) { toast(e.message, 'error'); });
    }

    // ----- account -----
    function account() {
        setTitle('Нууц үг солих');
        page().innerHTML =
            '<form class="card-box" id="pw-form" style="max-width:480px" novalidate>' +
            '<div class="mb-3"><label class="form-label">Одоогийн нууц үг</label><input type="password" class="form-control" name="currentPassword" autocomplete="current-password" required></div>' +
            '<div class="mb-3"><label class="form-label">Шинэ нууц үг</label><input type="password" class="form-control" name="newPassword" autocomplete="new-password" minlength="8" required><div class="form-text">Хамгийн багадаа 8 тэмдэгт.</div></div>' +
            '<div class="mb-3"><label class="form-label">Шинэ нууц үг (давтах)</label><input type="password" class="form-control" name="confirm" autocomplete="new-password" required></div>' +
            '<button class="btn btn-brand" type="submit">Нууц үг солих</button></form>';
        $('#pw-form').addEventListener('submit', function (e) {
            e.preventDefault();
            var f = e.target;
            if (f.newPassword.value !== f.confirm.value) return toast('Шинэ нууц үгнүүд таарахгүй байна', 'error');
            busy($('button', f), api('POST', 'auth/password', { currentPassword: f.currentPassword.value, newPassword: f.newPassword.value }))
                .then(function () { f.reset(); toast('Нууц үг солигдлоо', 'success'); })
                .catch(function () {});
        });
    }

    // =====================================================================
    // Router
    // =====================================================================
    var ROUTES = {
        dashboard: dashboard,
        services: function (id) { return id ? collectionEdit(SERVICES, id) : collectionList(SERVICES); },
        projects: function (id) { return id ? collectionEdit(PROJECTS, id) : collectionList(PROJECTS); },
        home: function () { settingsPage('home', 'Нүүр хуудас', HOME_FIELDS, 'Нүүр хуудасны hero хэсэг болон Before & After зургууд. Хадгалсны дараа сайт дээр 30 секундын дотор шинэчлэгдэнэ.'); },
        about: function () { settingsPage('about', 'Бидний тухай', ABOUT_FIELDS); },
        testimonials: function () { settingsPage('testimonials', 'Үйлчлүүлэгчдийн сэтгэгдэл', TESTIMONIAL_FIELDS, 'Нүүр хуудас болон "Бидний тухай" хуудсанд гүйдэг хэлбэрээр харагдана.', true); },
        team: function () { settingsPage('team', 'Баг хамт олон', TEAM_FIELDS, '"Бидний тухай" хуудасны "Meet the Experts" хэсэг.', true); },
        faq: function () { settingsPage('faq', 'Түгээмэл асуулт', FAQ_FIELDS, 'Нүүр хуудас болон "Бидний тухай" хуудасны FAQ хэсэг.', true); },
        contact: function () { settingsPage('contact', 'Холбоо барих', CONTACT_FIELDS); },
        messages: messages,
        account: account,
    };

    function route() {
        var parts = location.hash.replace(/^#\/?/, '').split('/');
        var name = ROUTES[parts[0]] ? parts[0] : 'dashboard';
        $$('.sidebar-nav a[data-route]').forEach(function (a) { a.classList.toggle('active', a.dataset.route === name); });
        $('#sidebar').classList.remove('open');
        window.scrollTo(0, 0);
        refreshUnread();
        ROUTES[name](parts[1]);
    }

    function refreshUnread() {
        api('GET', 'admin/stats').then(function (s) {
            var b = $('#unread-badge');
            b.textContent = s.unread;
            b.hidden = !s.unread;
        }).catch(function () {});
    }

    // =====================================================================
    // Auth
    // =====================================================================
    function showLogin() {
        $('#app-view').hidden = true;
        $('#login-view').hidden = false;
        $('#login-username').focus();
    }

    function showApp(user) {
        $('#login-view').hidden = true;
        $('#app-view').hidden = false;
        $('#current-user').textContent = user.username;
        route();
    }

    $('#login-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var err = $('#login-error');
        err.hidden = true;
        api('POST', 'auth/login', { username: e.target.username.value, password: e.target.password.value })
            .then(function (user) { e.target.reset(); showApp(user); })
            .catch(function (ex) { err.textContent = ex.message; err.hidden = false; });
    });

    $('#logout-btn').addEventListener('click', function () {
        api('POST', 'auth/logout').finally(showLogin);
    });

    $('#menu-toggle').addEventListener('click', function () { $('#sidebar').classList.toggle('open'); });
    window.addEventListener('hashchange', function () { if (!$('#app-view').hidden) route(); });

    fetch('/api/auth/me', { credentials: 'same-origin' })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (user) { if (user) showApp(user); else showLogin(); })
        .catch(showLogin);
})();
