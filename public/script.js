// Estado da aplicação
let isAdmin = false;
let publicacoes = [];

// Elementos DOM
const adminPanel = document.getElementById('adminPanel');
const postsContainer = document.getElementById('postsContainer');
const alertBanner = document.getElementById('alertBanner');
const contactInfo = document.getElementById('contactInfo');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const addPostBtn = document.getElementById('addPostBtn');
const addPhotoBtn = document.getElementById('addPhotoBtn');
const addAdBtn = document.getElementById('addAdBtn');
const loginModal = document.getElementById('loginModal');
const addContentModal = document.getElementById('addContentModal');
const modalTitle = document.getElementById('modalTitle');
const loginForm = document.getElementById('loginForm');
const contentForm = document.getElementById('contentForm');
const closeModalBtns = document.querySelectorAll('.close-modal');

// API Base URL
const API_BASE = window.location.origin + '/api';

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarConfiguracoes();
    carregarPublicacoes();
    configurarEventListeners();
});

// Configurar event listeners
function configurarEventListeners() {
    adminLoginBtn.addEventListener('click', () => loginModal.style.display = 'flex');
    logoutBtn.addEventListener('click', fazerLogout);
    
    addPostBtn.addEventListener('click', () => abrirModalConteudo('publicacao'));
    addPhotoBtn.addEventListener('click', () => abrirModalConteudo('foto'));
    addAdBtn.addEventListener('click', () => abrirModalConteudo('anuncio'));
    
    loginForm.addEventListener('submit', fazerLogin);
    contentForm.addEventListener('submit', adicionarConteudo);
    
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            loginModal.style.display = 'none';
            addContentModal.style.display = 'none';
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) loginModal.style.display = 'none';
        if (e.target === addContentModal) addContentModal.style.display = 'none';
    });
}

// Carregar configurações do site
async function carregarConfiguracoes() {
    try {
        const response = await fetch(`${API_BASE}/configuracoes`);
        const configuracoes = await response.json();
        
        // Atualizar banner de alerta
        alertBanner.innerHTML = `
            <p><strong>Alerta:</strong> Se você tiver um alerta, entre em contato: 
            <a href="tel:${configuracoes.telefone_contato}">${configuracoes.telefone_contato}</a></p>
        `;
        
        // Atualizar informações de contato
        contactInfo.innerHTML = `
            <h3>Contato</h3>
            <p>Para alertas ou questões urgentes:</p>
            <p><strong>Telefone:</strong> ${configuracoes.telefone_contato}</p>
            <p><strong>Email:</strong> ${configuracoes.email_contato}</p>
        `;
        
        // Atualizar título do site
        document.title = configuracoes.titulo_site || 'Meu Portal de Publicações';
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
    }
}

// Carregar publicações
async function carregarPublicacoes() {
    try {
        const response = await fetch(`${API_BASE}/publicacoes`);
        publicacoes = await response.json();
        renderizarPublicacoes();
    } catch (error) {
        console.error('Erro ao carregar publicações:', error);
        postsContainer.innerHTML = '<div class="error">Erro ao carregar publicações. Tente recarregar a página.</div>';
    }
}

