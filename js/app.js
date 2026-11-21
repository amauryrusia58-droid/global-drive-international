/* Global Drive International · interfaz de solicitud
   El navegador calcula cotizaciones para mostrarlas al cliente; un servidor debe
   recalcular y verificar el precio antes de aceptar una solicitud real. */
(() => {
  'use strict';
  const settings = window.GDI_CONFIG;
  if (!settings || !settings.pricesRUB) {
    console.error('No se pudo cargar js/config.js');
    return;
  }

  const years = [1, 3, 5, 10, 20];
  const pkgLabels = { standard: 'Estándar · libreto blanco · 8 idiomas', premium: 'Premium · libreto azul · 28 idiomas' };
  const state = { package: 'standard', year: 1, cardYears: { standard: 1, premium: 1 }, step: 1, opener: null, sending: false };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const modal = $('#requestModal');
  const dialog = $('.request-dialog', modal);
  const form = $('#requestForm');
  const money = (num) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(num).replace(/\u00a0/g, '.') + ' ₽';
  const cost = () => settings.pricesRUB[state.package][state.year];
  const labelYear = (n) => `${n} ${n === 1 ? 'año' : 'años'}`;
  const get = (name) => form.elements.namedItem(name);
  const val = (name) => String(get(name)?.value || '').trim();
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  function buildCardPills() {
    ['standard', 'premium'].forEach((pkg) => {
      const wrap = $(`[data-duration-pills="${pkg}"]`);
      wrap.replaceChildren(...years.map((y) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = labelYear(y);
        btn.setAttribute('aria-pressed', String(y === state.cardYears[pkg]));
        btn.className = y === state.cardYears[pkg] ? 'is-selected' : '';
        btn.addEventListener('click', () => {
          state.cardYears[pkg] = y;
          updateCard(pkg);
        });
        return btn;
      }));
      updateCard(pkg);
    });
  }

  function updateCard(pkg) {
    $(`[data-card-price="${pkg}"]`).textContent = money(settings.pricesRUB[pkg][state.cardYears[pkg]]);
    $$('button', $(`[data-duration-pills="${pkg}"]`)).forEach((button, index) => {
      const selected = years[index] === state.cardYears[pkg];
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function buildModalPills() {
    const container = $('#modalDurations');
    container.replaceChildren(...years.map((y) => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      const text = document.createElement('span');
      radio.type = 'radio'; radio.name = 'duration'; radio.value = String(y); radio.required = true;
      text.textContent = labelYear(y);
      label.append(radio, text);
      radio.addEventListener('change', () => {
        if (radio.checked) {
          state.year = y;
          state.cardYears[state.package] = y;
          updateCard(state.package);
          updateTotal();
        }
      });
      return label;
    }));
  }

  function selectPackage(pkg, year) {
    state.package = pkg;
    state.year = year;
    const radio = $(`input[name="package"][value="${pkg}"]`, form);
    radio.checked = true;
    const yearRadio = $(`input[name="duration"][value="${year}"]`, form);
    if (yearRadio) yearRadio.checked = true;
    updateTotal();
  }

  function updateTotal() {
    $('#modalPrice').textContent = money(cost());
    $('#reviewPrice').textContent = money(cost());
  }

  function openRequest(pkg = 'standard', year = 1) {
    state.opener = document.activeElement;
    state.step = 1;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    selectPackage(pkg, year);
    $('#submissionStatus').hidden = true;
    $('#downloadSummary').hidden = true;
    setStep(1);
    dialog.focus({ preventScroll: true });
  }

  function closeRequest() {
    if (state.sending) return;
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    state.opener?.focus?.({ preventScroll: true });
  }

  function setStep(n) {
    state.step = n;
    $$('.form-step', form).forEach((section) => { section.hidden = Number(section.dataset.step) !== n; });
    $$('[data-progress]', modal).forEach((item) => {
      const i = Number(item.dataset.progress);
      item.classList.toggle('is-active', i === n);
      item.classList.toggle('is-complete', i < n);
      if (i === n) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
    });
    $('#prevStep').hidden = n === 1;
    $('#nextStep').hidden = n === 4;
    $('#submitRequest').hidden = n !== 4;
    if (n === 4) renderReview();
    dialog.scrollTo({ top: 0, behavior: 'instant' });
  }

  function clearError(field) {
    field?.removeAttribute('aria-invalid');
    const label = field?.closest('label');
    label?.querySelector('.field-error')?.remove();
  }

  function error(field, message) {
    if (!field) return false;
    clearError(field);
    field.setAttribute('aria-invalid', 'true');
    const label = field.closest('label');
    if (label) {
      const msg = document.createElement('span');
      msg.className = 'field-error';
      msg.textContent = message;
      label.append(msg);
    }
    return false;
  }

  const fileExt = (file) => file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
  const allowedFile = (input, file) => {
    const name = input.name;
    const types = (name === 'photo' || name === 'signature') ? ['jpg', 'jpeg', 'png'] : ['jpg', 'jpeg', 'pdf'];
    const mimes = (name === 'photo' || name === 'signature') ? ['image/jpeg', 'image/png'] : ['image/jpeg', 'application/pdf'];
    return types.includes(fileExt(file)) && (!file.type || mimes.includes(file.type));
  };

  function validateStep(n) {
    const section = $(`.form-step[data-step="${n}"]`, form);
    const fields = $$('input,select', section).filter((el) => el.type !== 'hidden');
    let firstInvalid = null;
    for (const field of fields) {
      clearError(field);
      if (field.type === 'radio') continue;
      if (field.required && field.type === 'file' && !field.files?.length) {
        error(field, 'Adjunta este archivo para continuar.');
        firstInvalid ||= field;
      } else if (field.type !== 'file' && !field.checkValidity()) {
        error(field, field.validity.valueMissing ? 'Este campo es obligatorio.' : (field.type === 'email' ? 'Escribe un correo válido.' : 'Revisa la información.'));
        firstInvalid ||= field;
      } else if (field.type === 'file' && field.files?.length) {
        const file = field.files[0];
        if (!allowedFile(field, file)) {
          error(field, 'Formato no válido: utiliza JPG, PNG o PDF según el campo.');
          firstInvalid ||= field;
        } else if (file.size > settings.maxFileBytes) {
          error(field, `El archivo excede ${Math.round(settings.maxFileBytes / (1024 * 1024))} MB.`);
          firstInvalid ||= field;
        }
      }
    }
    if (n === 2) {
      if (val('birthDate') && val('birthDate') >= today()) {
        error(get('birthDate'), 'La fecha de nacimiento debe ser anterior a hoy.');
        firstInvalid ||= get('birthDate');
      }
      if (val('licenseIssue') && val('licenseIssue') > today()) {
        error(get('licenseIssue'), 'La fecha de emisión no puede estar en el futuro.');
        firstInvalid ||= get('licenseIssue');
      }
      if (val('licenseIssue') && val('licenseExpiry') && val('licenseIssue') >= val('licenseExpiry')) {
        error(get('licenseExpiry'), 'La fecha de vencimiento debe ser posterior a la emisión.');
        firstInvalid ||= get('licenseExpiry');
      } else if (val('licenseExpiry') && val('licenseExpiry') < today()) {
        error(get('licenseExpiry'), 'Necesitas una licencia nacional vigente.');
        firstInvalid ||= get('licenseExpiry');
      }
    }
    if (n === 1 && !get('package').value) firstInvalid ||= get('package');
    if (n === 1 && !$('input[name="duration"]:checked', form)) firstInvalid ||= $('input[name="duration"]', form);
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstInvalid.focus({ preventScroll: true });
      return false;
    }
    return true;
  }

  function syncAddress() {
    if (!$('#sameAddress').checked) return;
    get('deliveryCountry').value = val('country');
    get('deliveryCity').value = val('city');
    get('deliveryAddress').value = val('homeAddress');
    get('deliveryZip').value = val('zip');
  }

  function item(title, content) {
    const box = document.createElement('div');
    box.className = 'review-item';
    const k = document.createElement('small');
    k.textContent = title;
    const v = document.createElement('b');
    v.textContent = content || '—';
    box.append(k, v);
    return box;
  }

  function renderReview() {
    const area = $('#reviewGrid');
    const docs = ['photo', 'signature', 'licenseFront', 'licenseBack']
      .map((name) => `${({ photo: 'Foto', signature: 'Firma', licenseFront: 'Licencia frente', licenseBack: 'Licencia reverso' })[name]}: ${get(name).files?.[0]?.name || 'No adjunto'}`)
      .join(' · ');
    area.replaceChildren(
      item('Paquete', pkgLabels[state.package]),
      item('Duración', labelYear(state.year)),
      item('Nombre completo', `${val('firstName')} ${val('lastName')}`),
      item('Dirección particular', `${val('homeAddress')}, ${val('city')}, ${val('country')}`),
      item('Licencia nacional', `${val('licenseNumber')} · Categoría ${val('licenseCategory')}`),
      item('Vigencia de licencia nacional', `${val('licenseIssue')} — ${val('licenseExpiry')}`),
      item('Contacto', `${val('phone')} · ${val('email')}`),
      item('Dirección de entrega', `${val('deliveryAddress')}, ${val('deliveryCity')}, ${val('deliveryCountry')}`),
      item('Archivos seleccionados', docs)
    );
    updateTotal();
    if (!settings.submissionEndpoint) {
      const status = $('#submissionStatus');
      status.hidden = false;
      status.textContent = 'Versión de prueba: todavía no se ha configurado un receptor seguro de solicitudes. Puedes revisar el formulario y descargar el resumen, pero aquí no se enviarán ni guardarán datos o documentos.';
      $('#downloadSummary').hidden = false;
    }
  }

  function downloadSummary() {
    const lines = [
      'GLOBAL DRIVE INTERNATIONAL · RESUMEN DE SOLICITUD (SIN DOCUMENTOS)',
      'Este documento no significa que la solicitud haya sido enviada ni aceptada.',
      `Fecha: ${new Date().toLocaleString('es-ES')}`,
      `Paquete: ${pkgLabels[state.package]}`,
      `Duración solicitada: ${labelYear(state.year)}`,
      `Precio del libreto: ${money(cost())} (sin gastos de envío)`,
      ...['firstName','lastName','country','city','homeAddress','province','zip','birthDate','birthCountry','licenseNumber','licenseCategory','licenseIssue','licenseExpiry','phone','email','deliveryCountry','deliveryCity','deliveryAddress','deliveryZip','notes'].map((name) => `${name}: ${val(name)}`),
      ...['photo','signature','licenseFront','licenseBack'].map((name) => `${name}: ${get(name).files?.[0]?.name || '(no seleccionado)'}`),
      'IMPORTANTE: No sustituye la licencia nacional. Verificar aceptación y requisitos en el destino.'
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'Global-Drive-resumen-solicitud.txt';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function submitRealRequest(event) {
    event.preventDefault();
    if (state.step !== 4) {
      if (validateStep(state.step)) setStep(state.step + 1);
      return;
    }
    if (state.sending || !validateStep(4)) return;
    const status = $('#submissionStatus');
    status.hidden = false;
    const endpoint = String(settings.submissionEndpoint || '').trim();
    if (!endpoint) {
      status.textContent = 'La solicitud NO se ha enviado: falta conectar el servicio seguro que recibirá los datos y los archivos. Descarga el resumen si deseas revisar tu pedido.';
      $('#downloadSummary').hidden = false;
      status.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    let url;
    try { url = new URL(endpoint); } catch { status.textContent = 'El sistema de recepción no tiene una dirección válida.'; return; }
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
      status.textContent = 'Por seguridad, el receptor de documentos debe utilizar HTTPS.';
      return;
    }
    const payload = new FormData(form);
    payload.set('requestedPackage', state.package);
    payload.set('requestedYears', String(state.year));
    payload.set('quotedPriceRUB', String(cost()));
    payload.delete('package'); payload.delete('duration');
    state.sending = true;
    $('#submitRequest').disabled = true;
    $('#submitRequest').textContent = 'Enviando…';
    status.textContent = 'Enviando tu solicitud de forma segura…';
    try {
      const response = await fetch(url.href, { method: 'POST', body: payload, credentials: 'omit', mode: 'cors' });
      if (!response.ok) throw new Error('Respuesta HTTP no satisfactoria');
      const reply = await response.json();
      if (!reply || reply.accepted !== true || !reply.reference) throw new Error('Falta confirmación de recepción');
      status.textContent = `Solicitud recibida. Número de referencia: ${String(reply.reference)}. Guarda este código para tu seguimiento.`;
      $('#submitRequest').hidden = true;
      $('#downloadSummary').hidden = false;
    } catch (err) {
      console.error('La recepción no pudo confirmarse:', err);
      status.textContent = 'No se pudo confirmar la recepción de la solicitud. No vuelvas a enviarla hasta verificar si llegó al administrador.';
    } finally {
      state.sending = false;
      $('#submitRequest').disabled = false;
      $('#submitRequest').textContent = 'Enviar solicitud →';
      status.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  buildCardPills();
  buildModalPills();
  $('#footerYear').textContent = String(new Date().getFullYear());

  $$('[data-card-apply]').forEach((button) => button.addEventListener('click', () => {
    const pkg = button.dataset.cardApply;
    openRequest(pkg, state.cardYears[pkg]);
  }));
  $$('[data-open-request]').forEach((button) => button.addEventListener('click', () => openRequest('standard', state.cardYears.standard)));
  $('#closeRequest').addEventListener('click', closeRequest);
  modal.addEventListener('click', (event) => { if (event.target === modal) closeRequest(); });
  document.addEventListener('keydown', (event) => {
    if (modal.hidden) return;
    if (event.key === 'Escape') closeRequest();
    if (event.key === 'Tab') {
      const focusables = $$('button:not([disabled]):not([hidden]), [href], input:not([disabled]), select:not([disabled])', dialog)
        .filter((el) => el.getClientRects().length > 0 && !el.closest('[hidden]'));
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  $$('input[name="package"]', form).forEach((radio) => radio.addEventListener('change', () => {
    if (!radio.checked) return;
    state.package = radio.value;
    state.year = state.cardYears[state.package];
    const targetYear = $(`input[name="duration"][value="${state.year}"]`, form);
    if (targetYear) targetYear.checked = true;
    updateTotal();
  }));

  $('#sameAddress').addEventListener('change', () => {
    const same = $('#sameAddress').checked;
    if (same) syncAddress();
    ['deliveryCountry', 'deliveryCity', 'deliveryAddress', 'deliveryZip'].forEach((name) => {
      get(name).readOnly = same;
      get(name).classList.toggle('read-only', same);
    });
  });
  ['country', 'city', 'homeAddress', 'zip'].forEach((name) => get(name).addEventListener('input', syncAddress));

  $$('input[type="file"]', form).forEach((input) => input.addEventListener('change', () => {
    clearError(input);
    const display = $(`[data-file-label="${input.name}"]`);
    if (input.files?.length) {
      display.textContent = input.files[0].name;
      if (!allowedFile(input, input.files[0]) || input.files[0].size > settings.maxFileBytes) {
        display.textContent = 'Archivo no válido: revisa formato o tamaño';
        error(input, 'Selecciona un archivo JPG, PNG o PDF permitido, de máximo 10 MB.');
      }
    } else display.textContent = 'Seleccionar archivo';
  }));

  $('#nextStep').addEventListener('click', () => {
    if (state.step === 3) syncAddress();
    if (!validateStep(state.step)) return;
    setStep(state.step + 1);
  });
  $('#prevStep').addEventListener('click', () => setStep(state.step - 1));
  $('#downloadSummary').addEventListener('click', downloadSummary);
  form.addEventListener('submit', submitRealRequest);

  const menuButton = $('.menu-toggle');
  const mobileNav = $('#mobileNav');
  menuButton.addEventListener('click', () => {
    mobileNav.hidden = !mobileNav.hidden;
    menuButton.setAttribute('aria-expanded', String(!mobileNav.hidden));
  });
  $$('.mobile-nav a, .mobile-nav button').forEach((el) => el.addEventListener('click', () => {
    mobileNav.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
  }));
})();
