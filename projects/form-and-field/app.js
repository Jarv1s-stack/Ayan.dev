const products = [
  { id: 'mug', name: 'Koru stoneware mug', category: 'home', label: 'For home', price: 8900, art: 'mug' },
  { id: 'tote', name: 'Weekend market tote', category: 'carry', label: 'Carry', price: 12500, art: 'tote' },
  { id: 'planner', name: 'A little day planner', category: 'paper', label: 'On paper', price: 6400, art: 'planner' },
  { id: 'cards', name: 'Field notes card set', category: 'paper', label: 'On paper', price: 3900, art: 'cards' }
];
const formatter = new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 });
const catalog = document.querySelector('#product-grid');
const cartLines = document.querySelector('#cart-lines');
const drawer = document.querySelector('#cart-drawer');
const backdrop = document.querySelector('#drawer-backdrop');
const backgroundNodes = [...document.body.children].filter(element => element !== drawer && element !== backdrop);
const cartKey = 'form-field-cart-v1';
let cart = loadCart();
let activeCategory = 'all';
let lastFocus = null;

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(cartKey) || '{}');
    return Object.fromEntries(Object.entries(saved).filter(([id, amount]) => products.some(product => product.id === id) && Number.isInteger(amount) && amount > 0));
  } catch { return {}; }
}

function saveCart() {
  localStorage.setItem(cartKey, JSON.stringify(cart));
  renderCart();
}

function renderProducts() {
  catalog.replaceChildren();
  const shown = products.filter(product => activeCategory === 'all' || product.category === activeCategory);
  document.querySelector('#product-count').textContent = `${shown.length} ${shown.length === 1 ? 'piece' : 'pieces'}`;
  for (const product of shown) {
    const card = document.createElement('article');
    card.className = 'product-card';
    const art = document.createElement('div');
    art.className = `product-art product-art--${product.art}`;
    art.setAttribute('role', 'img');
    art.setAttribute('aria-label', `${product.name}, illustrated product preview`);
    const label = document.createElement('p');
    label.className = 'product-category';
    label.textContent = product.label;
    const title = document.createElement('h3');
    title.textContent = product.name;
    const bottom = document.createElement('div');
    bottom.className = 'product-bottom';
    const price = document.createElement('span');
    price.className = 'product-price';
    price.textContent = formatter.format(product.price);
    const button = document.createElement('button');
    button.className = 'add-to-bag';
    button.type = 'button';
    button.textContent = 'Add to bag';
    button.setAttribute('aria-label', `Add ${product.name} to bag`);
    button.addEventListener('click', () => {
      cart[product.id] = (cart[product.id] || 0) + 1;
      saveCart();
      button.textContent = 'Added';
      window.setTimeout(() => { button.textContent = 'Add to bag'; }, 900);
    });
    bottom.append(price, button);
    card.append(art, label, title, bottom);
    catalog.append(card);
  }
}

function renderCart() {
  cartLines.replaceChildren();
  const items = Object.entries(cart).filter(([, quantity]) => quantity > 0);
  const quantity = items.reduce((sum, [, amount]) => sum + amount, 0);
  document.querySelector('#bag-count').textContent = String(quantity);
  document.querySelector('#cart-empty').hidden = items.length > 0;
  document.querySelector('#checkout').disabled = items.length === 0;
  let total = 0;
  for (const [id, amount] of items) {
    const product = products.find(item => item.id === id);
    total += product.price * amount;
    const row = document.createElement('article');
    row.className = 'cart-line';
    const info = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = product.name;
    const price = document.createElement('p');
    price.textContent = formatter.format(product.price);
    const controls = document.createElement('div');
    controls.className = 'quantity-controls';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '−';
    remove.setAttribute('aria-label', `Remove one ${product.name}`);
    remove.addEventListener('click', () => {
      if (cart[id] <= 1) delete cart[id]; else cart[id]--;
      saveCart();
    });
    const count = document.createElement('span');
    count.textContent = String(amount);
    const add = document.createElement('button');
    add.type = 'button';
    add.textContent = '+';
    add.setAttribute('aria-label', `Add one ${product.name}`);
    add.addEventListener('click', () => { cart[id]++; saveCart(); });
    controls.append(remove, count, add);
    info.append(title, price, controls);
    const lineTotal = document.createElement('span');
    lineTotal.className = 'cart-line-total';
    lineTotal.textContent = formatter.format(product.price * amount);
    row.append(info, lineTotal);
    cartLines.append(row);
  }
  document.querySelector('#cart-total').textContent = formatter.format(total);
}

function openCart() {
  lastFocus = document.activeElement;
  backgroundNodes.forEach(element => { element.inert = true; });
  drawer.inert = false;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  backdrop.hidden = false;
  document.querySelector('#close-cart').focus();
}

function closeCart() {
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  drawer.inert = true;
  backgroundNodes.forEach(element => { element.inert = false; });
  backdrop.hidden = true;
  lastFocus?.focus();
}

document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {
  activeCategory = button.dataset.category;
  document.querySelectorAll('[data-category]').forEach(tab => {
    const active = tab === button;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-pressed', String(active));
  });
  renderProducts();
}));
document.querySelector('#open-cart').addEventListener('click', openCart);
document.querySelector('#close-cart').addEventListener('click', closeCart);
backdrop.addEventListener('click', closeCart);
drawer.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const focusable = [...drawer.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])')];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
document.addEventListener('keydown', event => { if (event.key === 'Escape' && drawer.classList.contains('open')) closeCart(); });
document.querySelector('#checkout').addEventListener('click', () => {
  if (!Object.keys(cart).length) return;
  document.querySelector('#order-title').textContent = `Your selection: ${document.querySelector('#cart-total').textContent}`;
  closeCart();
  document.querySelector('#order-dialog').showModal();
  cart = {};
  saveCart();
});
document.querySelector('#close-order').addEventListener('click', () => document.querySelector('#order-dialog').close());
document.querySelector('#continue-shopping').addEventListener('click', () => document.querySelector('#order-dialog').close());
renderProducts();
renderCart();
