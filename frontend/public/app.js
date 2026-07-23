// ============================================================
//  CONFIGURAÇÃO
// ============================================================
const API_URL = window.location.origin + '/api';

// ============================================================
//  ESTADO DA APLICAÇÃO
// ============================================================
let state = {
    products: [],
    categories: [],
    cart: [],
    config: {},
    user: {
        name: 'Usuário',
        email: 'usuario@email.com',
        phone: '(85) 99999-9999',
        address: 'Rua Exemplo, 123 - Centro, Fortaleza - CE'
    },
    orders: [],
    currentPage: 'home'
};

let couponApplied = null;
let selectedPayment = 'Dinheiro';
let selectedSchedule = 'Pedir agora (60-75min)';
let checkoutStep = 1;

// ============================================================
//  FUNÇÕES DE API
// ============================================================
async function apiRequest(endpoint, options = {}) {
    const url = API_URL + endpoint;
    const defaultOptions = {
        headers: { 'Content-Type': 'application/json' }
    };
    const config = { ...defaultOptions, ...options };

    try {
        const response = await fetch(url, config);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Erro na requisição');
        }
        return data;
    } catch (error) {
        console.error('❌ Erro na API:', error);
        throw error;
    }
}

// ============================================================
//  CARREGAR DADOS DO BANCO
// ============================================================
async function loadData() {
    try {
        console.log('🔄 Carregando dados do servidor...');

        // Carregar configurações primeiro
        const configRes = await apiRequest('/config');
        state.config = configRes.data || {};
        console.log('✅ Configurações carregadas');

        // Carregar produtos
        const productsRes = await apiRequest('/products?active_only=true');
        state.products = productsRes.data || [];
        console.log('✅ ' + state.products.length + ' produtos carregados');

        // Carregar categorias
        const categoriesRes = await apiRequest('/products/categories');
        state.categories = categoriesRes.data || [];
        console.log('✅ ' + state.categories.length + ' categorias carregadas');

        // CARREGAR USUÁRIO DO BANCO
        try {
            const userEmail = state.user.email || 'usuario@email.com';
            const userRes = await apiRequest('/users/' + encodeURIComponent(userEmail));
            if (userRes.success && userRes.data) {
                state.user = userRes.data;
                console.log('✅ Usuário carregado do banco');
            }
        } catch (e) {
            console.log('⚠️ Usuário não encontrado, criando...');
            await apiRequest('/users', {
                method: 'POST',
                body: JSON.stringify(state.user)
            });
        }

        try {
            const ordersRes = await apiRequest('/orders');
            state.orders = ordersRes.data || [];
            console.log('✅ ' + state.orders.length + ' pedidos carregados');
        } catch (e) {
            console.log('⚠️ Nenhum pedido encontrado');
        }

        // Renderizar tudo
        renderAll();
        
        // Chamar renderHeader APÓS os dados serem carregados
        renderHeader();

        // ==== MOSTRAR A PÁGINA ====
        // Aguardar as imagens carregarem
        await waitForImages();
        
        // Adicionar classe 'loaded' para mostrar a página
        document.getElementById('app').classList.add('loaded');
        
        // Esconder o loader
        const loader = document.getElementById('loader');
        if (loader) {
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }

    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        // Mesmo com erro, mostrar a página
        document.getElementById('app').classList.add('loaded');
        const loader = document.getElementById('loader');
        if (loader) {
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
    }
}

// Função para aguardar as imagens carregarem
function waitForImages() {
    return new Promise((resolve) => {
        const images = document.querySelectorAll('img');
        if (images.length === 0) {
            resolve();
            return;
        }
        
        let loaded = 0;
        const total = images.length;
        
        images.forEach(img => {
            if (img.complete) {
                loaded++;
                if (loaded === total) resolve();
            } else {
                img.addEventListener('load', () => {
                    loaded++;
                    if (loaded === total) resolve();
                });
                img.addEventListener('error', () => {
                    loaded++;
                    if (loaded === total) resolve();
                });
            }
        });
        
        // Timeout de segurança (5 segundos)
        setTimeout(resolve, 5000);
    });
}

// ============================================================
//  FUNÇÕES DE EDIÇÃO COM MODAL PERSONALIZADO
// ============================================================
let editFieldCallback = null;
let editFieldName = '';

// Função que abre o modal de edição
function openEditModal(field, currentValue, label) {
    editFieldName = field;
    document.getElementById('edit-modal-title').textContent = 'Editar ' + label;
    document.getElementById('edit-modal-label').textContent = label;
    document.getElementById('edit-modal-input').value = currentValue;
    document.getElementById('edit-modal-input').focus();
    document.getElementById('edit-modal').style.display = 'flex';
}

// Função que fecha o modal
function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    editFieldCallback = null;
}

