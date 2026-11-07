// --- CONFIGURACIÓ DE SUPABASE ---
const SUPABASE_URL = 'https://qsfopabhkqneksphaihk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xeOaiZgQtbXhH1bJzGCvnQ_oH_HpxKQ';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MESOS_NOM = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
const currentMonthName = MESOS_NOM[new Date().getMonth()];

let currentTipologia = 'tots';
let searchTerm = '';
let selectedMonths = [currentMonthName];
let selectedColor = '#b6d7a8';
let currentPage = 1;
let itemsPerPage = 24;
let isAdmin = false;
let allAliments = [];

let activeModalImages = [];
let activeModalIndex = 0;
let selectedFormColor = '#b6d7a8'; // Color seleccionat al formulari d'edició/creació

// Elements DOM
const gridEl = document.getElementById('aliments-grid');
const searchInput = document.getElementById('search-input');
const categoriesNav = document.getElementById('categories-nav');
const adminLoginBtn = document.getElementById('btn-admin-login-discreet');
const adminLogoutBtn = document.getElementById('btn-admin-logout');
const adminPanel = document.getElementById('admin-panel');
const loginModal = document.getElementById('login-modal');
const closeModal = document.getElementById('close-modal');
const loginForm = document.getElementById('login-form');

const alimentModal = document.getElementById('aliment-modal');
const closeAlimentModal = document.getElementById('close-aliment-modal');
const alimentForm = document.getElementById('aliment-form');
const btnNouAliment = document.getElementById('btn-nou-aliment');
const alimentModalTitle = document.getElementById('aliment-modal-title');
const imageInputsContainer = document.getElementById('image-inputs-container');
const btnAddImageField = document.getElementById('btn-add-image-field');

const customPartInput = document.getElementById('custom-part-input');
const btnAddCustomPart = document.getElementById('btn-add-custom-part');
const customConsumInput = document.getElementById('custom-consum-input');
const btnAddCustomConsum = document.getElementById('btn-add-custom-consum');

const imageModal = document.getElementById('image-modal');
const modalImgPreview = document.getElementById('modal-img-preview');
const modalPrevBtn = document.getElementById('modal-prev-btn');
const modalNextBtn = document.getElementById('modal-next-btn');
const modalImgCounter = document.getElementById('modal-img-counter');

const monthsToggleBtn = document.getElementById('months-toggle-btn');
const monthsMenu = document.getElementById('months-menu');
const checkAllMonths = document.getElementById('check-all-months');
const monthCheckboxes = document.querySelectorAll('.month-check');
const selectedMonthsCountSpan = document.getElementById('selected-months-count');

const itemsPerPageSelect = document.getElementById('items-per-page');
const btnPrevPage = document.getElementById('btn-prev-page');
const btnNextPage = document.getElementById('btn-next-page');
const pageInfo = document.getElementById('page-info');

document.addEventListener('DOMContentLoaded', async () => {
    initMonthCheckboxes();
    await checkUserSession();
    await fetchAliments();

    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        currentPage = 1;
        applyFiltersAndRender();
    });

    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            selectedColor = e.target.getAttribute('data-color');
            currentPage = 1;
            applyFiltersAndRender();
        });
    });

    // Gestió del selector net de color al formulari
    document.querySelectorAll('.color-option-circle').forEach(circle => {
        circle.addEventListener('click', (e) => {
            document.querySelectorAll('.color-option-circle').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            selectedFormColor = e.target.getAttribute('data-color');
        });
    });

    itemsPerPageSelect.addEventListener('change', (e) => {
        itemsPerPage = parseInt(e.target.value);
        currentPage = 1;
        applyFiltersAndRender();
    });

    btnPrevPage.addEventListener('click', () => { if (currentPage > 1) { currentPage--; applyFiltersAndRender(); } });
    btnNextPage.addEventListener('click', () => { currentPage++; applyFiltersAndRender(); });

    adminLoginBtn.addEventListener('click', () => loginModal.classList.remove('hidden'));
    closeModal.addEventListener('click', () => loginModal.classList.add('hidden'));

    adminLogoutBtn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        isAdmin = false;
        adminPanel.classList.add('hidden');
        showToast('Sessió tancada correctament.', 'info');
        fetchAliments();
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            showToast('Error d\'autenticació: ' + error.message, 'error');
        } else {
            loginModal.classList.add('hidden');
            loginForm.reset();
            showToast('Sessió iniciada amb èxit!', 'success');
            await checkUserSession();
            fetchAliments();
        }
    });

    btnNouAliment.addEventListener('click', () => openAlimentModal());
    closeAlimentModal.addEventListener('click', () => alimentModal.classList.add('hidden'));
    alimentForm.addEventListener('submit', handleAlimentFormSubmit);
    btnAddImageField.addEventListener('click', () => addImageInputField(''));

    btnAddCustomPart.addEventListener('click', () => {
        const val = customPartInput.value.trim();
        if (val) { addChipOption('parts-checkboxes', val, true); customPartInput.value = ''; }
    });

    btnAddCustomConsum.addEventListener('click', () => {
        const val = customConsumInput.value.trim();
        if (val) { addChipOption('consum-checkboxes', val, true); customConsumInput.value = ''; }
    });

    document.getElementById('btn-massiu-publicar').addEventListener('click', () => updateTipologiaStatus(currentTipologia, true));
    document.getElementById('btn-massiu-despublicar').addEventListener('click', () => updateTipologiaStatus(currentTipologia, false));
});

