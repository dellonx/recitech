// CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = "https://shzbtwrmutigmotofwhl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoemJ0d3JtdXRpZ21vdG9md2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzU2MzQsImV4cCI6MjA5NjYxMTYzNH0.6I5wMr0Poet8BgVc1SVfrP67z59B7GEanfxDoOgaBAc";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarioLogado = null;
let meuMapa = null;

// =========================================
// CONTROLE DE NAVEGAÇÃO DA SPA
// =========================================
function navegarPara(idDaTela, elementoNav) {
    if (!usuarioLogado && idDaTela === 'tela-scanner') {
        alert("Para acessar o Scanner e computar seus pontos, você precisa fazer login ou criar uma conta!");
        navegarPara('tela-login');
        return;
    }

    document.querySelectorAll('.app-section').forEach(section => {
        section.style.display = 'none';
    });
    
    const telaAtiva = document.getElementById(idDaTela);
    if (telaAtiva) {
        telaAtiva.style.display = 'flex';
    }
    
    if (idDaTela === 'tela-mapa' && meuMapa) {
        setTimeout(() => {
            meuMapa.invalidateSize();
        }, 200);
    }
    
    const bottomNav = document.getElementById('app-bottom-nav');
    if (idDaTela === 'tela-login' || idDaTela === 'tela-ranking') {
        bottomNav.style.display = 'none';
    } else {
        bottomNav.style.display = 'flex';
    }

    if (elementoNav) {
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        elementoNav.classList.add('active');
    }
}

// =========================================
// FUNÇÃO DE ALTERNÂNCIA (LOGIN VS CADASTRO)
// =========================================
function alternarModoAutenticacao(modo) {
    const campoNome = document.getElementById('login-nome');
    const btnEntrar = document.getElementById('btn-entrar');
    const btnCadastrar = document.getElementById('btn-cadastrar');
    const linkCadastro = document.getElementById('toggle-para-cadastro');
    const linkLogin = document.getElementById('toggle-para-login');
    const titulo = document.getElementById('login-dinamico-titulo');

    if (modo === 'cadastro') {
        titulo.innerText = "Criar Nova Conta";
        campoNome.style.display = 'block';
        btnCadastrar.style.display = 'block';
        btnEntrar.style.display = 'none';
        linkCadastro.style.display = 'none';
        linkLogin.style.display = 'block';
    } else {
        titulo.innerText = "Entrar no ReciclaTech";
        campoNome.style.display = 'none';
        btnCadastrar.style.display = 'none';
        btnEntrar.style.display = 'block';
        linkCadastro.style.display = 'block';
        linkLogin.style.display = 'none';
    }
}

