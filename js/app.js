
  let CONFIG = {};
  let APP_VERSION;

  async function carregarConfig() {
    try {

        // 🔥 config SEM versão (regra de ouro)
        const resp = await fetch(`config.json?v=${Date.now()}`);

        if (!resp.ok)
        throw new Error("Erro ao carregar config");

        CONFIG = await resp.json();

        // agora temos a versão
        APP_VERSION = CONFIG.app.versao;

    } catch (e) {

        console.error(e);

        document.body.innerHTML = `
        <div style="
            display:flex;
            height:100vh;
            align-items:center;
            justify-content:center;
            font-family:Montserrat;
            flex-direction:column;
            gap:12px;
            text-align:center;
        ">
            <h2>⚠️ Não foi possível carregar o site.</h2>
            <button onclick="location.reload()">
            🔄 Tentar novamente
            </button>
        </div>
        `;
    }
  }

function gerarQrFixo() {

  const payload = CONFIG?.pix?.payload;

  if (!payload){
    console.error("PIX payload não encontrado no config.json");
    return;
  }

  const canvas = document.getElementById("qrcode");

  if(!canvas){
    console.error("Canvas do QR não encontrado no HTML");
    return;
  }

  // limpa antes (evita bug em alguns browsers)
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);

  QRCode.toCanvas(canvas, payload, {
    width: 260,
    margin: 2
  });

}


function copiarPix() {

  const payload = CONFIG.pix?.payload;

  if (!payload) {
    alert("⚠️ PIX ainda não carregado.");
    return;
  }

  navigator.clipboard.writeText(payload).then(() => {

    const msg = document.getElementById('msgCopiado');
    msg.style.display = 'block';

    setTimeout(() => {
      msg.style.display = 'none';
    }, 2500);

  });

}


function abrirPix(){

  const payload = CONFIG.pix?.payload;

  if (!payload) return;

  window.location.href =
    `https://pix.bcb.gov.br/qr/${encodeURIComponent(payload)}`;

}

function iniciarSite() {
    aplicarBranding(); // cores primeiro
    aplicarLogo();
    aplicarConfig();
    gerarQrFixo();
    aplicarSEO();
  }

