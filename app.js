const { menu, config } = window;
const $ = selector => document.querySelector(selector);
const money = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const toCents = value => Math.round(Number(value) * 100);
const moneyCents = cents => money(cents / 100);
const cartKey = 'topets-cart-v1';
try { localStorage.removeItem(cartKey) } catch { }
const cart = [];
let activeCategory = 'Todos';
let selectedProduct = null;
const categories = ['Todos', ...new Set(menu.map(product => product.category))];
const addonCategories = new Set(['Destaques da casa', 'Tradicionais', 'Cachorro-quente', 'Frango', 'Filé de frango', 'Calabresa e bacon', 'Filé', 'Coração', 'Picanha e especiais', 'Tapiocas', 'Espetinhos']);

$('#categories').innerHTML = categories.map((category, index) => `<button class="category ${index === 0 ? 'active' : ''}" data-category="${esc(category)}">${esc(category)}</button>`).join('');
function esc(value = '') { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])) }
function renderMenu() {
  const term = $('#search').value.trim().toLocaleLowerCase('pt-BR');
  const filtered = menu.filter(product => (activeCategory === 'Todos' || product.category === activeCategory) && (`${product.name} ${product.description || ''} ${product.category}`).toLocaleLowerCase('pt-BR').includes(term));
  $('#menu-grid').innerHTML = filtered.map(product => `<article class="product-card"><div class="card-top"><div><h3>${esc(product.name)}</h3><span class="custom-tag">${esc(product.category)}${product.category === 'Açaí' ? ' · personalize' : ''}</span></div><b class="price">${money(product.price)}</b></div><p>${esc(product.description || 'Preparado na hora. Consulte nossa equipe pelo WhatsApp para detalhes.')}</p><div class="card-bottom"><button class="add-button" data-add="${esc(product.id)}">+ Adicionar</button><span class="custom-tag">${product.category === 'Açaí' || addonCategories.has(product.category) ? 'Personalize seu lanche' : 'Topet’s Lanches'}</span></div></article>`).join('');
  $('#no-results').hidden = filtered.length > 0;
}
function renderNeighborhoods() {
  const select = $('#district');
  if (!Array.isArray(config.neighborhoods) || config.neighborhoods.length === 0) { select.innerHTML = '<option value="">Bairros ainda não configurados</option>'; select.disabled = true; $('#neighborhood-help').textContent = 'A hamburgueria precisa cadastrar os bairros atendidos e suas taxas em data.js.'; return }
  select.innerHTML = '<option value="">Selecione seu bairro</option>' + config.neighborhoods.map(item => `<option value="${esc(item.name)}">${esc(item.name)}</option>`).join('');
  select.disabled = false; $('#neighborhood-help').textContent = 'A taxa de entrega será calculada para o bairro selecionado.';
}
$('#categories').addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (!button) return; activeCategory = button.dataset.category; document.querySelectorAll('.category').forEach(item => item.classList.toggle('active', item === button)); renderMenu() });
$('#search').addEventListener('input', renderMenu);
function acaiLimit(product) { return product.name.toLowerCase().includes('barca') ? 7 : product.name.toLowerCase().includes('1 litro') ? 5 : 3 }
function updateAcaiCount() { const count = $('#modal-toppings').querySelectorAll('[data-topping]:checked').length; const limit = acaiLimit(selectedProduct); $('#topping-count').textContent = `${count} selecionado${count === 1 ? '' : 's'} · ${limit - count} restante${limit - count === 1 ? '' : 's'}` }
function updateModalPrice() { if (!selectedProduct) return; const extraTotal = [...$('#modal-toppings').querySelectorAll('[data-addon]:checked')].reduce((sum, input) => sum + Number(input.dataset.priceCents), 0); $('#modal-price').textContent = moneyCents(toCents(selectedProduct.price) + extraTotal) }
function openModal(product) {
  selectedProduct = product; $('#modal-category').textContent = product.category; $('#modal-title').textContent = product.name; $('#modal-description').textContent = product.description || 'Preparado na hora.'; $('#item-notes').value = '';
  let options = '';
  if (product.category === 'Açaí') {
    const limit = acaiLimit(product);
    options += `<div class="option-title">Acompanhamentos <span id="topping-count">0 selecionados · ${limit} restantes</span></div><p class="option-note">Calda grátis. Escolha seus acompanhamentos favoritos.</p><div class="topping-grid">${config.acaiToppings.map(topping => `<label class="topping-choice"><input type="checkbox" data-topping value="${esc(topping)}">${esc(topping)}</label>`).join('')}</div>`;
  }
  if (addonCategories.has(product.category)) options += `<div class="option-title addon-title">Adicionais <span>escolha individualmente</span></div><div class="topping-grid addon-grid">${config.addons.map(addon => `<label class="topping-choice addon-choice"><input type="checkbox" data-addon value="${esc(addon.name)}" data-price-cents="${toCents(addon.price)}"><span>${esc(addon.name)}</span><b>+ ${money(addon.price)}</b></label>`).join('')}</div>`;
  $('#modal-toppings').innerHTML = options;
  $('#modal-toppings').querySelectorAll('input').forEach(input => input.addEventListener('change', () => { if (input.hasAttribute('data-topping')) { const limit = acaiLimit(product); if ($('#modal-toppings').querySelectorAll('[data-topping]:checked').length > limit) input.checked = false; updateAcaiCount() } updateModalPrice() }));
  updateModalPrice(); $('#product-modal').hidden = false; document.body.style.overflow = 'hidden';
}
$('#menu-grid').addEventListener('click', event => { const button = event.target.closest('[data-add]'); if (!button) return; const product = menu.find(item => item.id === button.dataset.add); if (!product) return; if (product.category === 'Açaí' || addonCategories.has(product.category)) openModal(product); else addItem(product, [], '', []) });
function addItem(product, toppings = [], notes = '', extras = []) {
  if (product.category === 'Açaí' && toppings.length > acaiLimit(product)) { alert(`Este açaí permite até ${acaiLimit(product)} acompanhamentos.`); return false }
  const basePriceCents = toCents(product.price), extrasTotal = extras.reduce((sum, extra) => sum + extra.priceCents, 0), priceCents = basePriceCents + extrasTotal;
  const signature = JSON.stringify([product.id, toppings, notes, extras]); const found = cart.find(item => item.signature === signature);
  if (found) found.qty++; else cart.push({ signature, id: product.id, name: product.name, category: product.category, basePriceCents, priceCents, qty: 1, toppings, extras, notes });
  save(); renderCart(); toast('Adicionado à sacola'); return true;
}
$('#confirm-add').onclick = () => {
  const toppings = [...$('#modal-toppings').querySelectorAll('[data-topping]:checked')].map(input => input.value);
  const extras = [...$('#modal-toppings').querySelectorAll('[data-addon]:checked')].map(input => ({ name: input.value, priceCents: Number(input.dataset.priceCents) }));
  if (selectedProduct.category === 'Açaí' && toppings.length > acaiLimit(selectedProduct)) { alert(`Este açaí permite até ${acaiLimit(selectedProduct)} acompanhamentos.`); return }
  if (addItem(selectedProduct, toppings, $('#item-notes').value.trim(), extras)) { $('#product-modal').hidden = true; document.body.style.overflow = '' }
};
$('#close-modal').onclick = () => { $('#product-modal').hidden = true; document.body.style.overflow = '' };
$('#product-modal').addEventListener('click', event => { if (event.target === $('#product-modal')) { $('#product-modal').hidden = true; document.body.style.overflow = '' } });
function save() { $('#cart-count').textContent = cart.reduce((sum, item) => sum + item.qty, 0); $('#drawer-count').textContent = `(${cart.reduce((sum, item) => sum + item.qty, 0)})` }
function selectedNeighborhood() { return config.neighborhoods.find(item => item.name === $('#district').value) || null }
function deliveryFeeCents() { const neighborhood = selectedNeighborhood(); return neighborhood && Number.isSafeInteger(neighborhood.deliveryFeeCents) && neighborhood.deliveryFeeCents >= 0 ? neighborhood.deliveryFeeCents : null }
function isConsultDelivery() { const neighborhood = selectedNeighborhood(); return !!(neighborhood && neighborhood.consultDelivery) }
function renderCart() {
  save();
  $('#cart-items').innerHTML = cart.map((item, index) => `<article class="cart-item"><div class="cart-item-head"><div><h3>${esc(item.name)}</h3>${item.extras.length ? `<p>Adicionais: ${item.extras.map(extra => `${esc(extra.name)} (+${moneyCents(extra.priceCents)})`).join(', ')}</p>` : ''}${item.toppings.length ? `<p>Acompanhamentos: ${item.toppings.map(esc).join(', ')}</p>` : ''}${item.notes ? `<p>Obs.: ${esc(item.notes)}</p>` : ''}</div><b class="cart-item-price">${moneyCents(item.priceCents * item.qty)}</b></div><div class="qty-row"><div class="qty-control"><button data-qty="${index}" data-delta="-1" aria-label="Diminuir">−</button><span>${item.qty}</span><button data-qty="${index}" data-delta="1" aria-label="Aumentar">+</button></div><small>${moneyCents(item.priceCents)} / un.</small><button class="remove-item" data-remove="${index}">Remover</button></div></article>`).join('');
  const empty = cart.length === 0; $('#empty-cart').hidden = !empty; $('#totals').hidden = empty; $('#checkout').hidden = empty; $('#clear-cart').hidden = empty;
  const subtotal = cart.reduce((sum, item) => sum + item.priceCents * item.qty, 0), delivery = document.querySelector('[name=fulfillment]:checked').value === 'delivery', fee = delivery ? deliveryFeeCents() : 0;
  const consult = delivery && isConsultDelivery();
  $('#subtotal').textContent = moneyCents(subtotal); $('#delivery-line').hidden = empty || !delivery; $('#delivery-value').textContent = !delivery ? '' : consult ? 'A confirmar no WhatsApp' : fee === null ? 'Taxa a configurar' : moneyCents(fee); $('#total').textContent = delivery && fee === null ? (consult ? 'Produtos + entrega a confirmar' : 'A configurar') : moneyCents(subtotal + fee);
}
$('#cart-items').addEventListener('click', event => { let button = event.target.closest('[data-qty]'); if (button) { const index = Number(button.dataset.qty); cart[index].qty += Number(button.dataset.delta); if (cart[index].qty < 1) cart.splice(index, 1); renderCart() } button = event.target.closest('[data-remove]'); if (button) { cart.splice(Number(button.dataset.remove), 1); renderCart() } });
$('#clear-cart').onclick = () => { cart.splice(0, cart.length); renderCart() };
function showCart() { renderCart(); $('#overlay').hidden = false; $('#cart-drawer').classList.add('open'); $('#cart-drawer').setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden' }
function hideCart() { $('#overlay').hidden = true; $('#cart-drawer').classList.remove('open'); $('#cart-drawer').setAttribute('aria-hidden', 'true'); document.body.style.overflow = '' }
$('#open-cart').onclick = showCart; $('#close-cart').onclick = hideCart; $('#overlay').onclick = hideCart; $('#back-menu').onclick = () => { hideCart(); location.hash = '#cardapio' };
document.addEventListener('keydown', event => { if (event.key === 'Escape') { hideCart(); $('#product-modal').hidden = true; document.body.style.overflow = '' } });
function syncFulfillment() { const delivery = document.querySelector('[name=fulfillment]:checked').value === 'delivery'; $('#delivery-fields').hidden = !delivery; const apartment = delivery && $('#residence-type').value === 'Apartamento'; $('#apartment-field').hidden = !apartment; $('#apartment-number').required = apartment; if (!apartment) { $('#apartment-number').value = ''; clearError('apartmentNumber') } $('#has-blocks-field').hidden = delivery && !apartment; if ($('#has-blocks-field').hidden) { $('#has-blocks').checked = false; $('#block-field').hidden = true; $('#block').value = '' } $('#block-field').hidden = $('#has-blocks-field').hidden || !$('#has-blocks').checked; renderCart() }
document.querySelectorAll('[name=fulfillment]').forEach(radio => radio.addEventListener('change', syncFulfillment));
$('#district').addEventListener('change', () => { clearError('district'); const consult = isConsultDelivery(); $('#other-district-field').hidden = !consult; $('#other-district').required = consult; if (!consult) { $('#other-district').value = ''; clearError('otherDistrict') } $('#neighborhood-help').textContent = consult ? 'Digite o nome do bairro; a equipe informará a taxa de entrega pelo WhatsApp.' : 'A taxa de entrega será calculada para o bairro selecionado.'; renderCart() });
$('#residence-type').addEventListener('change', () => { syncFulfillment(); clearError('residenceType') });
$('#has-blocks').addEventListener('change', () => { const show = $('#has-blocks').checked; $('#block-field').hidden = !show; $('#block').required = show; if (!show) { $('#block').value = ''; clearError('block') } });
function syncPayment() { const cash = $('#payment').value === 'Dinheiro'; $('#cash-change-fields').hidden = !cash; if (!cash) $('#needs-change').checked = false; $('#change-wrap').hidden = !cash || !$('#needs-change').checked; $('#change').required = cash && $('#needs-change').checked; if (!cash || !$('#needs-change').checked) { $('#change').value = ''; clearError('change') } }
$('#payment').addEventListener('change', () => { syncPayment(); clearError('payment') }); $('#needs-change').addEventListener('change', syncPayment);
document.querySelectorAll('#checkout [name]').forEach(field => field.addEventListener('input', () => clearError(field.name)));
function clearError(name) { const slot = document.querySelector(`[data-error="${name}"]`); if (slot) slot.textContent = ''; const field = document.querySelector(`#checkout [name="${name}"]`); if (field) field.removeAttribute('aria-invalid') }
function setError(name, message) { const slot = document.querySelector(`[data-error="${name}"]`); if (slot) slot.textContent = message; const field = document.querySelector(`#checkout [name="${name}"]`); if (field) field.setAttribute('aria-invalid', 'true') }
function parseMoneyCents(value) { let raw = String(value || '').trim().replace(/[R$\s]/g, ''); if (!raw) return null; if (raw.includes(',')) raw = raw.replace(/\./g, '').replace(',', '.'); if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return null; const amount = Number(raw); return Number.isFinite(amount) ? Math.round(amount * 100) : null }
function validateCheckout(form) {
  document.querySelectorAll('[data-error]').forEach(slot => slot.textContent = ''); $('#checkout-error').hidden = true; $('#checkout-error').textContent = '';
  const data = new FormData(form), fulfillment = data.get('fulfillment'), payment = data.get('payment');
  for (const [name, message] of [['customer', 'Informe seu nome completo.'], ['phone', 'Informe um telefone para contato.']]) if (!String(data.get(name) || '').trim()) setError(name, message);
  const nameParts = String(data.get('customer') || '').trim().split(/\s+/).filter(Boolean); if (nameParts.length === 1) setError('customer', 'Informe seu nome e sobrenome.');
  const digits = String(data.get('phone') || '').replace(/\D/g, ''); if (digits && digits.length < 10) setError('phone', 'Informe um telefone válido com DDD.');
  if (!payment) setError('payment', 'Selecione a forma de pagamento.');
  let neighborhood = null, fee = 0;
  if (fulfillment === 'delivery') {
    for (const [name, message] of [['street', 'Informe o nome da rua ou avenida.'], ['houseNumber', 'Informe o número da residência ou unidade.'], ['residenceType', 'Selecione o tipo de residência.']]) if (!String(data.get(name) || '').trim()) setError(name, message);
    neighborhood = selectedNeighborhood();
    if (!config.neighborhoods.length) setError('district', 'A lista de bairros atendidos precisa ser configurada pela hamburgueria.');
    else if (!neighborhood) setError('district', 'Selecione um bairro válido da lista.');
    else if (neighborhood.consultDelivery && !String(data.get('otherDistrict') || '').trim()) setError('otherDistrict', 'Digite o nome do bairro.');
    else if (!neighborhood.consultDelivery) { const configured = deliveryFeeCents(); if (configured === null) setError('district', 'A taxa deste bairro ainda precisa ser configurada.'); else fee = configured }
    if (data.get('residenceType') === 'Apartamento' && !String(data.get('apartmentNumber') || '').trim()) setError('apartmentNumber', 'Informe o número do apartamento.');
    const hasBlocks = data.get('residenceType') === 'Apartamento' && $('#has-blocks').checked; if (hasBlocks && !String(data.get('block') || '').trim()) setError('block', 'Informe o bloco.');
  }
  const subtotal = cart.reduce((sum, item) => sum + item.priceCents * item.qty, 0), total = subtotal + fee;
  const invalidAcai = cart.find(item => item.category === 'Açaí' && item.toppings.length > acaiLimit(item)); if (invalidAcai) { $('#checkout-error').textContent = `O item ${invalidAcai.name} excede o limite de acompanhamentos.`; $('#checkout-error').hidden = false; return null }
  if (payment === 'Dinheiro' && $('#needs-change').checked) { if (fulfillment === 'delivery' && isConsultDelivery()) setError('change', 'A equipe precisa confirmar a taxa de entrega antes de calcular o troco.'); else { const change = parseMoneyCents(data.get('change')); if (change === null) setError('change', 'Informe quanto dinheiro será entregue para o troco.'); else if (change <= total) setError('change', 'O valor para troco precisa ser maior que o total do pedido.') } }
  const invalid = document.querySelector('#checkout [aria-invalid="true"]'); if (invalid) { invalid.focus(); return null }
  if (fulfillment === 'delivery' && !isConsultDelivery() && deliveryFeeCents() === null) { $('#checkout-error').textContent = 'Não foi possível calcular a entrega. Confira o bairro e a taxa cadastrada.'; $('#checkout-error').hidden = false; return null }
  return { data, fulfillment, payment, neighborhood, fee, subtotal, total };
}
$('#checkout').addEventListener('submit', event => {
  event.preventDefault(); if (!cart.length) { $('#checkout-error').textContent = 'Adicione pelo menos um produto à sacola.'; $('#checkout-error').hidden = false; return }
  const validated = validateCheckout(event.currentTarget); if (!validated) return;
  const { data, fulfillment, payment, neighborhood, fee, subtotal, total } = validated, address = [];
  if (fulfillment === 'delivery') { address.push(`${String(data.get('street')).trim()}, ${String(data.get('houseNumber')).trim()}`); if (data.get('residenceType') === 'Apartamento') { let unit = `Apartamento ${String(data.get('apartmentNumber')).trim()}`; if (String(data.get('block') || '').trim()) unit += ` bloco ${String(data.get('block')).trim()}`; address.push(unit) } else address.push(`Residência: ${data.get('residenceType')}`); if (String(data.get('complement') || '').trim()) address.push(`Complemento: ${String(data.get('complement')).trim()}`); if (String(data.get('reference') || '').trim()) address.push(`Referência: ${String(data.get('reference')).trim()}`) }
  const consult = fulfillment === 'delivery' && isConsultDelivery();
  const districtName = consult ? String(data.get('otherDistrict')).trim() : neighborhood.name;
  const lines = ['*PEDIDO — TOPET’S LANCHES*', '', `*Cliente:* ${String(data.get('customer')).trim()}`, `*Telefone:* ${String(data.get('phone')).trim()}`, '', ...cart.map(item => { const itemSubtotal = item.priceCents * item.qty; let line = `• ${item.qty}x ${item.name} — ${moneyCents(itemSubtotal)}`; if (item.extras.length) line += `\n  Adicionais: ${item.extras.map(extra => `${extra.name} (+${moneyCents(extra.priceCents)})`).join(', ')}`; if (item.toppings.length) line += `\n  Acompanhamentos: ${item.toppings.join(', ')}`; if (item.notes) line += `\n  Observação: ${item.notes}`; return line }), '', `*Subtotal dos produtos:* ${moneyCents(subtotal)}`, ...(fulfillment === 'delivery' ? [`*Bairro:* ${districtName}`, `*Taxa de entrega:* ${consult ? 'A confirmar' : moneyCents(fee)}`] : []), `*Total:* ${consult ? 'A confirmar' : moneyCents(total)}`, '', `*Pedido:* ${fulfillment === 'delivery' ? 'Entrega' : 'Retirada no local'}`, ...(fulfillment === 'delivery' ? [`*Endereço:* ${address.join(' | ')}`] : []), `*Pagamento:* ${payment}`, ...(payment === 'Dinheiro' && $('#needs-change').checked ? [`*Troco para:* ${String(data.get('change')).trim()}`] : []), ...(String(data.get('notes') || '').trim() ? [`*Observações gerais:* ${String(data.get('notes')).trim()}`] : [])];
  window.open(`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener,noreferrer');
  cart.splice(0, cart.length); save(); renderCart(); event.currentTarget.reset(); syncFulfillment(); syncPayment();
});
function toast(message) { const element = document.createElement('div'); element.textContent = message; element.style.cssText = 'position:fixed;z-index:50;bottom:22px;left:50%;transform:translateX(-50%);background:#211b18;color:white;border-radius:24px;padding:12px 19px;font-size:12px;box-shadow:0 8px 28px #0003'; document.body.append(element); setTimeout(() => element.remove(), 1800) }
renderNeighborhoods(); syncFulfillment(); syncPayment(); renderMenu(); renderCart();
