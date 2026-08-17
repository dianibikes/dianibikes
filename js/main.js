// Diani Bikes - shared site behaviour: mobile nav, dropdown, testimonials,
// gallery lightbox + filter, FAQ accordion. Vanilla JS, no dependencies.
(function () {
  'use strict';

  /* ---------- Public data reads (Supabase) ----------
     Read-only access to public content tables (tours, bikes, team, gallery,
     partners, reviews, faqs) - anon key only, allowed by the "public read"
     Row Level Security policies in supabase/schema.sql. Bookings use a
     separate public-insert-only policy (see dbInsertBooking). */
  function toCamelKey(k) { return k.replace(/_([a-z])/g, function (_, c) { return c.toUpperCase(); }); }
  function rowToCamel(row) {
    var out = {};
    Object.keys(row).forEach(function (k) { out[toCamelKey(k)] = row[k]; });
    return out;
  }
  function dbGetAll(table) {
    if (!window.sb) return Promise.resolve([]);
    var query = window.sb.from(table).select('*');
    if (table === 'bikes') query = query.order('sort_order', { ascending: true });
    else if (table !== 'tours' && table !== 'seo') query = query.order('created_at', { ascending: false });
    return query.then(function (r) {
      return r.error ? [] : r.data.map(rowToCamel);
    });
  }
  function dbInsertBooking(record) {
    if (!window.sb) return Promise.resolve();
    var row = Object.assign({}, record);
    if (row.submittedAt) { row.submitted_at = row.submittedAt; delete row.submittedAt; }
    return window.sb.from('bookings').insert(row);
  }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Image skeleton loading ----------
     Every real <img> (the small auto-width partner-logo strip is exempt -
     see its CSS) fades in from a shimmering placeholder instead of popping
     in abruptly, whether it's already in the page on load or inserted later
     via innerHTML from a Supabase read. Safe to call repeatedly on the same
     root - already-wired images are skipped. */
  function wireLazyImages(root) {
    (root || document).querySelectorAll('img:not(.js-img)').forEach(function (img) {
      if (img.closest('.partners-strip')) return;
      img.classList.add('js-img');
      if (!img.hasAttribute('loading')) img.loading = 'lazy';
      function markLoaded() { img.classList.add('is-loaded'); }
      if (img.complete && img.naturalWidth) markLoaded();
      else {
        img.addEventListener('load', markLoaded, { once: true });
        img.addEventListener('error', markLoaded, { once: true });
      }
    });
  }
  // Re-points an <img> already on the page at a new src (e.g. once the real
  // Supabase photo replaces the seed placeholder) and re-plays the skeleton
  // for that swap, instead of leaving it at whatever loaded state the old
  // src left behind.
  function setImgSrc(img, src) {
    img.classList.remove('is-loaded');
    img.classList.add('js-img');
    function markLoaded() { img.classList.add('is-loaded'); }
    img.addEventListener('load', markLoaded, { once: true });
    img.addEventListener('error', markLoaded, { once: true });
    img.src = src;
  }
  wireLazyImages(document);

  /* ---------- FAQ accordion content (About / Rentals pages) ---------- */
  var faqContainer = document.querySelector('[data-faq-page]');
  if (faqContainer) {
    var faqPage = faqContainer.getAttribute('data-faq-page');
    dbGetAll('faqs').then(function (allFaqs) {
      var faqs = allFaqs.filter(function (f) { return f.page === faqPage; });
      if (faqs.length) {
        faqContainer.innerHTML = faqs.map(function (f, idx) {
          return '<div class="faq-item' + (idx === 0 ? ' open' : '') + '">' +
            '<button class="faq-question">' + escapeHtml(f.question) +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>' +
            '</button>' +
            '<div class="faq-answer"><p>' + escapeHtml(f.answer) + '</p></div>' +
          '</div>';
        }).join('');
      }
    });
  }

  /* ---------- Partners marquee (About page) ----------
     The logo set is rendered twice back to back so the CSS animation
     (translateX to -50%) loops seamlessly, then the animation duration is
     set from the actual rendered width so the scroll speed (~60px/s) stays
     consistent no matter how many partners are added. */
  var partnersStrip = document.querySelector('.partners-strip');
  if (partnersStrip) {
    dbGetAll('partners').then(function (partners) {
      if (partners.length) {
        var itemsHtml = partners.map(function (p) {
          return '<img src="' + escapeHtml(p.logo.replace('../images/', 'images/')) + '" alt="' + escapeHtml(p.name) + '" loading="lazy">';
        }).join('');
        partnersStrip.innerHTML = itemsHtml + itemsHtml;
        var setWidth = partnersStrip.scrollWidth / 2;
        partnersStrip.style.animationDuration = Math.max(setWidth / 60, 8) + 's';
      }
    });
  }

  /* ---------- Team roster (About page) ---------- */
  var teamGrid = document.querySelector('.team-grid');
  if (teamGrid) {
    dbGetAll('team').then(function (team) {
      if (team.length) {
        var ordered = team.slice().reverse(); // oldest added (founder) first
        teamGrid.innerHTML = ordered.map(function (m) {
          var photo = (m.photo || '').replace('../images/', 'images/');
          return '<div class="team-card">' +
            '<div class="team-photo"><img src="' + escapeHtml(photo) + '" alt="' + escapeHtml(m.name) + '"></div>' +
            '<h4>' + escapeHtml(m.name) + '</h4>' +
            '<p class="role">' + escapeHtml(m.designation || '') + '</p>' +
          '</div>';
        }).join('');
        wireLazyImages(teamGrid);
      }
    });
  }

  /* ---------- Homepage hero slider ----------
     Crossfades the category hero photos behind the headline. Slides 2..n carry
     their URL in data-src and are only fetched once the page has loaded, so
     they never compete with the first slide (the page's largest paint). */
  var heroSlider = document.querySelector('.hero-slider');
  if (heroSlider) {
    var heroSlides = heroSlider.querySelectorAll('img');
    if (heroSlides.length > 1) {
      var loadRemainingSlides = function () {
        heroSlides.forEach(function (img) {
          var src = img.getAttribute('data-src');
          if (!src) return;
          img.setAttribute('src', src);
          img.removeAttribute('data-src');
        });
      };
      if (document.readyState === 'complete') loadRemainingSlides();
      else window.addEventListener('load', loadRemainingSlides);

      var reduceMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduceMotion) {
        var heroIndex = 0;
        setInterval(function () {
          if (document.hidden) return; // don't cycle in a background tab
          heroSlides[heroIndex].classList.remove('is-active');
          heroIndex = (heroIndex + 1) % heroSlides.length;
          heroSlides[heroIndex].classList.add('is-active');
        }, 6000);
      }
    }
  }

  /* ---------- Homepage gallery preview strip ---------- */
  var homeGalleryGrid = document.querySelector('.gallery-grid-home');
  if (homeGalleryGrid) {
    dbGetAll('gallery').then(function (photos) {
      if (photos.length) {
        homeGalleryGrid.innerHTML = photos.slice(0, 6).map(function (p, idx) {
          var tall = idx % 3 === 1 ? ' tall' : '';
          var src = (p.image || '').replace('../images/', 'images/');
          return '<a class="gallery-item' + tall + '" href="gallery.html"><img src="' + escapeHtml(src) + '" alt="' + escapeHtml(p.caption || 'Gallery photo') + '"></a>';
        }).join('');
        wireLazyImages(homeGalleryGrid);
      }
    });
  }

  /* ---------- Rental bikes: rate cards + booking-form quantity rows ----------
     Both are driven by the "bikes" table so the fleet, photos, and half/full
     day prices can be changed from the admin console. Each bike's slug (its
     primary key) becomes the qty_<slug> form field name, which the booking
     capture below and contact.html's prefill both read back generically. */
  function money(value, currency) {
    if (currency === 'USD') return '$' + Number(value).toLocaleString('en-US');
    return 'Kes. ' + Number(value).toLocaleString('en-KE');
  }
  function rateLine(bike) {
    var parts = [];
    if (bike.halfDayRate != null) parts.push('Half Day: ' + money(bike.halfDayRate));
    if (bike.fullDayRate != null) parts.push('Full Day: ' + money(bike.fullDayRate));
    return parts.join('  ·  ');
  }

  var bikeRatesGrid = document.querySelector('[data-bike-rates]');
  var bikeQtyList = document.querySelector('[data-bike-qty]');
  if (bikeRatesGrid || bikeQtyList) {
    dbGetAll('bikes').then(function (allBikes) {
      var bikes = allBikes.filter(function (b) { return b.status !== 'Draft'; });
      if (!bikes.length) return;

      if (bikeRatesGrid) {
        bikeRatesGrid.innerHTML = bikes.map(function (b) {
          var img = (b.image || '').replace('../images/', 'images/');
          return '<article class="tour-card rate-card">' +
            '<div class="tour-card-media">' +
              '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(b.name) + ' rental">' +
              '<div class="tour-card-tags"><span class="tag">' + escapeHtml(b.tagLabel || b.name) + '</span></div>' +
            '</div>' +
            '<div class="tour-card-body">' +
              '<h3>' + escapeHtml(b.name) + '</h3>' +
              '<p>' + escapeHtml(b.description || '') + '</p>' +
              '<p style="font-weight:700; color:var(--color-charcoal);">' + escapeHtml(rateLine(b)) + '</p>' +
              '<div class="tour-card-footer">' +
                '<a href="#booking-form" class="btn btn-primary btn-sm">Book Now</a>' +
              '</div>' +
            '</div>' +
          '</article>';
        }).join('');
        wireLazyImages(bikeRatesGrid);
      }

      if (bikeQtyList) {
        bikeQtyList.innerHTML = bikes.map(function (b) {
          var fieldId = 'rb-qty-' + b.id;
          return '<div class="bike-qty-row">' +
            '<label for="' + escapeHtml(fieldId) + '">' + escapeHtml(b.name) + '</label>' +
            '<input type="number" id="' + escapeHtml(fieldId) + '" name="qty_' + escapeHtml(b.id) + '" min="0" value="0">' +
          '</div>';
        }).join('');
      }
    });
  }

  /* ---------- Tour photos + tags: detail-page hero/glimpses/tags-row and
     card thumbnails/tags ----------
     Detail pages are tagged with data-tour-id="<tours.id slug>". Card
     thumbnails (listing pages and "You Might Also Like" sections) need no
     tagging - each card's own title link already encodes the slug
     (href="camel-adventure.html"), so it's read straight off that instead.
     Category/location tags are rebuilt from the live record everywhere, so
     editing a tour in the admin (category, location tags) is reflected
     across the whole site instead of the static tags baked in at build
     time. An uploaded photo (a real https:// Storage URL) always wins over
     the seed placeholder SVG left in the array, so admins don't have to
     remember to delete the placeholder before their upload shows up. */
  var tourRoot = document.querySelector('[data-tour-id]');
  var tourCards = document.querySelectorAll('.tour-card');
  var tourCategoryGrids = document.querySelectorAll('[data-tour-category]');
  var exploreSection = document.querySelector('#explore');
  if (tourRoot || tourCards.length || tourCategoryGrids.length || exploreSection) {
    var CATEGORY_URLS = {
      'Bike Tours': 'bike-tours.html',
      'Marine Excursions': 'marine-excursions.html',
      'Forest Excursions': 'forest-excursions.html',
      'Tuk Tuk Experience': 'tuk-tuk.html'
    };
    function categoryTagClass(category) {
      if (category === 'Bike Tours') return 'tag-blue';
      if (category === 'Forest Excursions') return 'tag-yellow';
      return '';
    }
    function locationTagClass(loc) { return loc === 'Tuk Tuk' ? 'tag-yellow' : ''; }
    // An offer is "active" only within its optional start/end date window -
    // once offerEndsOn passes, the discount drops off the site on its own
    // without the admin needing to remember to clear offerPercent.
    function isOfferActive(tour) {
      if (tour.offerPercent == null) return false;
      var today = new Date().toISOString().slice(0, 10);
      if (tour.offerStartsOn && today < tour.offerStartsOn) return false;
      if (tour.offerEndsOn && today > tour.offerEndsOn) return false;
      return true;
    }
    function discountedPrice(value, percent) {
      return Math.round(value * (1 - percent / 100));
    }
    function tourPriceLine(tour) {
      var offer = isOfferActive(tour);
      function priceHtml(value, currency) {
        if (!offer) return money(value, currency);
        return '<s>' + money(value, currency) + '</s> ' + money(discountedPrice(value, tour.offerPercent), currency);
      }
      var parts = [];
      if (tour.residentPrice != null) parts.push('Resident: ' + priceHtml(tour.residentPrice));
      if (tour.nonResidentPrice != null) parts.push('Non-Resident: ' + priceHtml(tour.nonResidentPrice, 'USD'));
      return parts.join('  ·  ');
    }
    function realPhotosOf(tour) {
      return (tour.images || []).filter(function (src) { return /^https?:\/\//.test(src); });
    }
    function tourCardTagsHtml(tour) {
      return (isOfferActive(tour) ? '<span class="tag tag-offer">' + tour.offerPercent + '% OFF</span>' : '') +
        '<span class="tag ' + categoryTagClass(tour.category) + '">' + escapeHtml(tour.category) + '</span>' +
        (tour.locationTags || []).map(function (loc) {
          return '<span class="tag ' + locationTagClass(loc) + '">' + escapeHtml(loc) + '</span>';
        }).join('');
    }
    function tourCardHtml(tour) {
      var photo = realPhotosOf(tour)[0] || tour.images[0] || 'images/favicon.svg';
      return '<article class="tour-card">' +
        '<div class="tour-card-media">' +
          '<img src="' + escapeHtml(photo) + '" alt="' + escapeHtml(tour.title) + '">' +
          '<div class="tour-card-tags">' + tourCardTagsHtml(tour) + '</div>' +
        '</div>' +
        '<div class="tour-card-body">' +
          '<h3><a href="' + tour.id + '.html">' + escapeHtml(tour.title) + '</a></h3>' +
          '<p>' + escapeHtml(tour.description || '') + '</p>' +
          (tourPriceLine(tour) ? '<p class="tour-card-price">' + tourPriceLine(tour) + '</p>' : '') +
          '<div class="tour-card-footer">' +
            '<a href="' + tour.id + '.html#booking-form" class="btn btn-primary btn-sm">Book Now</a>' +
            '<a href="' + tour.id + '.html" class="btn-link">View Details</a>' +
          '</div>' +
        '</div>' +
      '</article>';
    }

    dbGetAll('tours').then(function (allTours) {
      var tours = allTours.filter(function (t) { return t.status !== 'Draft'; });
      var byId = {};
      tours.forEach(function (t) { byId[t.id] = t; });
      var byIdAll = {};
      allTours.forEach(function (t) { byIdAll[t.id] = t; });

      if (tourRoot) {
        var tour = byId[tourRoot.getAttribute('data-tour-id')];
        if (tour) {
          var catUrl = CATEGORY_URLS[tour.category];

          // Hero breadcrumb + eyebrow - these declare the tour's category
          // just as prominently as the tags row, so they need to stay in
          // sync with it (both driven by the same tour.category).
          var breadcrumb = tourRoot.querySelector('.breadcrumb');
          if (breadcrumb && catUrl) {
            breadcrumb.innerHTML = '<a href="index.html">Home</a> / <a href="' + catUrl + '">' + escapeHtml(tour.category) + '</a> / ' + escapeHtml(tour.title);
          }
          var heroEyebrow = tourRoot.querySelector('.hero-content .eyebrow');
          if (heroEyebrow) heroEyebrow.textContent = tour.category;

          var tagsRow = tourRoot.querySelector('.tour-tags-row');
          if (tagsRow) {
            var catTagHtml = catUrl
              ? '<a href="' + catUrl + '" class="tag ' + categoryTagClass(tour.category) + '">' + escapeHtml(tour.category) + '</a>'
              : '<span class="tag ' + categoryTagClass(tour.category) + '">' + escapeHtml(tour.category) + '</span>';
            var offerTagHtml = isOfferActive(tour) ? '<span class="tag tag-offer">' + tour.offerPercent + '% OFF</span>' : '';
            tagsRow.innerHTML = offerTagHtml + catTagHtml + (tour.locationTags || []).map(function (loc) {
              return loc === 'Tuk Tuk'
                ? '<a href="tuk-tuk.html" class="tag tag-yellow">Tuk Tuk</a>'
                : '<span class="tag">' + escapeHtml(loc) + '</span>';
            }).join('');
          }

          var priceEl = tourRoot.querySelector('[data-tour-price]');
          if (priceEl) {
            var line = tourPriceLine(tour);
            if (line) { priceEl.innerHTML = line; priceEl.style.display = ''; }
            else priceEl.style.display = 'none';
          }

          // Short summary (also used as the card blurb) + optional longer
          // itinerary, shown only here on the tour's own page, below the
          // summary. Both come straight from the admin Tour editor.
          var summaryEl = tourRoot.querySelector('[data-tour-summary]');
          if (summaryEl && tour.description) {
            summaryEl.innerHTML = '<p>' + escapeHtml(tour.description) + '</p>';
          }
          var itineraryEl = tourRoot.querySelector('[data-tour-itinerary]');
          if (itineraryEl && tour.itinerary) {
            var itineraryParas = tour.itinerary.split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
            itineraryEl.innerHTML = '<h3 style="margin-top: var(--space-4);">Itinerary</h3>' +
              itineraryParas.map(function (p) { return '<p>' + escapeHtml(p) + '</p>'; }).join('');
          }

          if (tour.images && tour.images.length) {
            var realPhotos = realPhotosOf(tour);

            var heroImg = tourRoot.querySelector('[data-tour-hero]');
            if (heroImg && (realPhotos[0] || tour.images[0])) {
              setImgSrc(heroImg, realPhotos[0] || tour.images[0]);
              heroImg.alt = tour.title;
            }

            if (realPhotos.length) {
              var glimpses = tourRoot.querySelector('[data-tour-glimpses]');
              if (glimpses) {
                glimpses.innerHTML = realPhotos.map(function (src) {
                  return '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(tour.title) + '" loading="lazy">';
                }).join('');
                wireLazyImages(glimpses);
              }
              var note = tourRoot.querySelector('[data-tour-glimpses-note]');
              if (note) note.style.display = 'none';
            }
          }
        }
      }

      tourCards.forEach(function (card) {
        var link = card.querySelector('h3 a');
        if (!link) return;
        var slug = (link.getAttribute('href') || '').replace(/#.*$/, '').replace(/\.html$/, '');
        var cardTour = byId[slug];
        if (!cardTour) {
          // Hand-written cards (e.g. "You Might Also Like") that point at a
          // tour taken back to Draft in the admin shouldn't linger on the
          // front end just because their markup is baked into the page.
          if (byIdAll[slug] && byIdAll[slug].status === 'Draft') card.remove();
          return;
        }

        var tagsEl = card.querySelector('.tour-card-tags');
        if (tagsEl) tagsEl.innerHTML = tourCardTagsHtml(cardTour);

        var photo = realPhotosOf(cardTour)[0];
        if (photo) {
          var img = card.querySelector('.tour-card-media img');
          if (img) { setImgSrc(img, photo); img.alt = cardTour.title; }
        }

        // Hand-written cards (e.g. "You Might Also Like") have no price
        // markup baked in, so add or drop a price line here to match
        // whatever's rendered by tourCardHtml() for JS-built grids.
        var body = card.querySelector('.tour-card-body');
        var priceEl = body && body.querySelector('.tour-card-price');
        var line = tourPriceLine(cardTour);
        if (line) {
          if (!priceEl && body) {
            priceEl = document.createElement('p');
            priceEl.className = 'tour-card-price';
            body.insertBefore(priceEl, body.querySelector('.tour-card-footer'));
          }
          if (priceEl) priceEl.innerHTML = line;
        } else if (priceEl) {
          priceEl.remove();
        }
      });

      // Category listing pages (Bike Tours, Tuk Tuk Experience, Marine
      // Excursions, Forest Excursions) - the grid is empty in the HTML and
      // fully rendered from whichever tours currently have this category,
      // so recategorizing a tour in the admin moves its card automatically.
      tourCategoryGrids.forEach(function (grid) {
        var wanted = grid.getAttribute('data-tour-category');
        var matches = tours
          .filter(function (t) { return t.category === wanted; })
          .sort(function (a, b) { return (a.createdAt || '').localeCompare(b.createdAt || ''); });
        if (matches.length) {
          grid.innerHTML = matches.map(tourCardHtml).join('');
          wireLazyImages(grid);
        }
      });

      // Homepage "Browse by Location or Activity" filter. Location and
      // category are independent - each defaults to "All" (no constraint),
      // so picking just one is enough to narrow results; picking both
      // intersects them. Clicking a filter button only changes the selection;
      // results only render when "View Results" is clicked, and nothing shows
      // before that first click.
      if (exploreSection) {
        var resultsGrid = exploreSection.querySelector('#explore-results');
        var emptyMsg = exploreSection.querySelector('#explore-empty');
        var viewBtn = exploreSection.querySelector('#explore-view-btn');
        var activeLocation = 'all';
        var activeCategory = 'all';

        function renderExploreResults() {
          var matches = tours.filter(function (t) {
            var locOk = activeLocation === 'all' || (t.locationTags || []).indexOf(activeLocation) !== -1;
            var catOk = activeCategory === 'all' || t.category === activeCategory;
            return locOk && catOk;
          }).sort(function (a, b) { return (a.createdAt || '').localeCompare(b.createdAt || ''); });

          if (matches.length) {
            resultsGrid.style.display = '';
            emptyMsg.style.display = 'none';
            resultsGrid.innerHTML = matches.map(tourCardHtml).join('');
            wireLazyImages(resultsGrid);
          } else {
            resultsGrid.style.display = 'none';
            emptyMsg.textContent = 'No activities match that combination yet - try a different location or activity type.';
            emptyMsg.style.display = 'block';
          }
        }

        exploreSection.addEventListener('click', function (e) {
          var locBtn = e.target.closest('[data-explore-location]');
          var catBtn = e.target.closest('[data-explore-category]');
          if (!locBtn && !catBtn) return;

          var group = (locBtn || catBtn).closest('.gallery-filter');
          group.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
          (locBtn || catBtn).classList.add('active');

          if (locBtn) activeLocation = locBtn.getAttribute('data-explore-location');
          if (catBtn) activeCategory = catBtn.getAttribute('data-explore-category');
          // Deliberately no auto-render here, even if results are already
          // showing from a previous search - changing a filter never updates
          // results on its own, only clicking "View Results" does.
        });

        viewBtn.addEventListener('click', renderExploreResults);
      }
    });
  }

  /* ---------- Inline form validation ----------
     Applies to every form on the site (contact + all tour/rental booking
     forms). Shows errors under each field on blur/submit and blocks
     submission (incl. the booking-capture handler below) until valid. */
  function initInlineValidation(form) {
    var fields = form.querySelectorAll('input[id], textarea[id], select[id]');

    function errorEl(field) {
      var el = field.parentElement.querySelector('.field-error');
      if (!el) {
        el = document.createElement('span');
        el.className = 'field-error';
        field.insertAdjacentElement('afterend', el);
      }
      return el;
    }

    function validateField(field) {
      var el = errorEl(field);
      var valid = field.checkValidity();
      field.classList.toggle('is-invalid', !valid);
      el.textContent = valid ? '' : field.validationMessage;
      return valid;
    }

    fields.forEach(function (field) {
      field.addEventListener('blur', function () { validateField(field); });
      field.addEventListener('input', function () {
        if (field.classList.contains('is-invalid')) validateField(field);
      });
    });

    form.addEventListener('submit', function (e) {
      var firstInvalid = null;
      fields.forEach(function (field) {
        var ok = validateField(field);
        if (!ok && !firstInvalid) firstInvalid = field;
      });
      if (firstInvalid) {
        e.preventDefault();
        e.stopImmediatePropagation();
        firstInvalid.focus();
      }
    });
  }

  document.querySelectorAll('#contact-form, #booking-form form, .tour-sidebar form').forEach(initInlineValidation);

  /* ---------- Booking capture: save any booking-form submission to the
     shared "bookings" store (visible in the admin Bookings tab + Calendar)
     before letting the normal GET navigation to contact.html proceed. ---------- */
  document.querySelectorAll('#booking-form form, .tour-sidebar form').forEach(function (form) {
    if (form.getAttribute('action') !== 'contact.html') return;
    form.addEventListener('submit', function (e) {
      // Prevented so the Supabase insert has a chance to actually finish
      // before the page navigates away (a plain GET submit would fire
      // immediately and could abort the in-flight request). The navigation
      // still carries the same query params a native GET submit would.
      e.preventDefault();
      var fd = new FormData(form);
      var get = function (name) { return fd.get(name) || ''; };
      var hasOffice = fd.has('office');

      var record = {
        type: hasOffice ? 'rental' : 'tour',
        interest: get('interest'),
        name: get('name'),
        email: get('email'),
        whatsapp: get('whatsapp'),
        date: get('date'),
        submittedAt: new Date().toISOString(),
        status: 'New'
      };

      if (hasOffice) {
        record.office = get('office');
        record.duration = get('duration');
        // Bike types are admin-managed, so read whichever qty_<slug> rows the
        // form actually rendered instead of a fixed list. The row's label text
        // is used as the stored key so the admin Bookings view stays readable.
        var bikeCounts = {};
        form.querySelectorAll('[name^="qty_"]').forEach(function (input) {
          var labelEl = input.id ? form.querySelector('label[for="' + input.id + '"]') : null;
          var key = labelEl ? labelEl.textContent.trim() : input.name.replace(/^qty_/, '');
          bikeCounts[key] = parseInt(input.value, 10) || 0;
        });
        record.bikes = bikeCounts;
      } else {
        record.guests = parseInt(get('guests'), 10) || null;
      }

      var navigated = false;
      function proceed() {
        if (navigated) return;
        navigated = true;
        var params = new URLSearchParams();
        fd.forEach(function (value, key) { params.append(key, value); });
        window.location.href = form.getAttribute('action') + '?' + params.toString();
      }

      dbInsertBooking(record).then(proceed, proceed);
      setTimeout(proceed, 1200); // don't block navigation if the network is slow
    });
  });

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.primary-nav');
  var scrim = document.querySelector('.nav-scrim');

  function closeNav() {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
    if (scrim) scrim.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!isOpen));
      nav.classList.toggle('is-open', !isOpen);
      if (scrim) scrim.classList.toggle('is-open', !isOpen);
      document.body.style.overflow = !isOpen ? 'hidden' : '';
    });
  }
  if (scrim) scrim.addEventListener('click', closeNav);

  /* Close mobile nav when a real link is tapped */
  document.querySelectorAll('.primary-nav a').forEach(function (a) {
    a.addEventListener('click', function () {
      if (window.innerWidth < 960) closeNav();
    });
  });

  /* ---------- Testimonial carousel (data-driven from admin Reviews) ---------- */
  var track = document.querySelector('.testimonial-slides');
  if (track) {
    dbGetAll('reviews').then(function (reviews) {
      if (reviews.length) {
        track.innerHTML = reviews.map(function (r) {
          var stars = '★★★★★☆☆☆☆☆'.slice(5 - r.rating, 10 - r.rating);
          return '<div class="testimonial-slide"><div class="testimonial-card">' +
            '<div class="stars">' + stars + '</div>' +
            '<p class="testimonial-quote">&ldquo;' + escapeHtml(r.quote) + '&rdquo;</p>' +
            '<div class="testimonial-author">' + escapeHtml(r.reviewer) + '</div>' +
            '<div class="testimonial-source">Verified review on ' + escapeHtml(r.source) + '</div>' +
            '</div></div>';
        }).join('');
      }
      var slides = track.querySelectorAll('.testimonial-slide');
      var dotsWrap = document.querySelector('.testimonial-nav');
      var current = 0;

      function goTo(i) {
        current = (i + slides.length) % slides.length;
        track.style.transform = 'translateX(-' + (current * 100) + '%)';
        if (dotsWrap) {
          dotsWrap.querySelectorAll('.testimonial-dot').forEach(function (d, idx) {
            d.classList.toggle('active', idx === current);
          });
        }
      }

      if (dotsWrap) {
        slides.forEach(function (_, idx) {
          var dot = document.createElement('button');
          dot.className = 'testimonial-dot' + (idx === 0 ? ' active' : '');
          dot.setAttribute('aria-label', 'Show testimonial ' + (idx + 1));
          dot.addEventListener('click', function () { goTo(idx); });
          dotsWrap.appendChild(dot);
        });
      }

      var autoplay = setInterval(function () { goTo(current + 1); }, 6000);
      track.closest('.testimonial-carousel').addEventListener('mouseenter', function () { clearInterval(autoplay); });
    });
  }

  /* ---------- Gallery page grid (gallery.html) ----------
     Renders every photo in the "gallery" table, using each photo's first tag
     as its filter category. Filter buttons whose category has no photos are
     hidden rather than left to produce an empty grid. */
  var galleryPageGrid = document.querySelector('.gallery-page-grid');
  if (galleryPageGrid) {
    dbGetAll('gallery').then(function (photos) {
      if (!photos.length) return;
      galleryPageGrid.innerHTML = photos.map(function (p, idx) {
        var tall = idx % 5 === 1 ? ' tall' : '';
        var cat = (p.tags && p.tags[0]) || '';
        var src = (p.image || '').replace('../images/', 'images/');
        return '<div class="gallery-item' + tall + '" data-category="' + escapeHtml(cat) + '"' +
          ' tabindex="0" role="button">' +
          '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(p.caption || 'Diani Bikes photo') + '" loading="lazy">' +
        '</div>';
      }).join('');
      wireLazyImages(galleryPageGrid);

      var used = {};
      photos.forEach(function (p) { (p.tags || []).forEach(function (t) { used[t] = true; }); });
      document.querySelectorAll('.filter-btn').forEach(function (btn) {
        var cat = btn.dataset.filter;
        if (cat !== 'all' && !used[cat]) btn.style.display = 'none';
      });
    });
  }

  /* ---------- Gallery filter ----------
     Delegated, and the item list is queried at click time, because the grid
     above is replaced asynchronously once the Supabase read resolves. */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    var cat = btn.dataset.filter;
    document.querySelectorAll('.gallery-item').forEach(function (item) {
      var show = cat === 'all' || item.dataset.category === cat;
      item.style.display = show ? '' : 'none';
    });
  });

  /* ---------- Gallery lightbox ---------- */
  var lightbox = document.querySelector('.lightbox');
  if (lightbox) {
    var lbImg = lightbox.querySelector('img');
    var lbCaption = lightbox.querySelector('.lightbox-caption');
    var visibleItems = [];
    var lbIndex = 0;

    // Only the photos currently passing the filter, so prev/next never lands
    // on a hidden one.
    function refreshVisible() {
      visibleItems = Array.prototype.slice
        .call(document.querySelectorAll('.gallery-item'))
        .filter(function (el) { return el.style.display !== 'none'; });
    }
    function openLightbox(idx) {
      if (!visibleItems.length) return;
      lbIndex = (idx + visibleItems.length) % visibleItems.length;
      var img = visibleItems[lbIndex].querySelector('img');
      if (!img) return;
      setImgSrc(lbImg, img.src);
      lbImg.alt = img.alt;
      lbCaption.textContent = img.alt;
      lightbox.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
      lightbox.classList.remove('is-open');
      document.body.style.overflow = '';
    }
    function step(dir) {
      openLightbox(lbIndex + dir);
    }
    function openFrom(item) {
      refreshVisible();
      var idx = visibleItems.indexOf(item);
      if (idx !== -1) openLightbox(idx);
    }

    // The static fallback markup has no tabindex/role of its own (the
    // rendered items above set theirs inline), so add it here.
    document.querySelectorAll('.gallery-item:not([role])').forEach(function (item) {
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');
    });

    document.addEventListener('click', function (e) {
      var item = e.target.closest('.gallery-item');
      if (item) openFrom(item);
    });
    document.addEventListener('keypress', function (e) {
      if (e.key !== 'Enter') return;
      var item = e.target.closest('.gallery-item');
      if (item) openFrom(item);
    });

    var closeBtn = lightbox.querySelector('.lightbox-close');
    var prevBtn = lightbox.querySelector('.lightbox-prev');
    var nextBtn = lightbox.querySelector('.lightbox-next');
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (prevBtn) prevBtn.addEventListener('click', function () { step(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { step(1); });
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
  }

  /* ---------- FAQ accordion ----------
     Delegated on document rather than bound per-button, since the About/
     Rentals FAQ content is replaced asynchronously once the Supabase read
     resolves (see dbGetAll('faqs') above) - direct bindings would be lost
     when that innerHTML swap happens. */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.faq-question');
    if (!btn) return;
    var item = btn.closest('.faq-item');
    var wasOpen = item.classList.contains('open');
    item.parentElement.querySelectorAll('.faq-item').forEach(function (i) {
      i.classList.remove('open');
    });
    if (!wasOpen) item.classList.add('open');
  });

  /* ---------- Contact form: prefill from ?interest=&name=&email=&guests=&date= ---------- */
  var contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    var params = new URLSearchParams(window.location.search);
    var interest = params.get('interest');
    var nameParam = params.get('name');
    var emailParam = params.get('email');
    var guestsParam = params.get('guests');
    var dateParam = params.get('date');
    var whatsappParam = params.get('whatsapp');
    var durationParam = params.get('duration');
    var officeParam = params.get('office');
    // Bike types come from the admin-managed "bikes" table, so accept any
    // qty_<slug> param and look the display names up rather than assuming a
    // fixed four. Falls back to the slug if the lookup fails.
    var bikeRequests = [];
    params.forEach(function (value, key) {
      if (key.indexOf('qty_') !== 0) return;
      var qty = parseInt(value, 10);
      if (qty > 0) bikeRequests.push({ slug: key.slice(4), qty: qty });
    });

    var subjectField = contactForm.querySelector('[name="subject"]');
    if (subjectField && interest) subjectField.value = 'Booking enquiry: ' + interest;

    var nameField = contactForm.querySelector('[name="name"]');
    if (nameField && nameParam) nameField.value = nameParam;

    var emailField = contactForm.querySelector('[name="email"]');
    if (emailField && emailParam) emailField.value = emailParam;

    // The WhatsApp number now has its own field (see contact.html), so a
    // number arriving from a tour/rental booking form goes straight into it
    // instead of being folded into the message text.
    var whatsappField = contactForm.querySelector('[name="whatsapp"]');
    if (whatsappField && whatsappParam) whatsappField.value = whatsappParam;

    var messageField = contactForm.querySelector('[name="message"]');
    if (messageField && (guestsParam || dateParam || officeParam || durationParam || bikeRequests.length)) {
      var fillMessage = function (bikeNames) {
        var lines = [];
        var bikeLines = bikeRequests.map(function (b) {
          return b.qty + 'x ' + (bikeNames[b.slug] || b.slug);
        });
        if (interest) lines.push('Tour/rental: ' + interest);
        if (officeParam) lines.push('Office: ' + officeParam);
        if (bikeLines.length) lines.push('Bikes requested: ' + bikeLines.join(', '));
        if (durationParam) lines.push('Rental length: ' + durationParam);
        if (guestsParam) lines.push('Number of people: ' + guestsParam);
        if (dateParam) lines.push('Preferred date: ' + dateParam);
        messageField.value = lines.join('\n');
      };

      if (bikeRequests.length) {
        dbGetAll('bikes').then(function (bikes) {
          var names = {};
          bikes.forEach(function (b) { names[b.id] = b.name; });
          fillMessage(names);
        }, function () { fillMessage({}); });
      } else {
        fillMessage({});
      }
    }
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll('.current-year').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
