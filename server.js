const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
// Usa a porta fornecida pelo Heroku (process.env.PORT) ou 3000 localmente
const port = process.env.PORT || 3000;

// =========================================================================
// 💡 ALTERAÇÃO CHAVE AQUI PARA O BANCO DE DADOS 💡
// =========================================================================
const pool = new Pool({
    // 1. connectionString:
    // Tenta usar a variável DATABASE_URL (configurada pelo Heroku Add-on)
    // Se não existir, usa sua string de conexão local como fallback.
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:230655@localhost:5432/portal_publicacoes',
    
    // 2. Configuração SSL:
    // O Heroku exige SSL para conexão remota. 
    // Só aplica a configuração SSL se a DATABASE_URL estiver presente (ambiente de produção).
    ssl: process.env.DATABASE_URL ? { 
        rejectUnauthorized: false // Necessário para a conexão com o Heroku
    } : false, // No ambiente local (localhost), desliga o SSL.
});
// =========================================================================

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Servir o frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========== ROTAS DA API ==========

// Buscar todas as publicações
app.get('/api/publicacoes', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, a.username as autor 
            FROM publicacoes p 
            LEFT JOIN administradores a ON p.administrador_id = a.id 
            WHERE p.ativo = true 
            ORDER BY p.publicado_em DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar publicações:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar comentários de uma publicação
app.get('/api/comentarios/:publicacaoId', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM comentarios WHERE publicacao_id = $1 AND aprovado = true ORDER BY criado_em DESC',
            [req.params.publicacaoId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar comentários:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Adicionar comentário
app.post('/api/comentarios', async (req, res) => {
    const { publicacao_id, autor_nome, texto, email } = req.body;
    
    if (!publicacao_id || !texto) {
        return res.status(400).json({ error: 'Dados incompletos' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO comentarios (publicacao_id, autor_nome, texto, email) VALUES ($1, $2, $3, $4) RETURNING *',
            [publicacao_id, autor_nome || 'Visitante', texto, email || null]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao adicionar comentário:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ========== ROTAS ADMIN (Protegidas) ==========

// Login do administrador
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const result = await pool.query(
            'SELECT * FROM administradores WHERE username = $1',
            [username]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const admin = result.rows[0];
        // Em produção, use bcrypt para verificar a senha
        // const validPassword = await bcrypt.compare(password, admin.senha_hash);
        
        // Por enquanto, verificação simples para teste
        if (password === '230655') {
            res.json({ success: true, message: 'Login realizado com sucesso' });
        } else {
            res.status(401).json({ error: 'Credenciais inválidas' });
        }
    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Adicionar nova publicação (apenas admin)
app.post('/api/admin/publicacoes', async (req, res) => {
    const { titulo, conteudo, imagem_url, tipo } = req.body;
    
    try {
        const result = await pool.query(
            'INSERT INTO publicacoes (titulo, conteudo, imagem_url, tipo, administrador_id) VALUES ($1, $2, $3, $4, 1) RETURNING *',
            [titulo, conteudo, imagem_url, tipo || 'publicacao']
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao adicionar publicação:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Deletar comentário (apenas admin)
app.delete('/api/admin/comentarios/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM comentarios WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'Comentário deletado com sucesso' });
    } catch (err) {
        console.error('Erro ao deletar comentário:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar configurações do site
app.get('/api/configuracoes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM configuracoes');
        const configuracoes = {};
        result.rows.forEach(row => {
            configuracoes[row.chave] = row.valor;
        });
        res.json(configuracoes);
    } catch (err) {
        console.error('Erro ao buscar configurações:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.listen(port, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${port}`);
    console.log(`📊 Banco de dados: portal_publicacoes`);
});