// Função que salva a edição
async function saveEditField() {
    const newValue = document.getElementById('edit-modal-input').value.trim();
    if (newValue === '') {
        showToast('O campo não pode ficar vazio.', 'warning');
        return;
    }
    closeEditModal();
    
    // Armazenar o email antigo para a requisição
    const oldEmail = state.user.email;
    
    // Atualizar o estado
    state.user[editFieldName] = newValue;
    console.log('📝 Atualizando campo:', editFieldName, 'para:', newValue);
    
    try {
        // Sempre usar o email ANTIGO para encontrar o usuário no banco
        // Se o campo editado for 'email', o novo email será salvo no body
        const url = API_URL + '/users/' + encodeURIComponent(oldEmail);
        console.log('📤 Enviando PUT para (email antigo):', oldEmail);
        console.log('📦 Dados:', state.user);
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.user)
        });
        const result = await response.json();
        console.log('📥 Resposta:', result);
        
        if (result.success) {
            console.log('✅ Usuário atualizado no banco:', result.data);
            state.user = result.data;
            renderProfile();
            renderHeader();
            const labelMap = { 'name': 'Nome', 'email': 'E-mail', 'phone': 'Telefone' };
            showToast(labelMap[editFieldName] + ' atualizado com sucesso!', 'success');
        } else {
            // Se o usuário não for encontrado com o email antigo, tentar com o email atual
            if (result.message && result.message.includes('não encontrado')) {
                console.log('⚠️ Usuário não encontrado com email:', oldEmail);
                console.log('🔄 Tentando com email atual:', state.user.email);
                
                const retryResponse = await fetch(API_URL + '/users/' + encodeURIComponent(state.user.email), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(state.user)
                });
                const retryResult = await retryResponse.json();
                if (retryResult.success) {
                    state.user = retryResult.data;
                    renderProfile();
                    renderHeader();
                    const labelMap = { 'name': 'Nome', 'email': 'E-mail', 'phone': 'Telefone' };
                    showToast(labelMap[editFieldName] + ' atualizado com sucesso!', 'success');
                    return;
                }
            }
            showToast('Erro ao salvar: ' + (result.message || 'Erro desconhecido'), 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        showToast('Erro ao salvar: ' + error.message, 'error');
    }
}

// Função principal que será chamada pelo botão "Editar"
async function editUserField(field) {
    const labels = {
        'name': 'Nome completo',
        'email': 'E-mail',
        'phone': 'Telefone'
    };
    const currentValue = state.user[field] || '';
    openEditModal(field, currentValue, labels[field]);
}

// ============================================================
//  RENDERIZAÇÃO
// ============================================================
function renderAll() {
    renderCategories();
    renderMenu();
    renderCart();
    renderOrders();
    renderProfile();
    updateBadges();
}

