const { menu, config } = window;
const $ = selector => document.querySelector(selector);
const money = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const cartKey = 'topets-cart-v1';
let cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
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
$('#categories').addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (!button) return; activeCategory = button.dataset.category; document.querySelectorAll('.category').forEach(item => item.classList.toggle('active', item === button)); renderMenu() });
$('#search').addEventListener('input', renderMenu);
function acaiLimit(product) { return product.name.toLowerCase().includes('barca') ? 7 : product.name.toLowerCase().includes('1 litro') ? 5 : 3 }
function updateModalPrice() {
  if (!selectedProduct) return;
  const extraTotal = [...$('#modal-toppings').querySelectorAll('[data-addon]:checked')].reduce((sum, input) => sum + Number(input.dataset.price), 0);
  $('#modal-price').textContent = money(selectedProduct.price + extraTotal);
}
function openModal(product) {
  selectedProduct = product;
  $('#modal-category').textContent = product.category;
  $('#modal-title').textContent = product.name;
  $('#modal-description').textContent = product.description || 'Preparado na hora.';
  $('#item-notes').value = '';
  const isAcai = product.category === 'Açaí';
  const supportsAddons = addonCategories.has(product.category);
  let options = '';
  if (isAcai) {
    const limit = acaiLimit(product);
    options += `<div class="option-title">Acompanhamentos <span id="topping-count">(0/${limit})</span></div><p class="option-note">Calda grátis. Escolha seus acompanhamentos favoritos.</p><div class="topping-grid">${config.acaiToppings.map(topping => `<label class="topping-choice"><input type="checkbox" data-topping value="${esc(topping)}">${esc(topping)}</label>`).join('')}</div>`;
    $('#confirm-add').dataset.max = String(limit);
  } else {
    $('#confirm-add').dataset.max = '0';
  }
  if (supportsAddons) {
    options += `<div class="option-title addon-title">Adicionais <span>escolha individualmente</span></div><div class="topping-grid addon-grid">${config.addons.map(addon => `<label class="topping-choice addon-choice"><input type="checkbox" data-addon value="${esc(addon.name)}" data-price="${addon.price}"><span>${esc(addon.name)}</span><b>+ ${money(addon.price)}</b></label>`).join('')}</div>`;
  }
  $('#modal-toppings').innerHTML = options;
  $('#modal-toppings').querySelectorAll('input').forEach(input => input.addEventListener('change', () => {
    if (input.hasAttribute('data-topping')) {
      const limit = acaiLimit(product);
      let selected = [...$('#modal-toppings').querySelectorAll('[data-topping]:checked')];
      if (selected.length > limit) { input.checked = false; selected = [...$('#modal-toppings').querySelectorAll('[data-topping]:checked')] }
      $('#topping-count').textContent = `(${selected.length}/${limit})`;
    }
    updateModalPrice();
  }));
  updateModalPrice();
  $('#product-modal').hidden = false;
  document.body.style.overflow = 'hidden';
}
$('#menu-grid').addEventListener('click', event => {
  const button = event.target.closest('[data-add]'); if (!button) return;
  const product = menu.find(item => item.id === button.dataset.add); if (!product) return;
  if (product.category === 'Açaí' || addonCategories.has(product.category)) openModal(product); else addItem(product, [], '', []);
});
function addItem(product, toppings = [], notes = '', extras = []) {
  const extraTotal = extras.reduce((sum, extra) => sum + extra.price, 0);
  const unitPrice = product.price + extraTotal;
  const signature = JSON.stringify([product.id, toppings, notes, extras]);
  const found = cart.find(item => item.signature === signature);
  if (found) found.qty++;
  else cart.push({ signature, id: product.id, name: product.name, category: product.category, basePrice: product.price, price: unitPrice, qty: 1, toppings, extras, notes });
  save(); renderCart(); toast('Adicionado à sacola');
}
$('#confirm-add').onclick = () => {
  const toppings = [...$('#modal-toppings').querySelectorAll('[data-topping]:checked')].map(input => input.value);
  const extras = [...$('#modal-toppings').querySelectorAll('[data-addon]:checked')].map(input => ({ name: input.value, price: Number(input.dataset.price) }));
  addItem(selectedProduct, toppings, $('#item-notes').value.trim(), extras);
  $('#product-modal').hidden = true; document.body.style.overflow = '';
};
$('#close-modal').onclick = () => { $('#product-modal').hidden = true; document.body.style.overflow = '' };
$('#product-modal').addEventListener('click', event => { if (event.target === $('#product-modal')) { $('#product-modal').hidden = true; document.body.style.overflow = '' } });
function save() { localStorage.setItem(cartKey, JSON.stringify(cart)); $('#cart-count').textContent = cart.reduce((sum, item) => sum + item.qty, 0); $('#drawer-count').textContent = `(${cart.reduce((sum, item) => sum + item.qty, 0)})` }
function renderCart() {
  save();
  $('#cart-items').innerHTML = cart.map((item, index) => `<article class="cart-item"><div class="cart-item-head"><div><h3>${esc(item.name)}</h3>${item.extras?.length ? `<p>Adicionais: ${item.extras.map(extra => `${esc(extra.name)} (+${money(extra.price)})`).join(', ')}</p>` : ''}${item.toppings?.length ? `<p>Acompanhamentos: ${item.toppings.map(esc).join(', ')}</p>` : ''}${item.notes ? `<p>Obs.: ${esc(item.notes)}</p>` : ''}</div><b class="cart-item-price">${money(item.price * item.qty)}</b></div><div class="qty-row"><div class="qty-control"><button data-qty="${index}" data-delta="-1" aria-label="Diminuir">−</button><span>${item.qty}</span><button data-qty="${index}" data-delta="1" aria-label="Aumentar">+</button></div><small>${money(item.price)} / un.</small><button class="remove-item" data-remove="${index}">Remover</button></div></article>`).join('');
  const empty = cart.length === 0;
  $('#empty-cart').hidden = !empty; $('#totals').hidden = empty; $('#checkout').hidden = empty; $('#clear-cart').hidden = empty;
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  $('#subtotal').textContent = money(subtotal); $('#delivery-line').hidden = config.deliveryFee == null; $('#delivery-value').textContent = config.deliveryFee == null ? '' : money(config.deliveryFee); $('#total').textContent = money(subtotal + (config.deliveryFee || 0));
}
$('#cart-items').addEventListener('click', event => { let button = event.target.closest('[data-qty]'); if (button) { const index = Number(button.dataset.qty); cart[index].qty += Number(button.dataset.delta); if (cart[index].qty < 1) cart.splice(index, 1); renderCart() } button = event.target.closest('[data-remove]'); if (button) { cart.splice(Number(button.dataset.remove), 1); renderCart() } });
$('#clear-cart').onclick = () => { cart = []; renderCart() };
function showCart() { renderCart(); $('#overlay').hidden = false; $('#cart-drawer').classList.add('open'); $('#cart-drawer').setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden' }
function hideCart() { $('#overlay').hidden = true; $('#cart-drawer').classList.remove('open'); $('#cart-drawer').setAttribute('aria-hidden', 'true'); document.body.style.overflow = '' }
$('#open-cart').onclick = showCart; $('#close-cart').onclick = hideCart; $('#overlay').onclick = hideCart; $('#back-menu').onclick = () => { hideCart(); location.hash = '#cardapio' };
document.addEventListener('keydown', event => { if (event.key === 'Escape') { hideCart(); $('#product-modal').hidden = true; document.body.style.overflow = '' } });
function syncFulfillment() { const delivery = document.querySelector('[name=fulfillment]:checked').value === 'delivery'; $('#delivery-fields').hidden = !delivery; $('#checkout [name=address]').required = delivery }
document.querySelectorAll('[name=fulfillment]').forEach(radio => radio.addEventListener('change', syncFulfillment)); syncFulfillment();
function syncPayment() { const cash = $('#checkout [name=payment]').value === 'Dinheiro'; $('#change-wrap').hidden = !cash; if (!cash) $('#checkout [name=change]').value = '' }
$('#checkout [name=payment]').addEventListener('change', syncPayment); syncPayment();
$('#checkout').addEventListener('submit', event => {
  event.preventDefault(); if (!cart.length) return;
  const form = new FormData(event.currentTarget), fulfillment = form.get('fulfillment'), subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0), fee = fulfillment === 'delivery' ? (config.deliveryFee || 0) : 0;
  const lines = ['*PEDIDO — TOPET’S LANCHES*', '', `*Cliente:* ${form.get('customer')}`, '', ...cart.map(item => {
    let line = `• ${item.qty}x ${item.name} — ${money(item.basePrice ?? item.price)} cada = *${money(item.price * item.qty)}*`;
    if (item.extras?.length) line += `\n  Adicionais: ${item.extras.map(extra => `${extra.name} (+${money(extra.price)})`).join(', ')}`;
    if (item.toppings?.length) line += `\n  Acompanhamentos: ${item.toppings.join(', ')}`;
    if (item.notes) line += `\n  Observação: ${item.notes}`;
    return line;
  }), '', `*Subtotal:* ${money(subtotal)}`, ...(fee ? [`*Taxa de entrega:* ${money(fee)}`] : []), `*Total:* ${money(subtotal + fee)}`, '', `*Pedido:* ${fulfillment === 'delivery' ? 'Entrega' : 'Retirada no local'}`, ...(fulfillment === 'delivery' ? [`*Endereço:* ${form.get('address')}`, ...(form.get('reference') ? [`*Complemento/referência:* ${form.get('reference')}`] : [])] : []), `*Pagamento:* ${form.get('payment')}`, ...(form.get('payment') === 'Dinheiro' && form.get('change') ? [`*Troco para:* ${money(Number(form.get('change')))}`] : []), ...(form.get('notes') ? [`*Observações gerais:* ${form.get('notes')}`] : [])];
  window.open(`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener,noreferrer');
});
function toast(message) { const element = document.createElement('div'); element.textContent = message; element.style.cssText = 'position:fixed;z-index:50;bottom:22px;left:50%;transform:translateX(-50%);background:#211b18;color:white;border-radius:24px;padding:12px 19px;font-size:12px;box-shadow:0 8px 28px #0003'; document.body.append(element); setTimeout(() => element.remove(), 1800) }
renderMenu(); renderCart();