// =========================================
// INTEGRALIZAÇÃO DO MAPA REAL DINÂMICO
// =========================================
async function inicializarMapaReal() {
    if (meuMapa) return;

    const latRecife = -8.0631;
    const lngRecife = -34.8713;

    meuMapa = L.map('mapa-container-real').setView([latRecife, lngRecife], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(meuMapa);

    try {
        const { data: lojas, error } = await supabaseClient.from('lojas').select('*');

        if (error) {
            console.error("Erro ao buscar lojas:", error.message);
            return;
        }

        if (lojas && lojas.length > 0) {
            lojas.forEach(loja => {
                if (loja.latitude && loja.longitude) {
                    const marcador = L.marker([loja.latitude, loja.longitude]).addTo(meuMapa);
                    marcador.bindPopup(`
                        <div style="font-family: sans-serif; text-align: center; min-width: 150px;">
                            <h4 style="margin: 0 0 5px 0; color: #00b36b;">${loja.nome}</h4>
                            <p style="margin: 0 0 5px 0; font-size: 0.8rem; color: #666;">Linha: <strong>${loja.linha}</strong></p>
                            <strong style="color: #b8860b;">${loja.reccoins_disponiveis} RC Disponíveis</strong>
                        </div>
                    `);
                }
            });
        }
    } catch (err) {
        console.error("Erro ao renderizar marcadores:", err);
    }
}

// =========================================
// AUTENTICAÇÃO: CADASTRO E LOGIN
// =========================================
async function cadastrarUsuario() {
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;
    const nome = document.getElementById('login-nome').value;

    if (!email || !senha || !nome) {
        alert("Por favor, preencha todos os campos para se cadastrar!");
        return;
    }

    const { data, error } = await supabaseClient.auth.signUp({ email, password: senha });

    if (error) {
        alert("Erro no cadastro: " + error.message);
        return;
    }

    if (data.user) {
        const { error: profileError } = await supabaseClient
            .from('perfis')
            .insert([{ id: data.user.id, nome: nome, reccoins: 0 }]);

        if (profileError) {
            alert("Erro ao criar perfil: " + profileError.message);
        } else {
            alert("Cadastro realizado com sucesso! Mudando para a tela de login...");
            alternarModoAutenticacao('login'); // Volta automaticamente pro modo login após o sucesso
            document.getElementById('login-nome').value = '';
        }
    }
}

async function logarUsuario() {
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;

    if (!email || !senha) {
        alert("Preencha e-mail e senha!");
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });

    if (error) {
        alert("Erro ao entrar: " + error.message);
        return;
    }

    if (data.user) {
        const { data: perfil, error: perfilError } = await supabaseClient
            .from('perfis')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (perfilError) {
            alert("Erro ao carregar perfil.");
            return;
        }

        usuarioLogado = perfil;
        alert(`Bem-vindo, ${usuarioLogado.nome}!`);
        
        document.getElementById('app-bottom-nav').style.display = 'flex';
        navegarPara('tela-mapa', document.getElementById('nav-mapa'));
        
        document.querySelectorAll('.balance-value').forEach(el => el.innerText = usuarioLogado.reccoins);
        const greetingEl = document.getElementById('user-name-greeting');
        if (greetingEl) greetingEl.innerText = `Olá, ${usuarioLogado.nome}!`;
    }
}