// Renderizar publicações
function renderizarPublicacoes() {
    if (publicacoes.length === 0) {
        postsContainer.innerHTML = '<div class="post"><p>Nenhuma publicação encontrada.</p></div>';
        return;
    }
    
    postsContainer.innerHTML = publicacoes.map(publicacao => `
        <div class="post" data-post-id="${publicacao.id}">
            <div class="post-header">
                <h3 class="post-title">${publicacao.titulo}</h3>
                <span class="post-date">${formatarData(publicacao.publicado_em)}</span>
            </div>
            ${publicacao.imagem_url ? `<img src="${publicacao.imagem_url}" alt="${publicacao.titulo}" class="post-image" onerror="this.style.display='none'">` : ''}
            <div class="post-content">
                <p>${publicacao.conteudo}</p>
            </div>
            <div class="comments-section">
                <h3>Comentários</h3>
                <div class="comment-form">
                    <textarea placeholder="Deixe seu comentário..." id="commentText-${publicacao.id}"></textarea>
                    <button class="btn btn-primary" onclick="adicionarComentario(${publicacao.id})">Enviar Comentário</button>
                </div>
                <div id="comments-${publicacao.id}">
                    <div class="loading">Carregando comentários...</div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Carregar comentários para cada publicação
    publicacoes.forEach(publicacao => carregarComentarios(publicacao.id));
}

// Carregar comentários de uma publicação
async function carregarComentarios(publicacaoId) {
    try {
        const response = await fetch(`${API_BASE}/comentarios/${publicacaoId}`);
        const comentarios = await response.json();
        renderizarComentarios(publicacaoId, comentarios);
    } catch (error) {
        console.error('Erro ao carregar comentários:', error);
        document.getElementById(`comments-${publicacaoId}`).innerHTML = '<div class="error">Erro ao carregar comentários.</div>';
    }
}

// Renderizar comentários
function renderizarComentarios(publicacaoId, comentarios) {
    const container = document.getElementById(`comments-${publicacaoId}`);
    
    if (comentarios.length === 0) {
        container.innerHTML = '<p>Nenhum comentário ainda. Seja o primeiro a comentar!</p>';
        return;
    }
    
    container.innerHTML = comentarios.map(comentario => `
        <div class="comment">
            ${isAdmin ? `<button class="delete-comment" onclick="deletarComentario(${comentario.id})">Excluir</button>` : ''}
            <div class="comment-header">
                <span class="comment-author">${comentario.autor_nome}</span>
                <span class="comment-date">${formatarData(comentario.criado_em)}</span>
            </div>
            <p>${comentario.texto}</p>
        </div>
    `).join('');
}

// Adicionar comentário
async function adicionarComentario(publicacaoId) {
    const textarea = document.getElementById(`commentText-${publicacaoId}`);
    const texto = textarea.value.trim();
    
    if (!texto) {
        alert('Por favor, digite um comentário.');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/comentarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                publicacao_id: publicacaoId,
                texto: texto
            })
        });
        
        if (response.ok) {
            textarea.value = '';
            carregarComentarios(publicacaoId); // Recarregar comentários
        } else {
            alert('Erro ao adicionar comentário.');
        }
    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        alert('Erro ao adicionar comentário.');
    }
}

// Deletar comentário (apenas admin)
async function deletarComentario(comentarioId) {
    if (!isAdmin || !confirm('Tem certeza que deseja excluir este comentário?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/comentarios/${comentarioId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Recarregar todas as publicações para atualizar os comentários
            carregarPublicacoes();
        } else {
            alert('Erro ao excluir comentário.');
        }
    } catch (error) {
        console.error('Erro ao excluir comentário:', error);
        alert('Erro ao excluir comentário.');
    }
}

// Login do administrador
async function fazerLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            isAdmin = true;
            adminPanel.style.display = 'block';
            loginModal.style.display = 'none';
            adminLoginBtn.style.display = 'none';
            carregarPublicacoes(); // Recarregar para mostrar botões de exclusão
            alert('Login realizado com sucesso!');
        } else {
            alert(result.error || 'Erro no login');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        alert('Erro no login. Tente novamente.');
    }
}

// Logout
function fazerLogout() {
    isAdmin = false;
    adminPanel.style.display = 'none';
    adminLoginBtn.style.display = 'block';
    carregarPublicacoes(); // Recarregar para esconder botões de exclusão
    alert('Logout realizado com sucesso!');
}

// Abrir modal para adicionar conteúdo
function abrirModalConteudo(tipo) {
    if (!isAdmin) return;
    
    const titulos = {
        'publicacao': 'Adicionar Publicação',
        'foto': 'Adicionar Foto',
        'anuncio': 'Adicionar Anúncio'
    };
    
    modalTitle.textContent = titulos[tipo] || 'Adicionar Conteúdo';
    document.getElementById('contentType').value = tipo;
    contentForm.reset();
    addContentModal.style.display = 'flex';
}

// Adicionar novo conteúdo
async function adicionarConteudo(e) {
    e.preventDefault();
    
    if (!isAdmin) return;
    
    const titulo = document.getElementById('contentTitle').value;
    const conteudo = document.getElementById('contentText').value;
    const imagem_url = document.getElementById('contentImage').value;
    const tipo = document.getElementById('contentType').value;
    
    try {
        const response = await fetch(`${API_BASE}/admin/publicacoes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo, conteudo, imagem_url, tipo })
        });
        
        if (response.ok) {
            addContentModal.style.display = 'none';
            carregarPublicacoes(); // Recarregar publicações
            alert('Conteúdo adicionado com sucesso!');
        } else {
            const error = await response.json();
            alert(error.error || 'Erro ao adicionar conteúdo.');
        }
    } catch (error) {
        console.error('Erro ao adicionar conteúdo:', error);
        alert('Erro ao adicionar conteúdo.');
    }
}

// Formatar data
function formatarData(dataString) {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}