function addChipOption(containerId, value, check = false) {
    const container = document.getElementById(containerId);
    const exists = Array.from(container.querySelectorAll('input')).some(i => i.value.toLowerCase() === value.toLowerCase());
    if (exists) {
        if (check) {
            const match = Array.from(container.querySelectorAll('input')).find(i => i.value.toLowerCase() === value.toLowerCase());
            if (match) match.checked = true;
        }
        return;
    }

    const label = document.createElement('label');
    label.className = 'chip-checkbox';
    label.innerHTML = `<input type="checkbox" value="${value}" ${check ? 'checked' : ''}><span>${value}</span>`;
    container.appendChild(label);
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-weight:bold;color:#718096;">&times;</button>
    `;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4000);
}

function initMonthCheckboxes() {
    monthCheckboxes.forEach(cb => {
        if (cb.value === currentMonthName) cb.checked = true;
        cb.addEventListener('change', updateSelectedMonths);
    });

    checkAllMonths.addEventListener('change', (e) => {
        monthCheckboxes.forEach(cb => cb.checked = e.target.checked);
        updateSelectedMonths();
    });

    monthsToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        monthsMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!document.getElementById('months-dropdown').contains(e.target)) {
            monthsMenu.classList.add('hidden');
        }
    });
}

function updateSelectedMonths() {
    selectedMonths = Array.from(monthCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
    selectedMonthsCountSpan.textContent = selectedMonths.length === 12 ? 'Tots' : selectedMonths.length;
    currentPage = 1;
    applyFiltersAndRender();
}

async function checkUserSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    isAdmin = !!session;
    if (isAdmin) {
        adminPanel.classList.remove('hidden');
    } else {
        adminPanel.classList.add('hidden');
    }
}

async function fetchAliments() {
    let query = supabaseClient.from('aliments').select(`*, aliments_imatges (url)`);
    if (!isAdmin) query = query.eq('publicat', true);

    const { data, error } = await query;
    if (error) {
        showToast('Error al carregar el catàleg.', 'error');
        return;
    }
    allAliments = data;
    buildDynamicNavAndTitles();
    applyFiltersAndRender();
}

function buildDynamicNavAndTitles() {
    const visibleAliments = isAdmin ? allAliments : allAliments.filter(a => a.publicat);

    const tipologiaLabels = {
        'planta_silvestre': 'Plantes Silvestres',
        'verdura': 'Verdures',
        'fruita': 'Fruites',
        'peix': 'Peixos',
        'marisc': 'Marisc'
    };

    const publishedTipologias = [...new Set(visibleAliments.map(a => a.tipologia))].filter(Boolean);

    let navHtml = `<button class="tab-btn ${currentTipologia === 'tots' ? 'active' : ''}" data-tipologia="tots">Tots (${visibleAliments.length})</button>`;

    publishedTipologias.forEach(key => {
        const count = visibleAliments.filter(a => a.tipologia === key).length;
        const label = tipologiaLabels[key] || key;
        navHtml += `<button class="tab-btn ${currentTipologia === key ? 'active' : ''}" data-tipologia="${key}">${label} (${count})</button>`;
    });

    categoriesNav.innerHTML = navHtml;

    categoriesNav.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            categoriesNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTipologia = e.target.getAttribute('data-tipologia');
            currentPage = 1;
            updateSubtitles(publishedTipologias, tipologiaLabels);
            applyFiltersAndRender();
        });
    });

    updateSubtitles(publishedTipologias, tipologiaLabels);
}

function updateSubtitles(publishedTipologias, tipologiaLabels) {
    const mainSubtitle = document.getElementById('main-subtitle');
    const labelsList = publishedTipologias.map(t => tipologiaLabels[t] || t).join(', ');
    mainSubtitle.textContent = labelsList ? `Catàleg de: ${labelsList}` : 'Catàleg de: (Cap tipologia publicada)';
}

function applyFiltersAndRender() {
    let filtered = allAliments.filter(item => {
        const matchesSearch = item.nom_comu.toLowerCase().includes(searchTerm) || item.nom_cientific.toLowerCase().includes(searchTerm);
        const matchesTipologia = currentTipologia === 'tots' || item.tipologia === currentTipologia;
        const matchesColor = selectedColor === 'tots' || item.color === selectedColor;
        let matchesMonth = true;
        if (selectedMonths.length > 0 && item.mesos) {
            matchesMonth = item.mesos.some(m => selectedMonths.includes(m));
        }
        return matchesSearch && matchesTipologia && matchesColor && matchesMonth;
    });

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filtered.slice(startIdx, startIdx + itemsPerPage);

    pageInfo.textContent = `Pàgina ${currentPage} de ${totalPages} (${totalItems} aliments)`;
    btnPrevPage.disabled = currentPage === 1;
    btnNextPage.disabled = currentPage === totalPages;

    renderAliments(paginatedItems);
}

function renderAliments(aliments) {
    if (aliments.length === 0) {
        gridEl.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">No s\'han trobat aliments amb aquests filtres.</p>';
        return;
    }

    gridEl.innerHTML = aliments.map(item => {
        const hasImg = item.aliments_imatges && item.aliments_imatges.length > 0;
        let imgGalleryHtml = '';

        if (hasImg) {
            const urlsArray = item.aliments_imatges.map(i => i.url);
            const urlsJson = JSON.stringify(urlsArray).replace(/"/g, '&quot;');

            const slides = item.aliments_imatges.map((img, idx) => `
                <img src="${img.url}" alt="${item.nom_comu}" class="${idx === 0 ? 'active-slide' : ''}" onclick="openImageModal(${urlsJson}, ${idx})" onerror="this.style.display='none'">
            `).join('');

            const dots = item.aliments_imatges.length > 1 ? `
                <button class="gallery-nav-btn gallery-prev" onclick="event.stopPropagation(); slideGallery(${item.id}, -1)">&#10094;</button>
                <button class="gallery-nav-btn gallery-next" onclick="event.stopPropagation(); slideGallery(${item.id}, 1)">&#10095;</button>
                <div class="gallery-indicators">
                    ${item.aliments_imatges.map((_, idx) => `<span class="gallery-dot ${idx === 0 ? 'active' : ''}"></span>`).join('')}
                </div>
            ` : '';

            imgGalleryHtml = `<div class="card-header-img" id="gallery-${item.id}" title="Clica per veure en gran">${slides}${dots}</div>`;
        } else {
            imgGalleryHtml = `
                <div class="card-header-img">
                    <svg class="svg-placeholder" viewBox="0 0 24 24"><path d="M17.5 3C15.5 3 13 4.5 11 6.5C9 4.5 6.5 3 4.5 3C2 3 0 5 0 7.5C0 12 5 17 11 21C17 17 22 12 22 7.5C22 5 20 3 17.5 3Z"/></svg>
                </div>
            `;
        }

        const partsBadges = item.parts ? item.parts.map(p => `<span class="badge-green">${p}</span>`).join('') : '-';
        const consumBadges = item.consum ? item.consum.map(c => `<span class="badge-green">${c}</span>`).join('') : '-';
        const mesosBadges = item.mesos ? item.mesos.map(m => `<span class="badge-yellow ${m === currentMonthName ? 'active-month' : ''}">${m}</span>`).join('') : '-';

        const colorBar = item.color || '#b6d7a8';
        const estatClasse = item.publicat ? '' : 'despublicat';

        const adminBar = isAdmin ? `
            <div style="margin-top:0.5rem; padding-top:0.5rem; border-top:1px solid #edf2f7; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.75rem; font-weight:bold; color:${item.publicat ? 'green' : 'red'};">${item.publicat ? 'Publicat' : 'Despublicat'}</span>
                <div>
                    <button onclick="openAlimentModal(${item.id})" class="btn-info" style="padding:0.2rem 0.5rem;">Editar</button>
                    <button onclick="deleteAliment(${item.id})" class="btn-danger-sm" style="padding:0.2rem 0.5rem;">Esborrar</button>
                </div>
            </div>
        ` : '';

        return `
            <div class="aliment-card ${estatClasse}">
                <div class="card-color-bar" style="background-color: ${colorBar};"></div>
                ${imgGalleryHtml}
                <div class="aliment-card-content">
                    <div class="card-title">
                        <h3>${item.nom_comu}</h3>
                        <i>${item.nom_cientific}</i>
                    </div>
                    <div class="card-section"><p><strong>Composició:</strong> ${item.composicio || 'No especificada'}</p></div>
                    <div class="card-section"><div class="card-section-title">PARTS EMPRADES</div><div class="badges-row">${partsBadges}</div></div>
                    <div class="card-section"><div class="card-section-title">FORMA DE CONSUM</div><div class="badges-row">${consumBadges}</div></div>
                    <div class="card-section"><div class="card-section-title">MESOS DE TEMPORADA</div><div class="badges-row">${mesosBadges}</div></div>
                    ${adminBar}
                </div>
            </div>
        `;
    }).join('');
}

window.openImageModal = function(urls, index) {
    activeModalImages = urls;
    activeModalIndex = index;
    updateModalImageDisplay();
    imageModal.classList.remove('hidden');
};

window.closeImageModal = function() {
    imageModal.classList.add('hidden');
};

window.slideModalImage = function(direction) {
    activeModalIndex = (activeModalIndex + direction + activeModalImages.length) % activeModalImages.length;
    updateModalImageDisplay();
};

function updateModalImageDisplay() {
    modalImgPreview.src = activeModalImages[activeModalIndex];
    modalImgCounter.textContent = `${activeModalIndex + 1} / ${activeModalImages.length}`;
    if (activeModalImages.length > 1) {
        modalPrevBtn.style.display = 'flex';
        modalNextBtn.style.display = 'flex';
        modalImgCounter.style.display = 'block';
    } else {
        modalPrevBtn.style.display = 'none';
        modalNextBtn.style.display = 'none';
        modalImgCounter.style.display = 'none';
    }
}

window.slideGallery = function(alimentId, direction) {
    const container = document.getElementById(`gallery-${alimentId}`);
    if (!container) return;
    const images = container.querySelectorAll('img');
    const dots = container.querySelectorAll('.gallery-dot');
    let currentIndex = Array.from(images).findIndex(img => img.classList.contains('active-slide'));

    images[currentIndex].classList.remove('active-slide');
    if(dots[currentIndex]) dots[currentIndex].classList.remove('active');

    currentIndex = (currentIndex + direction + images.length) % images.length;

    images[currentIndex].classList.add('active-slide');
    if(dots[currentIndex]) dots[currentIndex].classList.add('active');
};

function addImageInputField(url = '') {
    const row = document.createElement('div');
    row.className = 'image-input-row';
    row.innerHTML = `
        <input type="url" class="form-image-url" placeholder="https://..." value="${url}">
        <button type="button" class="btn-danger-sm" onclick="this.parentElement.remove()" style="padding: 0.5rem 0.8rem;">&times;</button>
    `;
    imageInputsContainer.appendChild(row);
}

window.openAlimentModal = function(id = null) {
    alimentForm.reset();
    document.getElementById('aliment-id').value = '';
    imageInputsContainer.innerHTML = '';

    document.querySelectorAll('#parts-checkboxes input, #consum-checkboxes input, #mesos-checkboxes input').forEach(cb => cb.checked = false);

    if (id) {
        alimentModalTitle.textContent = 'Editar Aliment';
        const item = allAliments.find(a => a.id === id);
        if (!item) return;

        document.getElementById('aliment-id').value = item.id;
        document.getElementById('form-nom-comu').value = item.nom_comu || '';
        document.getElementById('form-nom-cientific').value = item.nom_cientific || '';
        document.getElementById('form-tipologia').value = item.tipologia || 'planta_silvestre';
        document.getElementById('form-composicio').value = item.composicio || '';

        // Seleccionar color net
        selectedFormColor = item.color || '#b6d7a8';
        document.querySelectorAll('.color-option-circle').forEach(circle => {
            if (circle.getAttribute('data-color') === selectedFormColor) {
                circle.classList.add('active');
            } else {
                circle.classList.remove('active');
            }
        });

        if (item.parts) {
            item.parts.forEach(p => addChipOption('parts-checkboxes', p, true));
        }

        if (item.consum) {
            item.consum.forEach(c => addChipOption('consum-checkboxes', c, true));
        }

        if (item.mesos) {
            document.querySelectorAll('#mesos-checkboxes input').forEach(cb => {
                if (item.mesos.includes(cb.value)) cb.checked = true;
            });
        }

        if (item.aliments_imatges && item.aliments_imatges.length > 0) {
            item.aliments_imatges.forEach(img => addImageInputField(img.url));
        }
    } else {
        alimentModalTitle.textContent = 'Nou Aliment';
        selectedFormColor = '#b6d7a8';
        document.querySelectorAll('.color-option-circle').forEach((c, idx) => {
            if (idx === 0) c.classList.add('active');
            else c.classList.remove('active');
        });
        addImageInputField();
    }
    alimentModal.classList.remove('hidden');
};

document.getElementById('close-aliment-modal').addEventListener('click', () => alimentModal.classList.add('hidden'));

function isValidImageUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

async function handleAlimentFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('aliment-id').value;
    const nom_comu = document.getElementById('form-nom-comu').value.trim();
    const nom_cientific = document.getElementById('form-nom-cientific').value.trim();
    const tipologia = document.getElementById('form-tipologia').value;
    
    const color = selectedFormColor;
    const composicio = document.getElementById('form-composicio').value.trim();

    const parts = Array.from(document.querySelectorAll('#parts-checkboxes input:checked')).map(cb => cb.value);
    const consum = Array.from(document.querySelectorAll('#consum-checkboxes input:checked')).map(cb => cb.value);
    const mesos = Array.from(document.querySelectorAll('#mesos-checkboxes input:checked')).map(cb => cb.value);

    const rawImatges = Array.from(document.querySelectorAll('.form-image-url')).map(input => input.value.trim()).filter(Boolean);
    
    for (let imgUrl of rawImatges) {
        if (!isValidImageUrl(imgUrl)) {
            showToast(`L'URL d'imatge no té un format vàlid: "${imgUrl}"`, 'error');
            return;
        }
    }

    const alimentData = { nom_comu, nom_cientific, tipologia, color, composicio, parts, consum, mesos };

    if (id) {
        const { error } = await supabaseClient.from('aliments').update(alimentData).eq('id', id);
        if (error) {
            showToast('Error en actualitzar: ' + error.message, 'error');
            return;
        }

        await supabaseClient.from('aliments_imatges').delete().eq('aliment_id', id);
        if (rawImatges.length > 0) {
            const imgInserts = rawImatges.map(url => ({ aliment_id: id, url }));
            await supabaseClient.from('aliments_imatges').insert(imgInserts);
        }

        showToast('Aliment actualitzat correctament!', 'success');
    } else {
        const { data: newAliment, error } = await supabaseClient.from('aliments').insert([alimentData]).select().single();
        if (error) {
            showToast('Error en crear: ' + error.message, 'error');
            return;
        }

        if (rawImatges.length > 0 && newAliment) {
            const imgInserts = rawImatges.map(url => ({ aliment_id: newAliment.id, url }));
            await supabaseClient.from('aliments_imatges').insert(imgInserts);
        }

        showToast('Aliment creat correctament!', 'success');
    }

    alimentModal.classList.add('hidden');
    fetchAliments();
}

window.deleteAliment = async function(id) {
    if (!confirm('Estàs segur que vols esborrar aquest aliment?')) return;

    const { error } = await supabaseClient.from('aliments').delete().eq('id', id);
    if (error) {
        showToast('Error en esborrar: ' + error.message, 'error');
    } else {
        showToast('Aliment esborrat correctament.', 'success');
        fetchAliments();
    }
};

async function updateTipologiaStatus(tipologia, estat) {
    let query = supabaseClient.from('aliments').update({ publicat: estat });
    if (tipologia !== 'tots') {
        query = query.eq('tipologia', tipologia);
    }
    const { error } = await query;

    if (error) {
        showToast('Error en l\'acció massiva: ' + error.message, 'error');
    } else {
        showToast('Estat d\'aliments actualitzat correctament!', 'success');
        fetchAliments();
    }
}