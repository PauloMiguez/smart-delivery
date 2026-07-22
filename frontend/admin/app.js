// ============================================================
//  CONFIGURAÇÃO
// ============================================================
const API_URL = window.location.origin + '/api';
let editingProductId = null;
let editingCategoryId = null;
let categoryModalSource = 'categories';

// ============================================================
//  VARIÁVEIS GLOBAIS
// ============================================================
let products = [];
let categories = [];
let orders = [];
let config = {};

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
//  CARREGAR DADOS
// ============================================================
async function loadData() {
    try {
        console.log('🔄 Carregando dados do servidor...');

        const productsRes = await apiRequest('/products');
        products = productsRes.data || [];
        console.log('✅ ' + products.length + ' produtos carregados');

        const categoriesRes = await apiRequest('/categories');
        categories = categoriesRes.data || [];
        console.log('✅ ' + categories.length + ' categorias carregadas');

        const ordersRes = await apiRequest('/orders');
        orders = ordersRes.data || [];
        console.log('✅ ' + orders.length + ' pedidos carregados');

        const configRes = await apiRequest('/config');
        config = configRes.data || {};
        console.log('✅ Configurações carregadas');

        renderAll();
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        renderAll();
        if (products.length === 0 && categories.length === 0) {
            document.getElementById('admin-product-list').innerHTML = `
                <div class="empty-state">
                    <div class="big-icon">⚠️</div>
                    <p>Erro ao carregar dados. Verifique se o servidor está rodando.</p>
                    <button class="btn btn-sm" onclick="loadData()" style="margin-top:12px;width:auto;">🔄 Tentar novamente</button>
                </div>
            `;
        }
    }
}

// ============================================================
//  RENDERIZAÇÃO
// ============================================================
function renderAll() {
    renderAdminProducts();
    renderAdminCategories();
    renderAdminOrders();
    updateDashboard();
    updateConfigUI();
    populateCategorySelect();
    updateImagePreviews();
}

// ============================================================
//  PRODUTOS
// ============================================================
function renderAdminProducts() {
    const container = document.getElementById('admin-product-list');
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big-icon">📦</div>
                <p>Nenhum produto cadastrado.</p>
                <button class="btn btn-sm" onclick="openProductModal()" style="margin-top:12px;width:auto;">+ Adicionar primeiro produto</button>
            </div>
        `;
        return;
    }
    let html = '';
    products.forEach(p => {
        const categoryName = p.category || 'Sem categoria';
        html += `
            <div class="product-item">
                <div class="info">
                    <strong>${p.name}</strong>
                    <span>${categoryName} • R$ ${parseFloat(p.price).toFixed(2)} ${p.active ? '🟢 Ativo' : '🔴 Inativo'}</span>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editProduct(${p.id})">✏️</button>
                    <button class="delete" onclick="deleteProduct(${p.id})">🗑️</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function openProductModal(product = null) {
    const modal = document.getElementById('product-modal');
    modal.classList.add('open');
    if (!categories || categories.length === 0) {
        alert('⚠️ Cadastre pelo menos uma categoria antes de adicionar um produto.');
        closeProductModal();
        setTimeout(() => openCategoryModal(), 300);
        return;
    }
    if (product) {
        document.getElementById('product-modal-title').textContent = 'Editar Produto';
        document.getElementById('prod-name').value = product.name;
        document.getElementById('prod-desc').value = product.description || '';
        document.getElementById('prod-price').value = product.price;
        document.getElementById('prod-category').value = product.category || (categories[0] ? categories[0].name : '');
        document.getElementById('prod-active').value = product.active ? '1' : '0';
        editingProductId = product.id;
        document.getElementById('product-save-btn').textContent = 'Atualizar';
    } else {
        document.getElementById('product-modal-title').textContent = 'Adicionar Produto';
        document.getElementById('prod-name').value = '';
        document.getElementById('prod-desc').value = '';
        document.getElementById('prod-price').value = '';
        document.getElementById('prod-category').value = categories[0] ? categories[0].name : '';
        document.getElementById('prod-active').value = '1';
        editingProductId = null;
        document.getElementById('product-save-btn').textContent = 'Salvar';
    }
    populateCategorySelect();
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('open');
}

function populateCategorySelect() {
    const sel = document.getElementById('prod-category');
    sel.innerHTML = '';
    if (!categories || categories.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '-- Nenhuma categoria --';
        sel.appendChild(opt);
        return;
    }
    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = c.name;
        sel.appendChild(opt);
    });
}

