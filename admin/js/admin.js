// Diani Bikes - Admin console shared library.
// Data layer (Store) reads/writes a live Supabase database - see
// js/supabase-client.js for the client instance and supabase/schema.sql for
// the table definitions and RLS policies.
(function (global) {
  'use strict';

  /* ============================== Store ============================== */
  // Backed by Supabase (see js/supabase-client.js for the client instance).
  // Table/column names in the database are snake_case; this layer converts
  // to/from the camelCase property names used throughout the page scripts,
  // so call sites (getAll/getById/upsert/remove) never need to rename
  // fields - only wrap calls in .then() since they're now async.

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function newId(table) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return uid();
  }

  function slugify(str) {
    return String(str || 'item').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'item';
  }

  function toSnakeKey(k) { return k.replace(/([A-Z])/g, '_$1').toLowerCase(); }
  function toCamelKey(k) { return k.replace(/_([a-z])/g, function (_, c) { return c.toUpperCase(); }); }

  function rowToCamel(row) {
    if (!row) return row;
    var out = {};
    Object.keys(row).forEach(function (k) { out[toCamelKey(k)] = row[k]; });
    return out;
  }
  function itemToSnake(item) {
    var out = {};
    Object.keys(item).forEach(function (k) { out[toSnakeKey(k)] = item[k]; });
    return out;
  }

  function unwrap(result) {
    if (result.error) throw result.error;
    return result.data;
  }

  var Store = {
    getAll: function (table) {
      var query = window.sb.from(table).select('*');
      if (table === 'bikes') query = query.order('sort_order', { ascending: true });
      else if (table !== 'tours' && table !== 'seo') query = query.order('created_at', { ascending: false });
      return query.then(unwrap).then(function (rows) { return rows.map(rowToCamel); });
    },

    getById: function (table, id) {
      return window.sb.from(table).select('*').eq('id', id).maybeSingle()
        .then(unwrap).then(function (row) { return row ? rowToCamel(row) : null; });
    },

    upsert: function (table, item) {
      var payload = Object.assign({}, item);
      if (!payload.id) {
        // tours/bikes use readable text slugs as their primary key (bike slugs
        // also become the rental booking form's qty_<id> field names).
        if (table === 'tours') payload.id = slugify(payload.title);
        else if (table === 'bikes') payload.id = slugify(payload.name);
        else payload.id = newId(table);
      }
      return window.sb.from(table).upsert(itemToSnake(payload)).select().single()
        .then(unwrap).then(rowToCamel);
    },

    remove: function (table, id) {
      return window.sb.from(table).delete().eq('id', id).then(unwrap).then(function () {});
    }
  };

  /* ============================== Nav ============================== */
  function initNav() {
    var page = document.body.getAttribute('data-page');
    document.querySelectorAll('[data-nav]').forEach(function (el) {
      if (el.getAttribute('data-nav') === page) el.classList.add('active');
    });

    var toggle = document.querySelector('.admin-menu-toggle');
    var sidebar = document.querySelector('.admin-sidebar');
    var scrim = document.querySelector('.admin-sidebar-scrim');

    function closeSidebar() {
      if (sidebar) sidebar.classList.remove('is-open');
      if (scrim) scrim.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    if (toggle && sidebar) {
      toggle.addEventListener('click', function () {
        var willOpen = !sidebar.classList.contains('is-open');
        sidebar.classList.toggle('is-open', willOpen);
        if (scrim) scrim.classList.toggle('is-open', willOpen);
        document.body.style.overflow = willOpen ? 'hidden' : '';
      });
    }
    if (scrim) scrim.addEventListener('click', closeSidebar);
    // Close on navigating to another section, same as the public site's nav -
    // otherwise the drawer is still open (and body scroll still locked) on
    // the page you land on.
    if (sidebar) {
      sidebar.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          if (window.innerWidth < 960) closeSidebar();
        });
      });
    }
  }

  /* ============================== Toast ============================== */
  var toastTimer = null;
  function toast(message) {
    var el = document.querySelector('.admin-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'admin-toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.remove('is-error');
    el.classList.add('is-open');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-open'); }, 2400);
  }

  // Surfaces a failed Supabase call instead of letting it fail silently -
  // use as AdminStore.upsert(...).catch(AdminUI.showError).
  function showError(err) {
    var el = document.querySelector('.admin-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'admin-toast';
      document.body.appendChild(el);
    }
    el.textContent = 'Something went wrong: ' + ((err && err.message) || 'please try again.');
    el.classList.add('is-open', 'is-error');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-open'); }, 5000);
  }

  /* ============================== Confirm dialog ============================== */
  function confirmDialog(title, message, onConfirm) {
    var overlay = document.querySelector('.confirm-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = '<div class="confirm-box"><h4></h4><p></p><div class="actions">' +
        '<button type="button" class="btn btn-outline btn-sm" data-action="cancel">Cancel</button>' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="confirm" style="background:var(--color-pink); box-shadow:none;">Delete</button>' +
        '</div></div>';
      document.body.appendChild(overlay);
    }
    overlay.querySelector('h4').textContent = title;
    overlay.querySelector('p').textContent = message;
    overlay.classList.add('is-open');

    function close() { overlay.classList.remove('is-open'); }
    overlay.querySelector('[data-action="cancel"]').onclick = close;
    overlay.onclick = function (e) { if (e.target === overlay) close(); };
    overlay.querySelector('[data-action="confirm"]').onclick = function () {
      close();
      onConfirm();
    };
  }

  /* ============================== Form modal (reschedule / cancel etc.) ============================== */
  function formModal(title, fieldsHtml, submitLabel, onSubmit) {
    var overlay = document.querySelector('.form-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'confirm-overlay form-modal-overlay';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML =
      '<div class="confirm-box" style="max-width:420px; text-align:left;">' +
        '<h4 style="text-align:center;">' + title + '</h4>' +
        '<div class="form-grid modal-form">' + fieldsHtml + '</div>' +
        '<div class="actions" style="margin-top:1.1rem;">' +
          '<button type="button" class="btn btn-outline btn-sm" data-action="cancel">Cancel</button>' +
          '<button type="button" class="btn btn-primary btn-sm" data-action="confirm">' + submitLabel + '</button>' +
        '</div>' +
      '</div>';
    overlay.classList.add('is-open');

    function close() { overlay.classList.remove('is-open'); }
    overlay.querySelector('[data-action="cancel"]').onclick = close;
    overlay.onclick = function (e) { if (e.target === overlay) close(); };
    overlay.querySelector('[data-action="confirm"]').onclick = function () {
      var data = {};
      overlay.querySelectorAll('.modal-form [name]').forEach(function (el) { data[el.name] = el.value; });
      close();
      onSubmit(data);
    };
  }

  /* ============================== Chip toggle group ============================== */
  function initChipToggleGroup(container, opts) {
    opts = opts || {};
    container.querySelectorAll('.chip-toggle').forEach(function (chip) {
      chip.addEventListener('click', function () {
        if (opts.multi === false) {
          container.querySelectorAll('.chip-toggle').forEach(function (c) { c.classList.remove('active'); });
          chip.classList.add('active');
        } else {
          chip.classList.toggle('active');
        }
      });
    });
  }
  function getActiveChips(container) {
    return Array.from(container.querySelectorAll('.chip-toggle.active')).map(function (c) { return c.dataset.value; });
  }
  function setActiveChips(container, values) {
    values = values || [];
    container.querySelectorAll('.chip-toggle').forEach(function (c) {
      c.classList.toggle('active', values.indexOf(c.dataset.value) !== -1);
    });
  }

  /* ============================== Repeatable list editor ============================== */
  function initRepeatList(root, initialItems) {
    var listEl = root.querySelector('.repeat-list');
    var input = root.querySelector('.repeat-add-row input');
    var addBtn = root.querySelector('.repeat-add-row button');

    function render(items) {
      listEl.innerHTML = '';
      items.forEach(function (text, idx) {
        var row = document.createElement('div');
        row.className = 'repeat-list-row';
        var span = document.createElement('span');
        span.textContent = text;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Remove');
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>';
        btn.addEventListener('click', function () {
          var items = getItems();
          items.splice(idx, 1);
          render(items);
        });
        row.appendChild(span);
        row.appendChild(btn);
        listEl.appendChild(row);
      });
    }

    function getItems() {
      return Array.from(listEl.querySelectorAll('.repeat-list-row span')).map(function (s) { return s.textContent; });
    }

    addBtn.addEventListener('click', function () {
      var val = input.value.trim();
      if (!val) return;
      var items = getItems();
      items.push(val);
      render(items);
      input.value = '';
      input.focus();
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); addBtn.click(); }
    });

    render(initialItems || []);
    return { getItems: getItems, setItems: render };
  }

  /* ============================== Image upload (Supabase Storage) ============================== */
  // Uploads to the public "media" bucket and hands back the public URL -
  // the DB only ever stores that URL string, never image bytes.
  function initUploadDropzone(dropzone, onFiles) {
    var input = dropzone.querySelector('input[type="file"]');
    dropzone.addEventListener('click', function () { input.click(); });
    dropzone.addEventListener('dragover', function (e) { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', function () { dropzone.classList.remove('drag-over'); });
    dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      handleFiles(e.dataTransfer.files);
    });
    input.addEventListener('change', function () { handleFiles(input.files); input.value = ''; });

    function handleFiles(fileList) {
      Array.from(fileList).forEach(function (file) {
        if (!/^image\//.test(file.type)) return;
        var ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        var path = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
        window.sb.storage.from('media').upload(path, file).then(function (result) {
          if (result.error) { toast('Upload failed: ' + result.error.message); return; }
          var publicUrl = window.sb.storage.from('media').getPublicUrl(path).data.publicUrl;
          onFiles(publicUrl, file.name);
        });
      });
    }
  }

  /* ============================== Inline form validation ============================== */
  function initInlineValidation(form) {
    if (!form) return;
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

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatDate(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    // Callers drop the result straight into innerHTML, and booking dates
    // originate from the public form, so the unparseable passthrough below
    // has to be escaped rather than returned raw.
    if (isNaN(d)) return escapeHtml(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  global.AdminStore = Store;
  global.AdminUI = {
    initNav: initNav,
    toast: toast,
    showError: showError,
    confirmDialog: confirmDialog,
    formModal: formModal,
    initChipToggleGroup: initChipToggleGroup,
    getActiveChips: getActiveChips,
    setActiveChips: setActiveChips,
    initRepeatList: initRepeatList,
    initUploadDropzone: initUploadDropzone,
    initInlineValidation: initInlineValidation,
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    uid: uid
  };

  function initLogout() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('[data-logout]');
      if (!link) return;
      e.preventDefault();
      // The attribute value is where to land after signing out - "Back to
      // Site" sends you to the public homepage, "Log Out" to the login screen.
      var dest = link.getAttribute('data-logout') || 'login.html';
      if (window.sb) {
        window.sb.auth.signOut().then(
          function () { window.location.href = dest; },
          function () { window.location.href = dest; }
        );
      } else {
        window.location.href = dest;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initLogout();
  });
})(window);