function renderHeader() {
    const config = state.config;

    // Nome da loja
    const storeName = document.getElementById('store-name');
    if (storeName) storeName.textContent = config.store_name || 'Smart Delivery';
    
    // Status
    const isOpen = config.is_open === 'true' || config.is_open === true;
    const statusEl = document.getElementById('store-status');
    if (statusEl) statusEl.textContent = isOpen ? '🟢 Aberto' : '🔴 Fechado';
    
    const hoursEl = document.getElementById('store-hours');
    if (hoursEl) hoursEl.textContent = ' • ' + (config.open_time || '09:00') + ' – ' + (config.close_time || '22:00');
    
    // Endereço
    const addressEl = document.getElementById('store-address');
    if (addressEl) addressEl.textContent = '📍 ' + (config.store_address || 'Endereço não configurado');
    
    // BANNER - Substituir pelo banner real
    const bannerContainer = document.getElementById('banner-container');
    if (bannerContainer) {
        if (config.banner_image) {
            bannerContainer.innerHTML = `<img src="${config.banner_image}" alt="Banner" style="width:100%;height:100%;object-fit:cover;">`;
        } else {
            bannerContainer.innerHTML = `<div class="banner-placeholder">🍽️ ${config.store_name || 'Smart Delivery'}</div>`;
        }
    }
    
    // LOGO - Substituir pela logo real
    const logoContainer = document.getElementById('logo-container');
    if (logoContainer) {
        if (config.logo_image) {
            logoContainer.innerHTML = `<img src="${config.logo_image}" alt="Logo" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        } else {
            logoContainer.innerHTML = `<div class="logo-placeholder">${config.store_name ? config.store_name.substring(0, 2).toUpperCase() : 'SD'}</div>`;
        }
    }
    
    // Checkout
    const pickupEl = document.getElementById('store-pickup-address');
    if (pickupEl) pickupEl.textContent = config.store_address || 'Endereço não configurado';
    
    const checkoutAddress = document.getElementById('checkout-address');
    if (checkoutAddress) checkoutAddress.textContent = state.user.address || 'Endereço não cadastrado';
    
    const fee = parseFloat(config.delivery_fee) || 0;
    const feeDisplay = document.getElementById('checkout-fee-display');
    if (feeDisplay) feeDisplay.textContent = 'R$ ' + fee.toFixed(2);
}

// ============================================================
//  CATEGORIAS
// ============================================================
function renderCategories() {
    const container = document.getElementById('category-tabs');
    if (!container) return;

    const activeCategories = state.categories.filter(cat => {
        return state.products.some(p => p.category === cat && p.active);
    });

    if (activeCategories.length === 0) {
        container.innerHTML = '<button style="background:transparent;color:#888;cursor:default;padding:8px 16px;">Nenhuma categoria disponível</button>';
        return;
    }

    let html = '';
    activeCategories.forEach((cat, index) => {
        const active = index === 0 ? 'active' : '';
        html += `<button class="${active}" onclick="scrollToCategory('${cat}')">${cat}</button>`;
    });
    container.innerHTML = html;
}

function scrollToCategory(category) {
    const el = document.getElementById('category-' + category);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    document.querySelectorAll('.category-tabs button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === category) btn.classList.add('active');
    });
}

// ============================================================
//  MENU
// ============================================================
function renderMenu() {
    const container = document.getElementById('products-container');
    if (!container) return;

    const activeCategories = state.categories.filter(cat => {
        return state.products.some(p => p.category === cat && p.active);
    });

    if (activeCategories.length === 0 || state.products.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big-icon">🍽️</div>
                <p>Nenhum produto disponível no momento.</p>
                <p style="font-size:12px;color:#aaa;margin-top:8px;">Volte em breve para conferir nossas novidades!</p>
            </div>
        `;
        return;
    }

    let html = '';
    activeCategories.forEach(cat => {
        const items = state.products.filter(p => p.category === cat && p.active);
        if (items.length === 0) return;

        html += `<div class="category-section" id="category-${cat}">`;
        html += `<div class="category-title">${cat}</div>`;

        items.forEach(p => {
            const qty = getCartQty(p.id);
            html += `
                <div class="product-item">
                    <div class="product-info">
                        <div class="product-name">${p.name}</div>
                        <div class="product-desc">${p.description || ''}</div>
                        <div class="product-price">R$ ${parseFloat(p.price).toFixed(2)}</div>
                    </div>
                    <div class="product-actions">
                        <button onclick="changeQty(${p.id}, -1)">−</button>
                        <span class="qty" id="qty-${p.id}">${qty}</span>
                        <button onclick="changeQty(${p.id}, 1)">+</button>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    });

    container.innerHTML = html;
}

// ============================================================
//  CARRINHO
// ============================================================
function getCartQty(productId) {
    const item = state.cart.find(c => c.id === productId);
    return item ? item.qty : 0;
}

function changeQty(productId, delta) {
    const idx = state.cart.findIndex(c => c.id === productId);
    if (idx >= 0) {
        state.cart[idx].qty += delta;
        if (state.cart[idx].qty <= 0) {
            state.cart.splice(idx, 1);
        }
    } else if (delta > 0) {
        const prod = state.products.find(p => p.id === productId);
        if (prod) {
            state.cart.push({
                id: prod.id,
                name: prod.name,
                price: parseFloat(prod.price),
                qty: 1
            });
        }
    }
    renderMenu();
    renderCart();
    updateBadges();
    updateCheckoutTotals();
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const empty = document.getElementById('cart-empty');
    const summary = document.getElementById('cart-summary');

    if (!container || !empty || !summary) return;

    if (state.cart.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'block';
        summary.style.display = 'none';
        return;
    }

    empty.style.display = 'none';
    summary.style.display = 'block';

    let html = '';
    let subtotal = 0;
    state.cart.forEach(item => {
        const total = item.price * item.qty;
        subtotal += total;
        html += `
            <div class="card product-item">
                <div class="product-info">
                    <div class="product-name">${item.name}</div>
                    <div class="product-price">R$ ${total.toFixed(2)}</div>
                </div>
                <div class="product-actions">
                    <button onclick="changeQty(${item.id}, -1)">−</button>
                    <span class="qty">${item.qty}</span>
                    <button onclick="changeQty(${item.id}, 1)">+</button>
                    <button onclick="removeFromCart(${item.id})" style="color:#e74c3c;border:none;font-size:18px;background:none;cursor:pointer;">✕</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;

    const fee = parseFloat(state.config.delivery_fee) || 0;
    let total = subtotal + fee;
    if (couponApplied && couponApplied.type === 'percent') {
        const discount = total * (couponApplied.value / 100);
        total = total - discount;
    }

    const subtotalEl = document.getElementById('cart-subtotal');
    if (subtotalEl) subtotalEl.textContent = 'R$ ' + subtotal.toFixed(2);
    
    const feeEl = document.getElementById('cart-delivery-fee');
    if (feeEl) feeEl.textContent = 'R$ ' + fee.toFixed(2);
    
    const totalEl = document.getElementById('cart-total');
    if (totalEl) totalEl.textContent = 'R$ ' + total.toFixed(2);
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(c => c.id !== productId);
    renderMenu();
    renderCart();
    updateBadges();
}

function clearCart() {
    state.cart = [];
    renderMenu();
    renderCart();
    updateBadges();
}

function updateBadges() {
    const total = state.cart.reduce((acc, i) => acc + i.qty, 0);
    document.querySelectorAll('.badge').forEach(el => {
        if (total > 0) {
            el.style.display = 'inline';
            el.textContent = total;
        } else {
            el.style.display = 'none';
        }
    });
}

// ============================================================
//  NAVEGAÇÃO
// ============================================================
function switchPage(pageId) {
    console.log('🔀 Navegando para:', pageId);
    
    // Esconder todas as páginas
    const pages = ['home', 'cart', 'orders', 'profile', 'checkout'];
    pages.forEach(p => {
        const el = document.getElementById('page-' + p);
        if (el) {
            el.classList.remove('active');
        } else {
            console.warn('⚠️ Página não encontrada: page-' + p);
        }
    });

    // Mostrar a página alvo
    const target = document.getElementById('page-' + pageId);
    if (target) {
        target.classList.add('active');
        console.log('✅ Página ativada: page-' + pageId);
    } else {
        console.error('❌ Página não encontrada: page-' + pageId);
        return;
    }

    // Atualizar bottom nav
    document.querySelectorAll('.bottom-nav button').forEach(btn => btn.classList.remove('active'));
    const navMap = { 'home': 0, 'cart': 1, 'orders': 2, 'profile': 3 };
    const btns = document.querySelectorAll('.bottom-nav button');
    if (btns[navMap[pageId]]) {
        btns[navMap[pageId]].classList.add('active');
    }

    // Renderizar conteúdo específico
    if (pageId === 'cart') {
        renderCart();
    } else if (pageId === 'orders') {
        renderOrders();
    } else if (pageId === 'profile') {
        renderProfile();
    } else if (pageId === 'home') {
        renderCategories();
        renderMenu();
    } else if (pageId === 'checkout') {
        updateCheckoutTotals();
    }
}

// ============================================================
//  CUPOM
// ============================================================
function applyCoupon() {
    const code = document.getElementById('coupon-input').value.trim();
    if (!code) {
        showToast('Digite um código de cupom.', 'warning');
        return;
    }
    if (code.toUpperCase() === 'FRANGO10') {
        couponApplied = { code: 'FRANGO10', type: 'percent', value: 10 };
        showToast('Cupom aplicado! 10% de desconto.', 'success');
    } else {
        couponApplied = null;
        showToast('Cupom inválido.', 'error');
    }
    renderCart();
    updateCheckoutTotals();
}

// ============================================================
//  CHECKOUT
// ============================================================
function goToCheckout() {
    if (state.cart.length === 0) {
        showToast('Adicione itens à sacola primeiro.', 'warning');
        return;
    }
    checkoutStep = 1;
    showCheckoutStep(1);
    updateCheckoutTotals();
    const addrEl = document.getElementById('checkout-address');
    if (addrEl) addrEl.textContent = state.user.address || 'Endereço não cadastrado';
    switchPage('checkout');
    setDeliveryNow();
}

function showCheckoutStep(step) {
    const step1 = document.getElementById('checkout-step-1');
    const step2 = document.getElementById('checkout-step-2');
    const step3 = document.getElementById('checkout-step-3');
    
    if (step1) step1.style.display = step === 1 ? 'block' : 'none';
    if (step2) step2.style.display = step === 2 ? 'block' : 'none';
    if (step3) step3.style.display = step === 3 ? 'block' : 'none';
    
    for (let i = 1; i <= 3; i++) {
        const el = document.getElementById('step-' + i);
        if (el) {
            el.classList.remove('active', 'done');
            if (i < step) el.classList.add('done');
            else if (i === step) el.classList.add('active');
        }
    }
    
    if (step === 3) buildOrderSummary();
}

function nextCheckoutStep(nextStep) {
    if (checkoutStep === 2) {
        const selected = document.querySelector('.chip-group .chip.selected');
        if (!selected) {
            showToast('Selecione uma forma de pagamento.', 'warning');
            return;
        }
        selectedPayment = selected.dataset.method;
    }
    checkoutStep = nextStep;
    showCheckoutStep(checkoutStep);
    updateCheckoutTotals();
}

function setDeliveryNow() {
    selectedSchedule = 'Pedir agora (60-75min)';
    const info = document.getElementById('schedule-info');
    if (info) info.textContent = '⏱️ Entrega em 60-75 minutos';
}

function setDeliverySchedule() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes() + 30).padStart(2,'0');
    selectedSchedule = 'Agendado para ' + h + ':' + m;
    const info = document.getElementById('schedule-info');
    if (info) info.textContent = '📅 ' + selectedSchedule;
}

function updateCheckoutTotals() {
    const subtotal = state.cart.reduce((acc, i) => acc + i.price * i.qty, 0);
    const fee = parseFloat(state.config.delivery_fee) || 0;
    let total = subtotal + fee;
    if (couponApplied && couponApplied.type === 'percent') {
        const discount = total * (couponApplied.value / 100);
        total = total - discount;
    }
    
    const subEl = document.getElementById('checkout-subtotal');
    if (subEl) subEl.textContent = 'R$ ' + subtotal.toFixed(2);
    
    const feeEl = document.getElementById('checkout-delivery-fee');
    if (feeEl) feeEl.textContent = 'R$ ' + fee.toFixed(2);
    
    const totalEl = document.getElementById('checkout-total');
    if (totalEl) totalEl.textContent = 'R$ ' + total.toFixed(2);
}

function buildOrderSummary() {
    const container = document.getElementById('order-summary-items');
    if (!container) return;
    
    let html = '';
    state.cart.forEach(item => {
        html += `<div class="flex-between"><span>${item.qty}x ${item.name}</span> <span>R$ ${(item.price * item.qty).toFixed(2)}</span></div>`;
    });
    container.innerHTML = html;
    
    const addrEl = document.getElementById('order-summary-address');
    if (addrEl) addrEl.textContent = state.user.address;
    
    const payEl = document.getElementById('order-summary-payment');
    if (payEl) payEl.textContent = selectedPayment;
    
    const schEl = document.getElementById('order-summary-schedule');
    if (schEl) schEl.textContent = selectedSchedule;
    
    const subtotal = state.cart.reduce((acc, i) => acc + i.price * i.qty, 0);
    const fee = parseFloat(state.config.delivery_fee) || 0;
    let total = subtotal + fee;
    if (couponApplied && couponApplied.type === 'percent') {
        const discount = total * (couponApplied.value / 100);
        total = total - discount;
    }
    
    const subSumEl = document.getElementById('order-summary-subtotal');
    if (subSumEl) subSumEl.textContent = 'R$ ' + subtotal.toFixed(2);
    
    const feeSumEl = document.getElementById('order-summary-fee');
    if (feeSumEl) feeSumEl.textContent = 'R$ ' + fee.toFixed(2);
    
    const totalSumEl = document.getElementById('order-summary-total');
    if (totalSumEl) totalSumEl.textContent = 'R$ ' + total.toFixed(2);
}

// ============================================================
//  ENVIAR PEDIDO
// ============================================================
async function submitOrder() {
    if (state.cart.length === 0) {
        showToast('Sacola vazia!', 'warning');
        return;
    }
    
    const subtotal = state.cart.reduce((acc, i) => acc + i.price * i.qty, 0);
    const fee = parseFloat(state.config.delivery_fee) || 0;
    const total = subtotal + fee;
    
    const itemsText = state.cart.map(i => '- ' + i.qty + 'x ' + i.name + ' = R$ ' + (i.price * i.qty).toFixed(2)).join('\n');
    
    // Converter scheduled_time para o formato DATETIME
    let scheduledTime = null;
    const now = new Date();
    
    if (selectedSchedule === 'Pedir agora (60-75min)') {
        // Para "Pedir agora", usar a data/hora atual + 60 minutos
        const deliveryTime = new Date(now.getTime() + 60 * 60 * 1000);
        scheduledTime = deliveryTime.toISOString().slice(0, 19).replace('T', ' ');
        console.log('📅 Pedido agora, entrega em:', scheduledTime);
    } else {
        // Para agendamento, extrair a hora do texto
        const match = selectedSchedule.match(/(\d{2}):(\d{2})/);
        if (match) {
            const hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            const deliveryTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
            // Se a hora for menor que a atual, adicionar 1 dia
            if (deliveryTime < now) {
                deliveryTime.setDate(deliveryTime.getDate() + 1);
            }
            scheduledTime = deliveryTime.toISOString().slice(0, 19).replace('T', ' ');
            console.log('📅 Pedido agendado para:', scheduledTime);
        } else {
            // Fallback: usar 1 hora a partir de agora
            const deliveryTime = new Date(now.getTime() + 60 * 60 * 1000);
            scheduledTime = deliveryTime.toISOString().slice(0, 19).replace('T', ' ');
            console.log('📅 Data de fallback:', scheduledTime);
        }
    }

    const message = '🍽️ *NOVO PEDIDO #' + Date.now().toString().slice(-6) + '*\nCliente: ' + state.user.name + '\nTelefone: ' + state.user.phone + '\nEndereço: ' + state.user.address + '\n\n*Itens:*\n' + itemsText + '\n\nSubtotal: R$ ' + subtotal.toFixed(2) + '\nTaxa entrega: R$ ' + fee.toFixed(2) + '\n*Total: R$ ' + total.toFixed(2) + '*\nPagamento: ' + selectedPayment + '\nEntrega: ' + selectedSchedule;

    try {
        const orderData = {
            customer_name: state.user.name,
            customer_email: state.user.email,
            customer_phone: state.user.phone,
            customer_address: state.user.address,
            items: state.cart,
            subtotal: subtotal,
            delivery_fee: fee,
            discount: 0,
            total: total,
            payment_method: selectedPayment,
            delivery_type: 'delivery',
            scheduled_time: scheduledTime,
            notes: ''
        };

        console.log('📦 Enviando pedido:', orderData);

        const result = await apiRequest('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });

        console.log('✅ Pedido criado:', result);

        // Abrir WhatsApp
        const phone = state.config.store_phone || '5511999999999';
        const cleanPhone = phone.replace(/\D/g, '');
        const url = 'https://wa.me/55' + cleanPhone + '?text=' + encodeURIComponent(message);
        window.open(url, '_blank');

        state.cart = [];
        couponApplied = null;
        renderAll();
        switchPage('home');
        showToast('Pedido enviado com sucesso! O restaurante receberá a notificação.', 'success');

    } catch (error) {
        console.error('❌ Erro ao enviar pedido:', error);
        showToast('Erro ao enviar pedido: ' + error.message, 'error');
    }
}

// ============================================================
//  HISTÓRICO
// ============================================================
function renderOrders() {
    const container = document.getElementById('orders-list');
    const empty = document.getElementById('orders-empty');
    if (!container || !empty) return;

    if (state.orders.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    let html = '';
    state.orders.forEach(o => {
        const statusMap = { 'pending': '🟡 Pendente', 'confirmado': '🟢 Confirmado', 'entregue': '✅ Entregue', 'cancelado': '❌ Cancelado' };
        const statusLabel = statusMap[o.status] || o.status;
        let items = o.items;
        if (typeof items === 'string') {
            try { items = JSON.parse(items); } catch(e) { items = []; }
        }
        html += `
            <div class="card">
                <div class="flex-between">
                    <span><strong>${o.order_number || '#' + o.id}</strong></span>
                    <span class="tag ${o.status === 'pending' ? 'tag-orange' : o.status === 'entregue' ? 'tag-green' : 'tag-red'}">${statusLabel}</span>
                </div>
                <div style="font-size:14px;margin:6px 0;">
                    ${items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                </div>
                <div class="flex-between"><span>Total</span> <strong>R$ ${parseFloat(o.total).toFixed(2)}</strong></div>
                <div style="font-size:12px;color:#888;margin-top:4px;">${new Date(o.created_at).toLocaleString()}</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ============================================================
//  PERFIL
// ============================================================
function renderProfile() {
    const user = state.user;
    const avatar = document.getElementById('user-avatar');
    if (avatar) avatar.textContent = user.name.substring(0, 1).toUpperCase();

    const nameDisplay = document.getElementById('user-name-display');
    if (nameDisplay) nameDisplay.textContent = user.name;
    
    const emailDisplay = document.getElementById('user-email-display');
    if (emailDisplay) emailDisplay.textContent = user.email;
    
    const nameVal = document.getElementById('user-name-value');
    if (nameVal) nameVal.textContent = user.name;
    
    const emailVal = document.getElementById('user-email-value');
    if (emailVal) emailVal.textContent = user.email;
    
    const phoneVal = document.getElementById('user-phone-value');
    if (phoneVal) phoneVal.textContent = user.phone;
    
    const addrVal = document.getElementById('user-address-value');
    if (addrVal) addrVal.textContent = user.address || 'Não cadastrado';
}

function clearUserData() {
    if (confirm('Deseja realmente resetar todos os dados do usuário?')) {
        state.user = {
            name: 'Usuário',
            email: 'usuario@email.com',
            phone: '(85) 99999-9999',
            address: ''
        };
        renderProfile();
        renderHeader();
        showToast('Dados resetados com sucesso.', 'success');
    }
}

// ============================================================
//  CEP FUNCTIONS
// ============================================================
function formatCep(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 5) {
        value = value.substring(0, 5) + '-' + value.substring(5, 8);
    }
    input.value = value;
}

function buscarCep(cep, prefix) {
    const cepClean = cep.replace(/\D/g, '');
    if (cepClean.length !== 8) return;
    
    fetch('https://viacep.com.br/ws/' + cepClean + '/json/')
        .then(response => response.json())
        .then(data => {
            if (data.erro) {
                showToast('CEP não encontrado.', 'warning');
                return;
            }
            const streetEl = document.getElementById(prefix + '-street');
            const neighborhoodEl = document.getElementById(prefix + '-neighborhood');
            const cityEl = document.getElementById(prefix + '-city');
            const stateEl = document.getElementById(prefix + '-state');
            const numberEl = document.getElementById(prefix + '-number');
            
            if (streetEl) streetEl.value = data.logradouro || '';
            if (neighborhoodEl) neighborhoodEl.value = data.bairro || '';
            if (cityEl) cityEl.value = data.localidade || '';
            if (stateEl) stateEl.value = data.uf || '';
            if (numberEl) numberEl.focus();
        })
        .catch(() => showToast('Erro ao buscar CEP.', 'error'));
}

function openAddressModal() {
    const modal = document.getElementById('address-modal');
    if (modal) modal.style.display = 'flex';
}

function closeAddressModal() {
    const modal = document.getElementById('address-modal');
    if (modal) modal.style.display = 'none';
}

async function saveUserAddress() {
    console.log('🔧 Salvando endereço...');
    
    const street = document.getElementById('user-street').value.trim();
    const number = document.getElementById('user-number').value.trim();
    const complement = document.getElementById('user-complement').value.trim();
    const neighborhood = document.getElementById('user-neighborhood').value.trim();
    const city = document.getElementById('user-city').value.trim();
    const stateUf = document.getElementById('user-state').value.trim();
    
    if (!street || !number || !neighborhood || !city || !stateUf) {
        showToast('Preencha todos os campos do endereço.', 'warning');
        return;
    }
    
    let address = street + ', ' + number;
    if (complement) address += ' - ' + complement;
    address += ', ' + neighborhood + ', ' + city + ' - ' + stateUf;
    
    state.user.address = address;
    
    try {
        const result = await apiRequest('/users/' + encodeURIComponent(state.user.email), {
            method: 'PUT',
            body: JSON.stringify(state.user)
        });
        if (result.success) {
            console.log('✅ Endereço atualizado:', address);
            renderProfile();
            renderHeader();
            closeAddressModal();
            showToast('Endereço atualizado com sucesso!', 'success');
        }
    } catch (error) {
        console.error('❌ Erro ao salvar endereço:', error);
        showToast('Erro ao salvar endereço: ' + error.message, 'error');
    }
}

// ============================================================
//  TOAST / NOTIFICAÇÃO PERSONALIZADA
// ============================================================
function showToast(message, type = 'success', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || '📢'}</span>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    
    container.appendChild(toast);
    
    // Remover automaticamente após o tempo
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 300);
    }, duration);
}

// ============================================================
//  INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Smart Delivery iniciado!');
    
    document.querySelectorAll('.chip-group .chip').forEach(chip => {
        chip.addEventListener('click', function() {
            document.querySelectorAll('.chip-group .chip').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            selectedPayment = this.dataset.method;
        });
    });
    const firstChip = document.querySelector('.chip-group .chip');
    if (firstChip) {
        firstChip.classList.add('selected');
        selectedPayment = firstChip.dataset.method;
    }
    
    loadData();
});

// ============================================================
//  EXPOR FUNÇÕES GLOBALMENTE
// ============================================================
window.switchPage = switchPage;
window.clearCart = clearCart;
window.applyCoupon = applyCoupon;
window.goToCheckout = goToCheckout;
window.nextCheckoutStep = nextCheckoutStep;
window.setDeliveryNow = setDeliveryNow;
window.setDeliverySchedule = setDeliverySchedule;
window.submitOrder = submitOrder;
window.editUserField = editUserField;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveEditField = saveEditField;
window.clearUserData = clearUserData;
window.openAddressModal = openAddressModal;
window.closeAddressModal = closeAddressModal;
window.saveUserAddress = saveUserAddress;
window.formatCep = formatCep;
window.buscarCep = buscarCep;
window.scrollToCategory = scrollToCategory;
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;
window.showToast = showToast;

console.log('✅ Todas as funções estão disponíveis globalmente');