async function saveProduct() {
    const name = document.getElementById('prod-name').value.trim();
    const description = document.getElementById('prod-desc').value.trim();
    const price = parseFloat(document.getElementById('prod-price').value);
    const category = document.getElementById('prod-category').value;
    const active = document.getElementById('prod-active').value === '1';

    if (!name) { alert('Digite o nome do produto.'); return; }
    if (isNaN(price) || price <= 0) { alert('Digite um preço válido.'); return; }
    if (!category) { alert('Selecione uma categoria.'); return; }

    try {
        const data = { name, description, price, category, active };
        let result;
        if (editingProductId) {
            result = await apiRequest('/products/' + editingProductId, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        } else {
            result = await apiRequest('/products', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }
        if (result.success) {
            closeProductModal();
            await loadData();
            alert('✅ Produto salvo com sucesso!');
        }
    } catch (error) {
        alert('❌ Erro ao salvar produto: ' + error.message);
    }
}

async function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (product) openProductModal(product);
}

async function deleteProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    if (!confirm('Remover o produto "' + product.name + '"?')) return;
    try {
        await apiRequest('/products/' + id, { method: 'DELETE' });
        await loadData();
        alert('✅ Produto removido.');
    } catch (error) {
        alert('❌ Erro ao remover produto: ' + error.message);
    }
}

