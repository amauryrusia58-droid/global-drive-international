/* Global Drive International · interfaz de solicitud
   El navegador calcula cotizaciones para mostrarlas al cliente; un servidor debe
   recalcular y verificar el precio antes de aceptar una solicitud real. */
(() => {
  'use strict';
  const settings = window.GDI_CONFIG;
  const internalTest = new URLSearchParams(location.search).get('test') === '1';
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
  if (internalTest) {
    document.title = 'Prueba interna de solicitud | Global Drive International';
    document.getElementById('gdiTestBanner').hidden = false;
  }
  const dialog = $('.request-dialog', modal);
  const form = $('#requestForm');
  const money = (num) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(num).replace(/\u00a0/g, '.') + ' ₽';
  const cost = () => settings.pricesRUB[state.package][state.year];
  const labelYear = (n) => `${n} ${n === 1 ? 'año' : 'años'}`;
  const get = (name) => form.elements.namedItem(name);
  const categories = () => $$('input[name="licenseCategories"]:checked', form).map((input) => input.value === 'Otra' ? `Otra: ${val('otherCategory')}` : input.value);
  const bankIsConfigured = () => Boolean(settings.sberbank?.enabled && /^\d{16,19}$/.test(String(settings.sberbank?.cardNumber || '').replace(/\s+/g, '')) && String(settings.sberbank?.recipientName || '').trim());
  const bankCopyText = () => {
    const digits = String(settings.sberbank?.cardNumber || '').replace(/\s+/g, '');
    return /^\d{16,19}$/.test(digits) ? digits : 'SBERBANK-CUENTA-PENDIENTE';
  };
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
    $('#paymentPrice').textContent = money(cost());
  }

  function openRequest(pkg = 'standard', year = 1) {
    state.opener = document.activeElement;
    state.step = 1;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    selectPackage(pkg, year);
    $('#submissionStatus').hidden = true;
    $('#paymentSubmissionStatus').hidden = true;
    $('#paymentDeclared').checked = false;
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
    $('#nextStep').hidden = n === 5;
    $('#submitRequest').hidden = n !== 5;
    if (n === 4) renderReview();
    if (n === 5) updatePaymentDetails();
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
      const checked = $$('input[name="licenseCategories"]:checked', form);
      const categoryError = $('#categoryError');
      categoryError.hidden = checked.length > 0;
      $('#categoryGroup').classList.toggle('category-invalid', checked.length === 0);
      if (!checked.length) firstInvalid ||= $('input[name="licenseCategories"]', form);
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
    if (n === 5 && !internalTest && bankIsConfigured() && !$('#paymentDeclared').checked) {
      error($('#paymentDeclared'), 'Marca esta casilla solo después de realizar la transferencia.');
      firstInvalid ||= $('#paymentDeclared');
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
    const docs = ['photo', 'signature', 'licenseOriginal']
      .map((name) => `${({ photo: 'Foto', signature: 'Firma', licenseOriginal: 'Licencia original' })[name]}: ${get(name).files?.[0]?.name || 'No adjunto'}`)
      .join(' · ');
    area.replaceChildren(
      item('Paquete', pkgLabels[state.package]),
      item('Duración', labelYear(state.year)),
      item('Nombre completo', `${val('firstName')} ${val('lastName')}`),
      item('Dirección particular', `${val('homeAddress')}, ${val('city')}, ${val('country')}`),
      item('Licencia nacional', `${val('licenseNumber')} · Categorías: ${categories().join(', ')}`),
      item('Vigencia de licencia nacional', `${val('licenseIssue')} — ${val('licenseExpiry')}`),
      item('Contacto', `${val('phone')} · ${val('email')}`),
      item('Dirección de entrega', `${val('deliveryAddress')}, ${val('deliveryCity')}, ${val('deliveryCountry')}`),
      item('Archivos seleccionados', docs)
    );
    updateTotal();
    if (!window.GDI_DATA?.receptionReady) {
      const status = $('#submissionStatus');
      status.hidden = false;
      status.textContent = 'Recepción aún no habilitada: Firebase y Supabase están configurados, pero falta un servicio seguro para recibir archivos y la política de privacidad completa. Puedes descargar el resumen; no se guardarán documentos.';
      $('#downloadSummary').hidden = false;
    } else {
      $('#submissionStatus').hidden = true;
    }
  }

  function downloadSummary() {
    const lines = [
      'GLOBAL DRIVE INTERNATIONAL · RESUMEN DE SOLICITUD (SIN DOCUMENTOS)',
      'Este documento no significa que la solicitud haya sido enviada, pagada o aceptada.',
      `Fecha: ${new Date().toLocaleString('es-ES')}`,
      `Paquete: ${pkgLabels[state.package]}`,
      `Duración solicitada: ${labelYear(state.year)}`,
      `Precio del libreto: ${money(cost())} (sin gastos de envío)`,
      ...['firstName','lastName','country','city','homeAddress','province','zip','birthDate','birthCountry','licenseNumber','licenseIssue','licenseExpiry','phone','email','deliveryCountry','deliveryCity','deliveryAddress','deliveryZip','notes'].map((name) => `${name}: ${val(name)}`),
      `Categorías: ${categories().join(', ')}`,
      `Método de pago: Sberbank (RUB); transferencia no verificada`,
      ...['photo','signature','licenseOriginal'].map((name) => `${name}: ${get(name).files?.[0]?.name || '(no seleccionado)'}`),
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
    if (state.step !== 5) {
      if (validateStep(state.step)) setStep(state.step + 1);
      return;
    }
    if (state.sending || !validateStep(5)) return;
    const status = $('#paymentSubmissionStatus');
    status.hidden = false;
    const gateway = window.GDI_DATA;
    if (!gateway?.receptionReady) {
      status.textContent = 'Solicitud NO enviada: aún falta programar el servicio de recepción segura de archivos y completar la privacidad. La tarjeta Sberbank es solo una referencia, no un pago habilitado.';
      $('#downloadSummary').hidden = false;
      status.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!get('privacyConsent').checked) {
      status.textContent = 'Debes aceptar el consentimiento de tratamiento de datos del paso anterior.';
      setStep(4);
      return;
    }
    state.sending = true;
    $('#submitRequest').disabled = true;
    $('#submitRequest').textContent = 'Enviando documentos…';
    status.textContent = 'Conectando con el receptor protegido…';
    try {
      const reply = await gateway.submit(form, state.package, state.year, categories(), Boolean($('#paymentDeclared').checked), (message)=>{status.textContent=message;});
      if (!reply?.reference) throw new Error('Firebase no confirmó la referencia.');
      status.textContent = `PRUEBA REGISTRADA correctamente. Referencia: ${reply.reference}. Abre admin.html para comprobar los datos y las tres imágenes. Ningún pago fue realizado.`;
      $('#submitRequest').hidden = true;
      $('#downloadSummary').hidden = false;
    } catch (err) {
      console.error('La recepción no pudo confirmarse:', err);
      status.textContent = `No se pudo confirmar la recepción: ${err?.message || 'error de conexión'}. Verifica el estado antes de repetir el envío; puede existir una carga incompleta.`;
    } finally {
      state.sending = false;
      $('#submitRequest').disabled = false;
      $('#submitRequest').textContent = internalTest ? 'Enviar solicitud de prueba →' : 'Enviar solicitud para revisión →';
      status.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function updatePaymentDetails() {
    const configured = bankIsConfigured();
    const number = String(settings.sberbank?.cardNumber || '').replace(/\s+/g, '');
    const hasNumber = /^\d{16,19}$/.test(number);
    $('#bankCardNumber').textContent = hasNumber ? number.replace(/(\d{4})(?=\d)/g, '$1 ').trim() : 'SIN CONFIGURAR';
    $('#bankCardHolder').textContent = settings.sberbank?.recipientName || 'TITULAR PENDIENTE';
    $('#bankCardBadge').textContent = configured ? 'CUENTA HABILITADA' : 'PAGOS AÚN NO HABILITADOS';
    $('#bankCopyValue').textContent = bankCopyText();
    $('#paymentTestNotice').hidden = internalTest ? false : configured;
    if (internalTest) $('#paymentTestNotice').textContent = 'PRUEBA INTERNA: NO TRANSFIERAS DINERO. Solo comprobaremos los datos y los archivos ficticios; el estado del pago quedará pendiente.';
    $('#copyFeedback').textContent = '';
    $('#paymentDeclared').disabled = internalTest || !configured;
    $('.payment-declaration').classList.toggle('is-disabled', !configured);
    $('#submitRequest').textContent = internalTest ? 'Enviar solicitud de prueba →' : 'Enviar solicitud para revisión →';
  }

  async function copyBankReference() {
    const reference = bankCopyText();
    const configured = bankIsConfigured();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(reference);
      } else {
        const tmp = document.createElement('textarea');
        tmp.value = reference; tmp.style.position = 'fixed'; tmp.style.opacity = '0';
        document.body.append(tmp); tmp.select();
        const copied = document.execCommand('copy'); tmp.remove();
        if (!copied) throw new Error('Copia no permitida');
      }
      $('#copyFeedback').textContent = configured
        ? 'Número de tarjeta copiado. Verifica el destinatario antes de transferir.'
        : 'Número de tarjeta copiado para consulta. Los pagos aún no están habilitados; no envíes dinero.';
    } catch {
      $('#copyFeedback').textContent = `Copia manual: ${reference}`;
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
        error(input, 'Selecciona un archivo JPG, PNG o PDF permitido, de máximo 5 MB.');
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
  $('#copyBankDetails').addEventListener('click', copyBankReference);
  $$('input[name="licenseCategories"]', form).forEach((checkbox) => checkbox.addEventListener('change', () => {
    const other = $('input[name="licenseCategories"][value="Otra"]', form).checked;
    $('#otherCategoryWrap').hidden = !other;
    get('otherCategory').required = other;
    if (!other) get('otherCategory').value = '';
    $('#categoryError').hidden = categories().length > 0;
    $('#categoryGroup').classList.toggle('category-invalid', categories().length === 0);
  }));
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