function aplicarLogo() {

    const logo = document.getElementById("logoSite");
    if (!logo) return;

    logo.src = CONFIG.branding.logo;
    logo.alt = CONFIG.branding.logo_alt || CONFIG.igreja.nome;

    logo.onerror = () => {
      logo.src = "img/logoA.png";
    };

  }


  function aplicarConfig() {

    document.querySelectorAll("[data-config]")
      .forEach(el => {

        const caminho = el.dataset.config.split(".");
        const format  = el.dataset.format;

        let valor = CONFIG;

        caminho.forEach(chave => {
          valor = valor?.[chave];
        });

        if (valor === undefined || valor === null) return;


        /* =========================
          FORMATADORES
        ========================= */

        // 🔥 WHATSAPP
        if (format === "whatsapp") {

          let numero = valor.replace(/\D/g,'');

          if (numero.length === 11) {
            numero = "55" + numero;
          }

          const msg = encodeURIComponent(
            CONFIG.contato?.mensagem || ""
          );

          el.href = `https://wa.me/${numero}?text=${msg}`;
          return;
        }


        // 🔥 PIX (remove +55 visualmente)
        if (format === "pix") {

          let chave = valor;

          if (chave.startsWith("+55")) {
            chave = chave.slice(3);
          }

          el.innerText = chave;
          return;
        }


        /* =========================
          ELEMENTOS ESPECIAIS
        ========================= */

        // IMG
        if (el.tagName === "IMG") {

          el.src = valor;

          // ALT dinâmico
          if (el.dataset.alt) {

            const altPath = el.dataset.alt.split(".");
            let altValor = CONFIG;

            altPath.forEach(chave => {
              altValor = altValor?.[chave];
            });

            if (altValor) {
              el.alt = altValor;
            }
          }

          return;
        }


        // LINK
        if (el.tagName === "A") {
          el.href = valor;
          return;
        }


        /* =========================
          PADRÃO → TEXTO
        ========================= */

        el.innerText = valor;

      });

  }


  function aplicarSEO() {

    const nome = CONFIG.app.nome_completo;
    const igreja = CONFIG.igreja.nome;
    const subtitulo = CONFIG.igreja.subtitulo;

    const descricao =
      `${igreja} - ${subtitulo}. Veja horários de cultos, agenda e localização.`;

    document.title = nome;

    document
      .querySelector("meta[name='description']")
      .setAttribute("content", descricao);

    document
      .querySelector("meta[property='og:title']")
      .setAttribute("content", nome);

    document
      .querySelector("meta[property='og:description']")
      .setAttribute("content", descricao);

    document
      .querySelector("meta[property='og:url']")
      .setAttribute("content", CONFIG.site.url);

    document
      .querySelector("meta[property='og:image']")
      .setAttribute("content",
        CONFIG.site.url + "/" + CONFIG.site.imagem);

    document
      .querySelector("meta[name='theme-color']")
      .setAttribute("content",
      CONFIG.tema?.cor_primaria || "#0b3c5d"
      );

  }

  function aplicarBranding() {

    const tema = CONFIG.tema;

    if (!tema) {
      console.error("Tema não encontrado!");
      return;
    }

    Object.entries(tema).forEach(([key, value]) => {

      document.documentElement.style
       .setProperty(`--${key.replaceAll('_','-')}`, value);

    });

    document.documentElement.style
     .setProperty('--cor-primaria', CONFIG.tema.cor_primaria);

    document
      .querySelector("link[rel='icon']")
      .setAttribute("href", CONFIG.branding.favicon);

    document
      .querySelector("link[rel='apple-touch-icon']")
      .setAttribute("href", CONFIG.branding.favicon);

    document
      .querySelector("meta[name='apple-mobile-web-app-title']")
      .setAttribute("content", CONFIG.app.nome_completo);

  }

  let VERSICULOS_BASE = [];
  let indiceVersiculo = 0;

  /* 🔹 carrega versiculos.json */
  async function carregarVersiculos() {
    try {
      const resp = await fetch(`versiculos.json?v=${APP_VERSION || Date.now()}`);
      const data = await resp.json();

      VERSICULOS_BASE = data.versiculos || [];

      // índice salvo (não repete até acabar)
      indiceVersiculo = parseInt(
        localStorage.getItem("idxVersiculo") || "0"
      );

      carregarVersiculo(); // carrega o primeiro

    } catch (e) {
      console.error("Erro ao carregar versículos:", e);
    }
  }

  function versiculoDoDia() {
    if (VERSICULOS_BASE.length === 0) return null;

    const hoje = new Date();
    return VERSICULOS_BASE[
      hoje.getDate() % VERSICULOS_BASE.length
    ];
  }

  let versiculoAtual = "";
  let referenciaAtual = "";

  async function carregarVersiculo(forcarNovo = false) {
    const ref = forcarNovo
    ? VERSICULOS_BASE[Math.floor(Math.random() * VERSICULOS_BASE.length)]
    : versiculoDoDia();

    const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=almeida`;

    try {
      const resp = await fetch(url);
      const data = await resp.json();

      versiculoAtual = data.text.trim();
      referenciaAtual = data.reference;

      document.querySelector(".versiculo-texto").innerText = versiculoAtual;
      document.querySelector(".versiculo-ref").innerText = referenciaAtual;

    } catch {
      document.querySelector(".versiculo-texto").innerText =
        "A Palavra do Senhor permanece para sempre.";
      document.querySelector(".versiculo-ref").innerText =
        "1 Pedro 1:25";
    }

  }

  function atualizarVersiculo() {
    if (VERSICULOS_BASE.length === 0) return;

    const ref =
      VERSICULOS_BASE[indiceVersiculo % VERSICULOS_BASE.length];

    indiceVersiculo++;
    localStorage.setItem("idxVersiculo", indiceVersiculo);

    carregarVersiculoPorReferencia(ref);
  }



  async function carregarVersiculoPorReferencia(ref) {
    const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=almeida`;

    try {
      const resp = await fetch(url);
      const data = await resp.json();

      versiculoAtual = data.text.trim();
      referenciaAtual = data.reference;

      document.querySelector(".versiculo-texto").innerText = versiculoAtual;
      document.querySelector(".versiculo-ref").innerText = referenciaAtual;

    } catch {
      document.querySelector(".versiculo-texto").innerText =
        "A Palavra do Senhor permanece para sempre.";
      document.querySelector(".versiculo-ref").innerText =
        "1 Pedro 1:25";
    }
  }

  function curtirVersiculo() {
  if (!versiculoAtual) return;

  const curtidos = JSON.parse(localStorage.getItem("versiculosCurtidos") || "[]");

  curtidos.push({
    texto: versiculoAtual,
    referencia: referenciaAtual,
    data: new Date().toISOString()
  });

  localStorage.setItem("versiculosCurtidos", JSON.stringify(curtidos));

  // 🔥 feedback visual
  document.querySelector(".versiculo-acoes button:nth-child(2)")
    .classList.add("curtido");

  alert("❤️ Versículo salvo!");
  }

  function compartilharVersiculo() {
  if (!versiculoAtual) return;

  const texto = `📖 *Versículo do Dia*\n\n"${versiculoAtual}"\n\n📌 ${referenciaAtual}`;
  const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;

  window.open(url, "_blank");
  }


  let payloadPixGerado = '';
  
  
  function toggleLegenda() {
    const legenda = document.getElementById("agendaLegenda");
    const btn = document.querySelector(".btn-legenda-toggle");

    legenda.classList.toggle("show");

    if (legenda.classList.contains("show")) {
      btn.innerText = "ℹ️ Ocultar legenda";
    } else {
      btn.innerText = "ℹ️ Mostrar legenda";
    }
  }

  
  function formatarValor(campo) {
    let v = campo.value.replace(/\D/g, '');
    v = (v / 100).toFixed(2).replace('.', ',');
    campo.value = v;

    const valorNum = parseFloat(v.replace(',', '.'));
    const btnGerar = document.getElementById('btnPix');

    if (valorNum >= 1) {
      btnGerar.disabled = false;
      document.getElementById('valorResumo').innerText =
        'Valor informado: R$ ' + v;
    } else {
      btnGerar.disabled = true;
      document.getElementById('valorResumo').innerText = '';

      // 🔥 valor inválido → limpa tudo
      limparPix();
    }
  }


  function toggleMenu() {
    document.getElementById('navLinks').classList.toggle('show');
  }

  function fecharMenu() {
    document.getElementById('navLinks').classList.remove('show');
  }

  function crc16(payload) {
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : (crc << 1);
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  function montarCampo(id, valor) {
    return id + valor.length.toString().padStart(2, "0") + valor;
  }

  function normalizarTexto(texto) {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .toUpperCase();
  }

  function normalizarChavePix(chave) {

      chave = chave.trim();

      // se já tem +, mantém
      if (chave.startsWith("+")) {
          return chave;
      }

      // remove tudo que não for número
      let limpa = chave.replace(/\D/g, '');

      // telefone brasileiro
      if (limpa.length === 11) {
          return "+55" + limpa;
      }

      return limpa;
  }

  function chavePixParaExibicao(chave){

      if(!chave) return "";

      // remove +55 apenas se for telefone
      if(chave.startsWith("+55")){
          return chave.slice(3);
      }

      return chave;
  }

  function gerarPix() {

      limparPix();

      const valor = parseFloat(
          document.getElementById('valorPix').value.replace(',', '.')
      );

      if (!valor || valor < 1) return;

      const chave = normalizarChavePix(CONFIG.pix.chave);

      const nome = normalizarTexto(CONFIG.pix.nome).substring(0,25);
      const cidade = normalizarTexto(CONFIG.pix.cidade).substring(0,15);

      const gui = montarCampo("00", "BR.GOV.BCB.PIX");
      const chaveCampo = montarCampo("01", chave);
      const merchantAccount = montarCampo("26", gui + chaveCampo);

      const payloadSemCRC =
          "000201" +
          "010211" +
          merchantAccount +
          "52040000" +
          "5303986" +
          montarCampo("54", valor.toFixed(2)) +
          "5802BR" +
          montarCampo("59", nome) +
          montarCampo("60", cidade) +
          "6304";

      const payload = payloadSemCRC + crc16(payloadSemCRC);

      payloadPixGerado = payload;

      document.getElementById('btnCopiarPix').disabled = false;

      QRCode.toCanvas(
          document.getElementById('qrcode'),
          payload,
          { width: 240 }
      );
  }


  function limparPix() {
    payloadPixGerado = '';

    // limpa canvas do QR
    const canvas = document.getElementById('qrcode');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // desabilita copiar
    document.getElementById('btnCopiarPix').disabled = true;
  }
  /* =========================
    AGENDA DE CULTOS
  ========================= */

  function iconeTipo(tipo) {
      switch (tipo) {
        case "primicias": return "🌾";        // 1º domingo
        case "missoes":   return "🌍";        // 2º domingo
        case "familia":   return "👨‍👩‍👧‍👦";        // 3º domingo
        case "gratidao":  return "🙌";        // 4º domingo
        case "ebd":       return "📖";        // ensino
        case "culto":     return "🙏";        // culto geral
        case "oracao":    return "🔥";        // terça – círculo de oração
        case "doutrina":  return "📘";        // quinta – doutrina
        case "vigilia":   return "🌙";        // vigília
        case "especial":  return "✝️";        // santa ceia / eventos especiais
        case "senhoras":  return "🌸";        // Culto de Senhoras
        case "jovens":    return "🎸";        // Culto dos Jovens
        case "criancas":  return "🧸";        // Culto das Crianças
        case "humilhacao": return "🕊️";       // Dia da Humilhação (4º sábado)
        case "consagracao": return "☀️";      // Culto de Consagração
        case "sede": return "🛡️";             // Sede / Igreja Matriz

        default:          return "📅";        // culto comum
      }
  }

  function eventosDoDia(dataStr) {
      const ev = cultos[dataStr];
      if (!ev) return [];
      return Array.isArray(ev) ? ev : [ev];
  }

  let dataAtual = new Date();

  function renderAgenda() {
    const grid = document.getElementById('agendaGrid');
    const titulo = document.getElementById('mesAno');

    grid.innerHTML = '';

    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth();

    const nomeMes = dataAtual.toLocaleString('pt-BR', { month: 'long' });
    titulo.innerText =
      nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1) + ' ' + ano;

    const ultimoDia = new Date(ano, mes + 1, 0).getDate();

    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;

    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();

    // espaços vazios
    for (let i = 0; i < primeiroDiaSemana; i++) {
      const vazio = document.createElement('div');
      vazio.className = 'agenda-dia';
      vazio.style.visibility = 'hidden';
      grid.appendChild(vazio);
    }

    for (let dia = 1; dia <= ultimoDia; dia++) {

      const dataStr = `${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
      const div = document.createElement('div');
      div.className = 'agenda-dia';

      const diaSemana = new Date(ano, mes, dia).getDay();
      const eventos = eventosDoDia(dataStr);
      const qtd = eventos.length;

      // hoje
      if (dataStr === hojeStr) {
        div.classList.add('hoje');
      }

      if (qtd === 0) {
        // 🎨 sábado / domingo sem evento
        if (diaSemana === 6) div.style.background = '#dbeafe';
        if (diaSemana === 0) div.style.background = '#fde2e2';

        div.innerText = dia;
      } 
      else {
        div.classList.add('culto');

        if (qtd === 1) {
          div.innerHTML = `
            ${dia}
            <small>${iconeTipo(eventos[0].tipo)}</small>
          `;
        }
        else if (qtd === 2) {
          div.innerHTML = `
            ${dia}
            <small>
              ${iconeTipo(eventos[0].tipo)}<br>
              ${iconeTipo(eventos[1].tipo)}
            </small>
          `;
        }
        else {
          div.innerHTML = `
            ${dia}
            <small>🔅 ${qtd}</small>
          `;
        }

        div.style.cursor = 'pointer';
        div.onclick = () => abrirModal(dataStr);
      }

      grid.appendChild(div);
      
    }
     atualizarLegendaAtiva();
  }


  function atualizarLegendaAtiva() {

      const tiposDoMes = new Set();

      const ano = dataAtual.getFullYear();
      const mes = dataAtual.getMonth() + 1;

      Object.keys(cultos).forEach(data => {
        const [a, m] = data.split('-').map(Number);

        if (a === ano && m === mes) {
          const eventos = eventosDoDia(data);
          eventos.forEach(ev => {
            if (ev.tipo) tiposDoMes.add(ev.tipo);
          });
        }

      });

      document.querySelectorAll('.agenda-legenda span').forEach(span => {
        const tipo = span.dataset.tipo;
        span.classList.toggle('ativo', tiposDoMes.has(tipo));
      });

  }

  function mesAnterior() {
    dataAtual.setMonth(dataAtual.getMonth() - 1);
    renderAgenda();
  }

  function mesSeguinte() {
    dataAtual.setMonth(dataAtual.getMonth() + 1);
    renderAgenda();
  }

  function renderAgendaSemanal() {
      const box = document.getElementById("agendaSemanal");
      if (!box) return;

      box.innerHTML = "";

      const hoje = new Date();
      hoje.setHours(0,0,0,0);

      for (let i = 0; i < 7; i++) {
        const d = new Date(hoje);
        d.setDate(hoje.getDate() + i);

        const ano = d.getFullYear();
        const mes = String(d.getMonth() + 1).padStart(2,'0');
        const dia = String(d.getDate()).padStart(2,'0');
        const dataStr = `${ano}-${mes}-${dia}`;

        const nomeDia = d.toLocaleDateString("pt-BR", { weekday: "long" });
        const dataCurta = d.toLocaleDateString("pt-BR");

        const eventos = eventosDoDia(dataStr);

        const card = document.createElement("div");
        card.className = "semana-card";

        if (eventos.length > 0) {

          const listaEventos = eventos.map(ev => `
            <small>
              ${iconeTipo(ev.tipo)} ${ev.titulo} – ${ev.hora}
            </small>
          `).join('');

          card.innerHTML = `
            📅 ${nomeDia}
            <small>${dataCurta}</small>
            ${listaEventos}
            <span class="tag">Culto</span>
          `;

        } else {

          card.innerHTML = `
            📆 ${nomeDia}
            <small>${dataCurta}</small>
            <small>Sem evento</small>
            <span class="tag">Agenda livre</span>
          `;

          card.style.opacity = "0.85";
        }

        box.appendChild(card);
      }
  }


  function fecharModal() {
    document.getElementById("modalEvento").style.display = "none";
  }

  function clicouForaModal(e) {
    // fecha se clicar fora da caixa branca
    if (e.target.id === "modalEvento") {
        fecharModal();
    }
  }

  function abrirModal(data) {
    
        const eventos = eventosDoDia(data);
        if (!eventos || eventos.length === 0) {
        console.warn("Nenhum evento encontrado para:", data);
        return;
        }

      if (eventos.length === 0) return;

      const modal  = document.getElementById("modalEvento");
      const titulo = document.getElementById("modalTitulo");
      const dataEl = document.getElementById("modalData");
      const box    = document.getElementById("modalListaEventos");

      // 🔹 limpa estado anterior
      box.innerHTML = "";
      modal.classList.remove("modal-unico");

      // 🔹 data formatada
      dataEl.innerText = `📅 ${data.split('-').reverse().join('/')}`;

      // ==========================
      // 🔹 CASO 1: APENAS UM EVENTO
      // ==========================
      if (eventos.length === 1) {

        const ev = eventos[0];

        modal.classList.add("modal-unico");
        titulo.innerText = `${iconeTipo(ev.tipo)} ${ev.titulo}`;

        box.innerHTML = `
          <p>⏰ <strong>Horário:</strong> ${ev.hora}</p>
            <p>🎤 <strong>Dirigente:</strong> ${ev.ministrante || ev.dirigente || "A definir"}</p>

          ${ev.tema ? `<p class="modal-tema">📖 <strong>Tema:</strong> ${ev.tema}</p>` : ``}
          ${ev.observacao ? `<p class="modal-obs">📝 ${ev.observacao}</p>` : ``}
        `;

      }

      // ==========================
      // 🔹 CASO 2: MÚLTIPLOS EVENTOS
      // ==========================
      else {

        titulo.innerText = "📅 Eventos do Dia";

        eventos.forEach(ev => {
          const div = document.createElement("div");
          div.className = "modal-evento-item";

          div.innerHTML = `
            <h4>${iconeTipo(ev.tipo)} ${ev.titulo}</h4>
            <p>⏰ ${ev.hora}</p>
            <p>🎤 ${ev.ministrante || ev.dirigente || "A definir"}</p>
            ${ev.tema ? `<p class="modal-tema">📖 ${ev.tema}</p>` : ``}
            ${ev.observacao ? `<p class="modal-obs">📝 ${ev.observacao}</p>` : ``}
          `;

          box.appendChild(div);
        });
      }

      modal.style.display = "flex";
  }

  let cultos = {};

  async function carregarCultos() {
    try {
        const resp = await fetch(`cultos.json?v=${APP_VERSION || Date.now()}`);
        if (!resp.ok) throw new Error('Erro ao carregar agenda');

        cultos = await resp.json();

        renderAgenda();
        renderAgendaSemanal();

    } catch (e) {
        console.error('Erro ao carregar cultos:', e);
    }
  }

  function carregarMapa() {
    const container = document.getElementById("mapaContainer");

    container.innerHTML = `
      <iframe
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3980.7212173127655!2d-38.55710292415437!3d-3.8698593439099076!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x7c7517232d23c47%3A0x6c973756dbaefd97!2sADTC%20Bom%20Retiro!5e0!3m2!1spt-BR!2sbr"
        style="width:100%;height:320px;border:0;"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        allowfullscreen
        onerror="mapaErro()">
      </iframe>
    `;
  }

  function mapaErro() {
    const container = document.getElementById("mapaContainer");

    container.innerHTML = `
      <div style="padding:30px;text-align:center;">
        <p>⚠️ Não foi possível carregar o mapa.</p>
        <button onclick="carregarMapa()" style="
          padding:10px 16px;
          border:none;
          border-radius:6px;
          background:#0b3c5d;
          color:#fff;
          font-weight:600;
          cursor:pointer;">
          🔄 Atualizar mapa
        </button>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", async () => {

    const ano = document.getElementById("ano");
    if (ano) {
        ano.innerText = new Date().getFullYear();
    }
    

    // 🔥 carrega TUDO primeiro
    await carregarConfig();

    await Promise.all([
        carregarVersiculos(),
        carregarCultos()
    ]);

    // 🔥 só agora inicia o site
    iniciarSite();

    // legenda mobile
    const legenda = document.getElementById("agendaLegenda");
    const btnLegenda = document.querySelector(".btn-legenda-toggle");

    if (window.innerWidth <= 768) {
        legenda.classList.remove("show");
        btnLegenda.innerText = "ℹ️ Mostrar legenda";
    }

    carregarMapa();

   });