// ============================================================
//  CATEGORIAS
// ============================================================
function renderAdminCategories() {
    const container = document.getElementById('admin-category-list');
    if (!categories || categories.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big-icon">🏷️</div>
                <p>Nenhuma categoria cadastrada.</p>
                <button class="btn btn-sm btn-primary" onclick="openCategoryModal()" style="margin-top:12px;width:auto;">+ Criar primeira categoria</button>
            </div>
        `;
        return;
    }
    const sorted = [...categories].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    let html = '';
    sorted.forEach(c => {
        const productCount = (products || []).filter(p => p.category === c.name).length;
        const statusText = productCount > 0 ? productCount + ' produto' + (productCount !== 1 ? 's' : '') : 'Sem produtos';
        html += `
            <div class="category-item">
                <div class="info">
                    <strong>${c.name}</strong>
                    <span>${statusText} • Ordem: ${c.display_order || 0}</span>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editCategory(${c.id})">✏️</button>
                    <button class="delete" onclick="deleteCategory(${c.id})">🗑️</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function openCategoryModal(category = null) {
    const modal = document.getElementById('category-modal');
    modal.classList.add('open');
    if (category) {
        document.getElementById('category-modal-title').textContent = 'Editar Categoria';
        document.getElementById('cat-name').value = category.name;
        document.getElementById('cat-order').value = category.display_order || 1;
        editingCategoryId = category.id;
        document.getElementById('category-save-btn').textContent = 'Atualizar';
    } else {
        document.getElementById('category-modal-title').textContent = 'Nova Categoria';
        document.getElementById('cat-name').value = '';
        document.getElementById('cat-order').value = (categories || []).length + 1;
        editingCategoryId = null;
        document.getElementById('category-save-btn').textContent = 'Salvar';
    }
}

function openCategoryModalFromProduct() {
    categoryModalSource = 'product';
    openCategoryModal();
}

function closeCategoryModal() {
    document.getElementById('category-modal').classList.remove('open');
    categoryModalSource = 'categories';
}

async function saveCategory() {
    const name = document.getElementById('cat-name').value.trim();
    const display_order = parseInt(document.getElementById('cat-order').value) || 1;
    if (!name) { alert('Digite o nome da categoria.'); return; }
    try {
        const data = { name, display_order };
        let result;
        if (editingCategoryId) {
            result = await apiRequest('/categories/' + editingCategoryId, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        } else {
            result = await apiRequest('/categories', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }
        if (result.success) {
            closeCategoryModal();
            await loadData();
            if (categoryModalSource === 'product') {
                populateCategorySelect();
                document.getElementById('prod-category').value = name;
            }
            alert('✅ Categoria "' + name + '" salva com sucesso!');
        }
    } catch (error) {
        alert('❌ Erro ao salvar categoria: ' + error.message);
    }
}

async function editCategory(id) {
    const category = categories.find(c => c.id === id);
    if (category) openCategoryModal(category);
}

async function deleteCategory(id) {
    const category = categories.find(c => c.id === id);
    if (!category) return;
    if (!confirm('Remover a categoria "' + category.name + '"?')) return;
    try {
        await apiRequest('/categories/' + id, { method: 'DELETE' });
        await loadData();
        alert('✅ Categoria removida.');
    } catch (error) {
        alert('❌ Erro ao remover categoria: ' + error.message);
    }
}

// ============================================================
//  CONFIGURAÇÕES
// ============================================================
function updateConfigUI() {
    document.getElementById('config-store-name').value = config.store_name || '';
    document.getElementById('config-phone').value = config.store_phone || '';
    document.getElementById('config-delivery-fee').value = config.delivery_fee || '3.00';
    document.getElementById('config-open').value = config.open_time || '09:00';
    document.getElementById('config-close').value = config.close_time || '22:00';
    document.getElementById('config-status').checked = config.is_open === 'true' || config.is_open === true;
    document.getElementById('config-status-label').textContent = config.is_open === 'true' || config.is_open === true ? 'Aberto' : 'Fechado';
    const statusToggle = document.getElementById('config-status');
    statusToggle.removeEventListener('change', updateStatusLabel);
    statusToggle.addEventListener('change', updateStatusLabel);
    if (config.store_address) {
        fillAddressFields(config.store_address);
    }
}

function updateStatusLabel() {
    document.getElementById('config-status-label').textContent = this.checked ? 'Aberto' : 'Fechado';
}

function parseAddressForAdmin(address) {
    if (!address) return { street: '', number: '', complement: '', neighborhood: '', city: '', state: '' };
    const parts = address.split(', ');
    const street = parts[0] || '';
    const numberPart = parts[1] || '';
    const number = numberPart.split(' - ')[0] || '';
    const complement = numberPart.includes(' - ') ? numberPart.split(' - ').slice(1).join(' - ') : '';
    const neighborhood = parts[2] || '';
    const cityState = parts[3] || '';
    const city = cityState.split(' - ')[0] || '';
    const state = cityState.split(' - ')[1] || '';
    return { street, number, complement, neighborhood, city, state };
}

function fillAddressFields(address) {
    const parsed = parseAddressForAdmin(address);
    document.getElementById('config-street').value = parsed.street;
    document.getElementById('config-number').value = parsed.number;
    document.getElementById('config-complement').value = parsed.complement;
    document.getElementById('config-neighborhood').value = parsed.neighborhood;
    document.getElementById('config-city').value = parsed.city;
    document.getElementById('config-state').value = parsed.state;
}

function formatCep(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 5) {
        value = value.substring(0, 5) + '-' + value.substring(5, 8);
    }
    input.value = value;
}

function buscarCepAdmin(cep) {
    const cepClean = cep.replace(/\D/g, '');
    if (cepClean.length !== 8) return;
    const loadingEl = document.getElementById('admin-cep-loading');
    if (loadingEl) loadingEl.classList.add('active');
    fetch('https://viacep.com.br/ws/' + cepClean + '/json/')
        .then(response => response.json())
        .then(data => {
            if (loadingEl) loadingEl.classList.remove('active');
            if (data.erro) {
                alert('CEP não encontrado.');
                return;
            }
            document.getElementById('config-street').value = data.logradouro || '';
            document.getElementById('config-neighborhood').value = data.bairro || '';
            document.getElementById('config-city').value = data.localidade || '';
            document.getElementById('config-state').value = data.uf || '';
            document.getElementById('config-number').focus();
        })
        .catch(() => {
            if (loadingEl) loadingEl.classList.remove('active');
            alert('Erro ao buscar CEP.');
        });
}

function updateImagePreviews() {
    const bannerPreview = document.getElementById('banner-preview');
    const bannerPlaceholder = document.getElementById('banner-placeholder');
    if (config.banner_image) {
        bannerPreview.src = config.banner_image;
        bannerPreview.style.display = 'block';
        bannerPlaceholder.style.display = 'none';
    } else {
        bannerPreview.style.display = 'none';
        bannerPlaceholder.style.display = 'flex';
    }
    const logoPreview = document.getElementById('logo-preview');
    const logoPlaceholder = document.getElementById('logo-placeholder');
    if (config.logo_image) {
        logoPreview.src = config.logo_image;
        logoPreview.style.display = 'block';
        logoPlaceholder.style.display = 'none';
    } else {
        logoPreview.style.display = 'none';
        logoPlaceholder.style.display = 'flex';
    }
}

function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    const placeholder = preview.parentElement.querySelector('.placeholder');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function clearImage(type) {
    if (type === 'banner') {
        config.banner_image = '';
        document.getElementById('banner-upload').value = '';
        updateImagePreviews();
    } else if (type === 'logo') {
        config.logo_image = '';
        document.getElementById('logo-upload').value = '';
        updateImagePreviews();
    }
}

async function saveConfig() {
    try {
        const data = {
            store_name: document.getElementById('config-store-name').value.trim(),
            store_phone: document.getElementById('config-phone').value.trim(),
            delivery_fee: document.getElementById('config-delivery-fee').value,
            open_time: document.getElementById('config-open').value,
            close_time: document.getElementById('config-close').value,
            is_open: document.getElementById('config-status').checked ? 'true' : 'false'
        };
        const street = document.getElementById('config-street').value.trim();
        const number = document.getElementById('config-number').value.trim();
        const complement = document.getElementById('config-complement').value.trim();
        const neighborhood = document.getElementById('config-neighborhood').value.trim();
        const city = document.getElementById('config-city').value.trim();
        const state = document.getElementById('config-state').value.trim();
        if (street && number && neighborhood && city && state) {
            let address = street + ', ' + number;
            if (complement) address += ' - ' + complement;
            address += ', ' + neighborhood + ', ' + city + ' - ' + state;
            data.store_address = address;
        }
        const bannerPreview = document.getElementById('banner-preview');
        if (bannerPreview.src && bannerPreview.src.startsWith('data:image')) {
            data.banner_image = bannerPreview.src;
        }
        const logoPreview = document.getElementById('logo-preview');
        if (logoPreview.src && logoPreview.src.startsWith('data:image')) {
            data.logo_image = logoPreview.src;
        }
        await apiRequest('/config', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        await loadData();
        alert('✅ Configurações salvas com sucesso!');
    } catch (error) {
        alert('❌ Erro ao salvar configurações: ' + error.message);
    }
}

// ============================================================
//  PEDIDOS
// ============================================================
function renderAdminOrders() {
    const container = document.getElementById('admin-orders-list');
    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum pedido recebido.</div>';
        return;
    }
    let html = '';
    orders.forEach(o => {
        const statusMap = { 'pending': '🟡 Pendente', 'confirmado': '🟢 Confirmado', 'entregue': '✅ Entregue', 'cancelado': '❌ Cancelado' };
        const statusLabel = statusMap[o.status] || o.status;
        let items = o.items;
        if (typeof items === 'string') {
            try { items = JSON.parse(items); } catch(e) { items = []; }
        }
        html += `
            <div class="order-card">
                <div class="order-header">
                    <strong>${o.order_number || '#' + o.id}</strong>
                    <span class="tag ${o.status === 'pending' ? 'tag-orange' : o.status === 'entregue' ? 'tag-green' : 'tag-red'}">${statusLabel}</span>
                </div>
                <div style="font-size:13px;color:#555;margin-bottom:4px;">
                    <strong>${o.customer_name || 'Cliente'}</strong> • ${o.customer_phone || ''}
                </div>
                <div class="order-items">
                    ${items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                </div>
                <div class="flex-between">
                    <span>Total: <strong>R$ ${parseFloat(o.total).toFixed(2)}</strong></span>
                    <span style="font-size:13px;color:#888;">${new Date(o.created_at).toLocaleString()}</span>
                </div>
                <div style="font-size:12px;color:#888;margin-top:4px;">Entrega: ${o.customer_address || 'N/A'}</div>
                <div class="order-actions">
                    <button class="btn btn-sm btn-success" onclick="updateOrderStatus(${o.id},'confirmado')">✅ Confirmar</button>
                    <button class="btn btn-sm btn-secondary" onclick="updateOrderStatus(${o.id},'entregue')">📦 Entregue</button>
                    <button class="btn btn-sm btn-danger" onclick="updateOrderStatus(${o.id},'cancelado')">❌ Cancelar</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

async function updateOrderStatus(orderId, status) {
    try {
        await apiRequest('/orders/' + orderId + '/status', {
            method: 'PUT',
            body: JSON.stringify({ status: status })
        });
        await loadData();
        alert('✅ Pedido atualizado para: ' + status);
    } catch (error) {
        alert('❌ Erro ao atualizar pedido: ' + error.message);
    }
}

// ============================================================
//  DASHBOARD
// ============================================================
async function updateDashboard() {
    try {
        const result = await apiRequest('/stats/orders');
        const stats = result.data || {};
        document.getElementById('dash-total-orders').textContent = stats.total || 0;
        document.getElementById('dash-today-revenue').textContent = 'R$ ' + (stats.todayRevenue || 0).toFixed(2);
        document.getElementById('dash-avg-ticket').textContent = 'R$ ' + (stats.avgTicket || 0).toFixed(2);
        document.getElementById('dash-pending-orders').textContent = stats.pending || 0;
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        document.getElementById('dash-total-orders').textContent = '0';
        document.getElementById('dash-today-revenue').textContent = 'R$ 0,00';
        document.getElementById('dash-avg-ticket').textContent = 'R$ 0,00';
        document.getElementById('dash-pending-orders').textContent = '0';
    }
}

// ============================================================
//  TABS
// ============================================================
document.querySelectorAll('.admin-tabs button').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.admin-tabs button').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const tab = this.dataset.tab;
        document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
        document.getElementById(tab).classList.add('active');
        if (tab === 'tab-orders') renderAdminOrders();
        if (tab === 'tab-dashboard') updateDashboard();
        if (tab === 'tab-products') renderAdminProducts();
        if (tab === 'tab-categories') renderAdminCategories();
    });
});

// ============================================================
//  LOGOUT
// ============================================================
function logout() {
    if (confirm('Deseja realmente sair?')) {
        window.location.href = '/';
    }
}

// ============================================================
//  INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Painel Administrativo iniciado!');
    loadData();
});