// =========================================
// MÓDULO DE RANKING DINÂMICO
// =========================================
async function carregarRanking() {
    const container = document.getElementById('lista-ranking');
    container.innerHTML = `<p style="text-align:center; color:gray;">Carregando pódio...</p>`;

    const { data: usuários, error } = await supabaseClient
        .from('perfis')
        .select('nome, reccoins')
        .order('reccoins', { ascending: false })
        .limit(10);

    if (error) {
        container.innerHTML = `<p style="text-align:center; color:red;">Erro ao carregar ranking.</p>`;
        return;
    }

    container.innerHTML = "";

    usuários.forEach((usuario, index) => {
        const posicao = index + 1;
        let badge = `${posicao}º`;
        let backgroundColor = "#ffffff";
        let borderStyle = "1px solid #f0f0f0";

        if (posicao === 1) { badge = "🥇"; backgroundColor = "#fffdf0"; borderStyle = "2px solid #ffd700"; }
        if (posicao === 2) { badge = "🥈"; backgroundColor = "#f8f9fa"; borderStyle = "2px solid #c0c0c0"; }
        if (posicao === 3) { badge = "🥉"; backgroundColor = "#fdf8f5"; borderStyle = "2px solid #cd7f32"; }

        if (usuarioLogado && usuario.nome === usuarioLogado.nome) {
            borderStyle = "2px dashed #00b36b";
            backgroundColor = "#e6f7ef";
        }

        const linhaHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; background: ${backgroundColor}; padding: 12px 16px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: ${borderStyle};">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="font-size: 1.3rem; font-weight: bold; width: 30px; text-align: center;">${badge}</span>
                    <span style="font-weight: ${usuarioLogado && usuario.nome === usuarioLogado.nome ? '700' : '600'}; color: #333;">
                        ${usuario.nome} ${usuarioLogado && usuario.nome === usuarioLogado.nome ? ' (Você)' : ''}
                    </span>
                </div>
                <span style="font-weight: bold; color: #00b36b;">${usuario.reccoins} <small style="font-size:0.7rem; color:gray;">RC</small></span>
            </div>
        `;
        container.innerHTML += linhaHTML;
    });
}

// =========================================
// ATUALIZAÇÃO DO SALDO E HISTÓRICO REAL
// =========================================
async function processarDescarteValido() {
    if (!usuarioLogado) return;

    const novoSaldo = usuarioLogado.reccoins + 300;

    const { error: updateError } = await supabaseClient
        .from('perfis')
        .update({ reccoins: novoSaldo })
        .eq('id', usuarioLogado.id);

    if (updateError) {
        alert("Erro ao atualizar saldo: " + updateError.message);
        return;
    }

    await supabaseClient
        .from('historico')
        .insert([{
            usuario_id: usuarioLogado.id,
            loja_nome: "Ju Eletrônicos",
            descricao: "Descarte de celular via Código Totem",
            reccoins_alteracao: 300,
            status: "finalizado"
        }]);

    usuarioLogado.reccoins = novoSaldo;
    document.querySelectorAll('.balance-value').forEach(el => el.innerText = usuarioLogado.reccoins);

    alert("🎉 ESPETÁCULO! Código Validado. +300 RecCoins salvos na sua conta!");
    navegarPara('tela-historico', document.getElementById('nav-historico'));
}

// =========================================
// INICIALIZAÇÃO DO APP E LISTENERS
// =========================================
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('app-bottom-nav').style.display = 'flex';
    inicializarMapaReal();
    navegarPara('tela-mapa', document.getElementById('nav-mapa'));

    // Configuração dos botões de ação de login/cadastro
    document.getElementById('btn-entrar').addEventListener('click', logarUsuario);
    document.getElementById('btn-cadastrar').addEventListener('click', cadastrarUsuario);

    // --- ESCUTAS DE ALTERNÂNCIA DE TELA (NOVO) ---
    document.getElementById('toggle-para-cadastro').addEventListener('click', () => alternarModoAutenticacao('cadastro'));
    document.getElementById('toggle-para-login').addEventListener('click', () => alternarModoAutenticacao('login'));

    // Navbar Inferior
    document.getElementById('nav-mapa').addEventListener('click', (e) => navegarPara('tela-mapa', e.currentTarget));
    document.getElementById('nav-lojas').addEventListener('click', (e) => navegarPara('tela-lojas', e.currentTarget));
    document.getElementById('nav-historico').addEventListener('click', (e) => navegarPara('tela-historico', e.currentTarget));
    document.getElementById('nav-scanner').addEventListener('click', (e) => navegarPara('tela-scanner', e.currentTarget));

    // Gatilhos do Ranking
    const greetingBox = document.getElementById('user-name-greeting');
    if (greetingBox) {
        greetingBox.style.cursor = 'pointer';
        greetingBox.addEventListener('click', () => {
            navegarPara('tela-ranking');
            carregarRanking();
        });
    }

    const avatarTrigger = document.getElementById('user-avatar-trigger');
    if (avatarTrigger) {
        avatarTrigger.addEventListener('click', () => {
            navegarPara('tela-ranking');
            carregarRanking();
        });
    }

    document.getElementById('btn-voltar-ranking').addEventListener('click', () => {
        navegarPara('tela-mapa', document.getElementById('nav-mapa'));
    });

    // Confirmação Direta do Código Manual
    document.getElementById('btn-confirmar-codigo').addEventListener('click', () => {
        if (!usuarioLogado) {
            alert("Para realizar o descarte, faça login primeiro!");
            navegarPara('tela-login');
            return;
        }
        const codigo = document.getElementById('scanner-codigo-manual').value.trim().toUpperCase();
        if (codigo === "RECICLA-JU-300") {
            processarDescarteValido();
            document.getElementById('scanner-codigo-manual').value = "";
        } else {
            alert("Código incorreto. Use o código de teste: RECICLA-JU-300");
        }
    });

    // Abas do Histórico
    document.getElementById('btn-pendentes').addEventListener('click', () => {
        document.getElementById('lista-pendentes').style.display = 'flex';
        document.getElementById('lista-finalizados').style.display = 'none';
        document.getElementById('btn-pendentes').classList.add('active');
        document.getElementById('btn-finalizados').classList.remove('active');
    });
    document.getElementById('btn-finalizados').addEventListener('click', () => {
        document.getElementById('lista-finalizados').style.display = 'flex';
        document.getElementById('lista-pendentes').style.display = 'none';
        document.getElementById('btn-finalizados').classList.add('active');
        document.getElementById('btn-pendentes').classList.remove('active');
    });
});