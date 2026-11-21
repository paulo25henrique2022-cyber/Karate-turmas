'use strict';
// ================= dados =================
const FAIXAS = [
  ['Azul clara', '#8fd3ff'], ['Amarela', '#ffd83a'], ['Laranja', '#ff8c1a'], ['Verde', '#2fae4a'],
  ['Azul escuro', '#1d3f9a'], ['Roxa', '#7a3aa8'], ['Marrom', '#7a4a22'], ['Marrom 1', '#6a3c18'], ['Marrom 2', '#5a300f']];
const TURMAS = { juvenil: 'Turma Juvenil', infantil: 'Turma Infantil' };
const CHAVE = 'karate-dados-v1';

function padrao() {
  return {
    aulaHoras: 1.5,
    faixas: FAIXAS.map(([nome]) => ({ nome, horas: 117 })),
    turmas: { juvenil: { alunos: [], ultimaChamada: '' }, infantil: { alunos: [], ultimaChamada: '' } }
  };
}
let D;
try { D = JSON.parse(localStorage.getItem(CHAVE)) || padrao(); } catch { D = padrao(); }
function salvar() { localStorage.setItem(CHAVE, JSON.stringify(D)); }

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const dataBR = iso => iso ? iso.split('-').reverse().join('/') : '';
const diasDesde = iso => Math.floor((new Date(hoje() + 'T12:00') - new Date(iso + 'T12:00')) / 864e5);
const fmtH = h => { const t = Math.round(h * 60), hh = Math.floor(t / 60), mm = t % 60; return mm ? `${hh}h${String(mm).padStart(2, '0')}` : `${hh}h`; };
const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const corFaixa = i => FAIXAS[i] ? FAIXAS[i][1] : '#888';
const nomeFaixa = i => FAIXAS[i] ? FAIXAS[i][0] : '?';

function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, ms); }
function abrirModal(html) { $('#modalCaixa').innerHTML = html; $('#modal').hidden = false; }
function fecharModal() { $('#modal').hidden = true; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') fecharModal(); });

function situacao(a) {
  const precisa = D.faixas[a.faixa]?.horas ?? 117;
  const falta = Math.max(0, precisa - a.horas);
  return { precisa, falta, aulas: Math.ceil(falta / D.aulaHoras), pronto: a.horas >= precisa && a.faixa < FAIXAS.length - 1, pct: Math.min(100, a.horas / precisa * 100) };
}
function mensal(a) {
  if (!a.pago) return { st: 'nunca', txt: 'Nenhum pagamento registrado', dias: 0 };
  const d = diasDesde(a.pago);
  if (d > 30) return { st: 'pendente', txt: `Pendente há ${d - 30} dia(s)`, dias: d };
  return { st: 'ok', txt: `Pago — vence em ${30 - d} dia(s)`, dias: d };
}
const pendentes = t => D.turmas[t].alunos.filter(a => mensal(a).st === 'pendente').length;

// ================= navegação =================
function ir(h) { location.hash = h; }
window.addEventListener('hashchange', render);
function render() {
  const [tela, turma] = location.hash.slice(1).split('/');
  const app = $('#app'); fecharModal();
  const T = TURMAS[turma] ? turma : null;
  if (tela === 'menu' && T) return telaMenu(app, T);
  if (tela === 'freq' && T) return telaFreq(app, T);
  if (tela === 'chamada' && T) return telaChamada(app, T);
  if (tela === 'avisos' && T) return telaAvisos(app, T);
  if (tela === 'mensal' && T) return telaMensal(app, T);
  telaInicio(app);
}
const topo = (titulo, sub, volta) => `<div class="topo"><button class="voltar" onclick="ir('${volta}')">‹</button><h1>${titulo}<span class="sub">${sub}</span></h1></div>`;
const placa = (txt, ic, acao, badge) => `<button class="placa" onclick="${acao}"><span class="ic">${ic}</span>${txt}${badge ? `<span class="badge">${badge}</span>` : ''}</button>`;

// ---------- início ----------
function telaInicio(app) {
  app.innerHTML = `<div class="tela inicio" style="background-image:url(img/inicio.jpg)"><div class="centro">
    <div class="titulo">空手道</div>
    <button class="placa" onclick="ir('menu/juvenil')"><span class="tigre"></span>Turma Juvenil<span class="tigre"></span></button>
    <button class="placa" onclick="ir('menu/infantil')"><span class="tigre"></span>Turma Infantil<span class="tigre"></span></button>
  </div></div>`;
}

// ---------- menus ----------
function telaMenu(app, t) {
  const prontos = D.turmas[t].alunos.filter(a => situacao(a).pronto).length;
  const pend = t === 'infantil' ? pendentes(t) : 0;
  app.innerHTML = `<div class="tela" style="background-image:url(img/${t}.jpg)">
    ${topo(TURMAS[t], 'Escolha uma opção', 'inicio')}
    <div class="centro" style="min-height:calc(100% - 60px)">
      ${placa('Frequência', '📊', `ir('freq/${t}')`, prontos ? `${prontos} p/ graduar` : '')}
      ${placa('Chamada', '📋', `ir('chamada/${t}')`)}
      ${placa('Avisos', '📢', `ir('avisos/${t}')`)}
      ${t === 'infantil' ? placa('Mensalidades', '💰', `ir('mensal/${t}')`, pend ? `${pend} pendente${pend > 1 ? 's' : ''}` : '') : ''}
    </div></div>`;
}

// ---------- frequência ----------
function telaFreq(app, t) {
  const alunos = D.turmas[t].alunos;
  const prontos = alunos.filter(a => situacao(a).pronto);
  let html = `<div class="tela fundo-escuro" style="background-image:url(img/dojo.jpg)">${topo('Frequência', TURMAS[t], 'menu/' + t)}
    <div class="linha" style="margin-bottom:12px"><button class="btn grow" onclick="editarAluno('${t}')">+ Aluno</button><button class="btn" onclick="editarFaixas()">⚙ Faixas e horas</button></div>`;
  if (prontos.length) html += `<div class="aviso-topo">🥋 <b>${prontos.length} aluno(s) já completaram o tempo para graduar:</b> ${prontos.map(a => esc(a.nome)).join(', ')}</div>`;
  if (!alunos.length) html += `<div class="card vazio">Nenhum aluno cadastrado.<br>Toque em <b>+ Aluno</b>. Os alunos cadastrados aqui entram automaticamente na chamada.</div>`;
  FAIXAS.forEach(([nome, cor], fi) => {
    const lista = alunos.filter(a => a.faixa === fi).sort((a, b) => a.nome.localeCompare(b.nome));
    if (!lista.length) return;
    html += `<div class="grupo"><span class="faixa" style="background:${cor}"></span>${nome} <span class="pq">(${lista.length}) — exige ${fmtH(D.faixas[fi].horas)}</span></div>`;
    lista.forEach(a => {
      const s = situacao(a);
      html += `<div class="card ${s.pronto ? 'pronto' : ''}" onclick="editarAluno('${t}','${a.id}')">
        <div class="linha"><span class="nome grow">${esc(a.nome)}</span>${s.pronto ? '<span class="tag ok">PODE GRADUAR</span>' : ''}</div>
        <div class="barra"><b style="width:${s.pct}%"></b></div>
        <div class="pq">${fmtH(a.horas)} de ${fmtH(s.precisa)} · ${s.pronto ? 'tempo completo ✔' : fi === FAIXAS.length - 1 && a.horas >= s.precisa ? 'última faixa da lista' : `faltam ${fmtH(s.falta)} (≈ ${s.aulas} aula${s.aulas === 1 ? '' : 's'})`}</div></div>`;
    });
  });
  app.innerHTML = html + '</div>';
}

function editarAluno(t, id) {
  const a = id ? D.turmas[t].alunos.find(x => x.id === id) : null;
  abrirModal(`<h2>${a ? 'Editar aluno' : 'Novo aluno'}</h2>
    <label class="campo">Nome<input id="fNome" value="${esc(a?.nome)}" placeholder="Nome do aluno"></label>
    <label class="campo">Faixa atual<select id="fFaixa">${FAIXAS.map(([n], i) => `<option value="${i}" ${a?.faixa === i ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="campo">Horas de treino já feitas nesta faixa (pode ajustar à mão)<input id="fHoras" type="number" step="0.5" min="0" inputmode="decimal" value="${a ? a.horas : 0}"></label>
    ${t === 'infantil' ? `<label class="campo">Último pagamento da mensalidade<input id="fPago" type="date" value="${a?.pago || ''}"></label>` : ''}
    <div class="linha" style="margin-top:6px"><button class="btn verde grow" onclick="salvarAluno('${t}','${id || ''}')">Salvar</button><button class="btn" onclick="fecharModal()">Cancelar</button></div>
    ${a ? `<div class="linha" style="margin-top:14px">
      ${a.faixa < FAIXAS.length - 1 ? `<button class="btn grow" onclick="graduar('${t}','${a.id}')">🥋 Graduar para ${nomeFaixa(a.faixa + 1)}</button>` : ''}
      <button class="btn verm" onclick="excluirAluno('${t}','${a.id}')">Excluir</button></div>` : ''}`);
  if (!a) setTimeout(() => $('#fNome').focus(), 50);
}
function salvarAluno(t, id) {
  const nome = $('#fNome').value.trim();
  if (!nome) return toast('Digite o nome do aluno');
  const dados = { nome, faixa: +$('#fFaixa').value, horas: Math.max(0, parseFloat(String($('#fHoras').value).replace(',', '.')) || 0) };
  if ($('#fPago')) dados.pago = $('#fPago').value || null;
  const lista = D.turmas[t].alunos;
  if (id) Object.assign(lista.find(x => x.id === id), dados);
  else lista.push({ id: novoId(), pago: null, ...dados });
  salvar(); render(); toast('Salvo');
}
function graduar(t, id) {
  const a = D.turmas[t].alunos.find(x => x.id === id);
  if (!confirm(`Graduar ${a.nome} para a faixa ${nomeFaixa(a.faixa + 1)}? As horas voltam para zero.`)) return;
  a.faixa++; a.horas = 0; salvar(); render(); toast(`Parabéns, ${a.nome}! 🥋`);
}
function excluirAluno(t, id) {
  const a = D.turmas[t].alunos.find(x => x.id === id);
  if (!confirm(`Excluir ${a.nome}? Isso não pode ser desfeito.`)) return;
  D.turmas[t].alunos = D.turmas[t].alunos.filter(x => x.id !== id); salvar(); render();
}
function editarFaixas() {
  abrirModal(`<h2>Faixas e horas</h2><p class="pq">Horas de treino que o aluno precisa cumprir <b>em cada faixa</b> para poder graduar para a próxima.</p>
    <div class="faixas-ed">${D.faixas.map((f, i) => `<div class="linha"><span class="faixa" style="background:${corFaixa(i)}"></span><span class="grow">${f.nome}</span><input id="fx${i}" type="number" min="0" step="0.5" inputmode="decimal" value="${f.horas}"> h</div>`).join('')}</div>
    <label class="campo" style="margin-top:12px">Duração de cada aula (horas)<input id="fxAula" type="number" min="0.25" step="0.25" inputmode="decimal" value="${D.aulaHoras}"></label>
    <p class="pq">Referência: 3 aulas de 1h30 por semana durante 6 meses ≈ 117 h.</p>
    <div class="linha"><button class="btn verde grow" onclick="salvarFaixas()">Salvar</button><button class="btn" onclick="fecharModal()">Cancelar</button></div>
    <h2 style="margin-top:22px">Cópia de segurança</h2>
    <p class="pq">Os dados ficam só neste celular. Faça uma cópia de vez em quando e guarde no WhatsApp ou no Drive.</p>
    <div class="linha"><button class="btn grow" onclick="backup()">💾 Fazer cópia</button><label class="btn grow" style="text-align:center">📂 Restaurar<input type="file" accept=".json,application/json" hidden onchange="restaurar(this.files[0])"></label></div>`);
}
function salvarFaixas() {
  D.faixas.forEach((f, i) => f.horas = Math.max(0, parseFloat(String($('#fx' + i).value).replace(',', '.')) || 0));
  D.aulaHoras = Math.max(0.25, parseFloat(String($('#fxAula').value).replace(',', '.')) || 1.5);
  salvar(); render(); toast('Faixas atualizadas');
}
async function backup() {
  const f = new File([JSON.stringify(D)], `karate-backup-${hoje()}.json`, { type: 'application/json' });
  await compartilharArquivo(f, 'Cópia de segurança – Karatê');
}
function restaurar(arq) {
  if (!arq) return;
  arq.text().then(txt => {
    const n = JSON.parse(txt);
    if (!n.turmas || !n.faixas) throw 0;
    if (!confirm('Substituir todos os dados atuais por esta cópia?')) return;
    D = n; salvar(); render(); toast('Dados restaurados');
  }).catch(() => toast('Arquivo inválido'));
}

// ---------- chamada ----------
let marcas = {};
function telaChamada(app, t) {
  const alunos = [...D.turmas[t].alunos].sort((a, b) => a.nome.localeCompare(b.nome));
  const feita = D.turmas[t].ultimaChamada === hoje();
  let html = `<div class="tela fundo-escuro" style="background-image:url(img/dojo.jpg)">${topo('Chamada', `${TURMAS[t]} · ${dataBR(hoje())}`, 'menu/' + t)}`;
  if (feita) html += `<div class="aviso-topo">✔ A chamada de hoje já foi finalizada. Se fizer de novo, as horas serão somadas outra vez.</div>`;
  if (!alunos.length) html += `<div class="card vazio">Nenhum aluno na turma.<br>Cadastre os alunos em <b>Frequência</b> e eles aparecem aqui automaticamente.</div>`;
  else {
    html += `<div class="linha" style="margin-bottom:10px"><button class="btn grow" onclick="todos('${t}','p')">Todos presentes</button><button class="btn grow" onclick="todos('${t}','')">Limpar</button></div>`;
    alunos.forEach(a => {
      const m = marcas[a.id] || '';
      html += `<div class="card linha"><span class="faixa" style="background:${corFaixa(a.faixa)}"></span><span class="nome grow">${esc(a.nome)}</span>
        <div class="pa"><button class="p ${m === 'p' ? 'on' : ''}" onclick="marcar('${a.id}','p')">P</button><button class="a ${m === 'a' ? 'on' : ''}" onclick="marcar('${a.id}','a')">F</button></div></div>`;
    });
    const p = alunos.filter(a => marcas[a.id] === 'p').length, f = alunos.filter(a => marcas[a.id] === 'a').length;
    html += `<p class="pq" style="text-align:center">Presentes: <b>${p}</b> · Faltas: <b>${f}</b> · Sem marcar: <b>${alunos.length - p - f}</b></p>
      <button class="btn verde cheio" onclick="finalizar('${t}')">✔ Finalizar e gerar PDF</button>`;
  }
  app.innerHTML = html + '</div>';
}
function marcar(id, v) { marcas[id] = marcas[id] === v ? '' : v; const y = $('.tela').scrollTop; render(); $('.tela').scrollTop = y; }
function todos(t, v) { D.turmas[t].alunos.forEach(a => marcas[a.id] = v); render(); }
async function finalizar(t) {
  const alunos = [...D.turmas[t].alunos].sort((a, b) => a.nome.localeCompare(b.nome));
  const sem = alunos.filter(a => !marcas[a.id]);
  if (sem.length && !confirm(`${sem.length} aluno(s) sem marcação serão registrados como FALTA. Continuar?`)) return;
  if (D.turmas[t].ultimaChamada === hoje() && !confirm('A chamada de hoje já foi feita. Somar as horas de novo?')) return;
  const novosProntos = [];
  alunos.forEach(a => {
    if (marcas[a.id] === 'p') {
      const antes = situacao(a).pronto;
      a.horas = Math.round((a.horas + D.aulaHoras) * 100) / 100;
      if (!antes && situacao(a).pronto) novosProntos.push(a.nome);
    }
  });
  D.turmas[t].ultimaChamada = hoje(); salvar();
  const pdf = pdfChamada(t, alunos);
  marcas = {}; render();
  if (novosProntos.length) alert(`🥋 Completaram o tempo para graduar:\n\n${novosProntos.join('\n')}`);
  await compartilharArquivo(new File([pdf], `Chamada ${TURMAS[t]} ${dataBR(hoje()).replace(/\//g, '-')}.pdf`, { type: 'application/pdf' }), `Chamada ${TURMAS[t]} – ${dataBR(hoje())}`);
}
function pdfChamada(t, alunos) {
  const p = new MiniPDF();
  const cab = () => {
    p.retangulo(0, 0, 210, 28, [74, 42, 20]); p.retangulo(0, 28, 210, 2, [200, 32, 42]);
    p.texto(15, 13, 'LISTA DE PRESENÇA', 18, true, [242, 193, 78]);
    p.texto(15, 22, `${TURMAS[t]}  •  ${dataBR(hoje())}`, 12, false, [255, 246, 230]);
    p.texto(15, 42, 'Nº', 10, true); p.texto(27, 42, 'Aluno', 10, true); p.texto(120, 42, 'Faixa', 10, true); p.texto(170, 42, 'Situação', 10, true);
  };
  cab();
  let y = 50, n = 0;
  alunos.forEach((a, i) => {
    if (y > 280) { p.novaPagina(); cab(); y = 50; }
    if (i % 2 === 0) p.retangulo(12, y - 5, 186, 7, [245, 236, 220]);
    const pres = marcas[a.id] === 'p'; if (pres) n++;
    p.texto(15, y, String(i + 1), 10); p.texto(27, y, a.nome.slice(0, 48), 10); p.texto(120, y, nomeFaixa(a.faixa), 10);
    p.texto(170, y, pres ? 'Presente' : 'Falta', 10, true, pres ? [20, 120, 40] : [200, 30, 30]);
    y += 7;
  });
  y += 6; if (y > 285) { p.novaPagina(); y = 20; }
  p.texto(15, y, `Total: ${alunos.length} alunos  •  Presentes: ${n}  •  Faltas: ${alunos.length - n}`, 11, true);
  return p.blob();
}
async function compartilharArquivo(file, titulo) {
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: titulo }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  // sem compartilhamento: baixa o arquivo (não fica guardado no app)
  const url = URL.createObjectURL(file), l = document.createElement('a');
  l.href = url; l.download = file.name; document.body.appendChild(l); l.click(); l.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Arquivo baixado. Envie pelo WhatsApp a partir dos Downloads.');
}

// ---------- avisos ----------
const MODELOS = {
  prova: { nome: '📅 Data de prova', titulo: 'EXAME DE FAIXA', cor: '#c8202a', msg: 'Atenção, alunos! Nosso exame de graduação de faixa vai acontecer na data abaixo. Venham de kimono limpo e faixa.' },
  convocacao: { nome: '🥋 Convocação', titulo: 'CONVOCAÇÃO PARA EXAME', cor: '#f2c14e', msg: 'Os alunos abaixo estão convocados para o exame de faixa:\n\n' },
  curso: { nome: '🎓 Curso', titulo: 'CURSO / SEMINÁRIO', cor: '#2f9a4a', msg: 'Participe do nosso curso especial. Vagas limitadas!' },
  pagamento: { nome: '💰 Pagamento', titulo: 'AVISO DE MENSALIDADE', cor: '#1d6fd8', msg: 'Lembramos que a mensalidade vence na data abaixo. Contamos com a sua pontualidade. Oss!' }
};
let av = { modelo: 'prova' };
function telaAvisos(app, t) {
  const m = MODELOS[av.modelo];
  if (av.turma !== t || av.modeloCarregado !== av.modelo) {
    Object.assign(av, { turma: t, modeloCarregado: av.modelo, titulo: m.titulo, msg: m.msg, data: av.data || '', hora: av.hora || '', local: av.local || '' });
    if (av.modelo === 'convocacao') av.msg += D.turmas[t].alunos.filter(a => situacao(a).pronto).map(a => `• ${a.nome}`).join('\n');
  }
  app.innerHTML = `<div class="tela fundo-escuro" style="background-image:url(img/dojo.jpg)">${topo('Avisos', 'Crie e envie pelo WhatsApp', 'menu/' + t)}
    <div class="modelos">${Object.entries(MODELOS).map(([k, v]) => `<button class="${k === av.modelo ? 'on' : ''}" onclick="av.modelo='${k}';render()">${v.nome}</button>`).join('')}</div>
    <canvas id="preview" width="1080" height="1350"></canvas>
    <div class="card">
      <label class="campo">Título<input id="avTitulo" value="${esc(av.titulo)}"></label>
      <div class="linha"><label class="campo grow">Data<input id="avData" type="date" value="${av.data}"></label><label class="campo grow">Horário<input id="avHora" type="time" value="${av.hora}"></label></div>
      <label class="campo">Local<input id="avLocal" value="${esc(av.local)}" placeholder="Ex.: Dojô central"></label>
      <label class="campo">Mensagem<textarea id="avMsg">${esc(av.msg)}</textarea></label>
      <button class="btn verde cheio" onclick="enviarAviso()">📤 Compartilhar no WhatsApp</button>
    </div></div>`;
  ['avTitulo', 'avData', 'avHora', 'avLocal', 'avMsg'].forEach(id => $('#' + id).addEventListener('input', () => {
    av.titulo = $('#avTitulo').value; av.data = $('#avData').value; av.hora = $('#avHora').value; av.local = $('#avLocal').value; av.msg = $('#avMsg').value; desenharAviso();
  }));
  desenharAviso();
}
const imgDojo = new Image(); imgDojo.src = 'img/dojo.jpg'; imgDojo.onload = () => $('#preview') && desenharAviso();
const imgTigre = new Image(); imgTigre.src = 'img/icone-512.png'; imgTigre.onload = () => $('#preview') && desenharAviso();
function quebrar(ctx, texto, larg) {
  const linhas = [];
  String(texto).split('\n').forEach(par => {
    let l = '';
    par.split(' ').forEach(p => { const t = l ? l + ' ' + p : p; if (ctx.measureText(t).width > larg && l) { linhas.push(l); l = p; } else l = t; });
    linhas.push(l);
  });
  return linhas;
}
function desenharAviso() {
  const c = $('#preview'); if (!c) return;
  const x = c.getContext('2d'), W = 1080, H = 1350, m = MODELOS[av.modelo];
  x.fillStyle = '#1a0d06'; x.fillRect(0, 0, W, H);
  if (imgDojo.complete && imgDojo.naturalWidth) { const s = Math.max(W / imgDojo.width, H / imgDojo.height); x.drawImage(imgDojo, (W - imgDojo.width * s) / 2, (H - imgDojo.height * s) / 2, imgDojo.width * s, imgDojo.height * s); }
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(10,5,2,.55)'); g.addColorStop(.35, 'rgba(10,5,2,.82)'); g.addColorStop(1, 'rgba(10,5,2,.92)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // moldura dourada
  x.strokeStyle = '#b8862b'; x.lineWidth = 10; x.strokeRect(30, 30, W - 60, H - 60);
  x.strokeStyle = '#f2c14e'; x.lineWidth = 3; x.strokeRect(48, 48, W - 96, H - 96);
  if (imgTigre.complete && imgTigre.naturalWidth) {
    x.save(); x.beginPath(); x.arc(W / 2, 175, 95, 0, Math.PI * 2); x.clip(); x.drawImage(imgTigre, W / 2 - 95, 80, 190, 190); x.restore();
    x.beginPath(); x.arc(W / 2, 175, 95, 0, Math.PI * 2); x.strokeStyle = '#f2c14e'; x.lineWidth = 6; x.stroke();
  }
  x.textAlign = 'center'; x.fillStyle = '#f2c14e'; x.shadowColor = '#000'; x.shadowBlur = 12;
  x.font = 'italic 900 76px system-ui,sans-serif';
  let y = 360; quebrar(x, (av.titulo || '').toUpperCase(), W - 160).forEach(l => { x.fillText(l, W / 2, y); y += 84; });
  x.fillStyle = m.cor; x.shadowBlur = 0; x.fillRect(W / 2 - 180, y - 40, 360, 8); y += 40;
  x.fillStyle = '#fff6e6'; x.font = '600 42px system-ui,sans-serif';
  const info = [];
  if (av.data) { const d = new Date(av.data + 'T12:00'); info.push('📅 ' + d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })); }
  if (av.hora) info.push('⏰ ' + av.hora.replace(':', 'h'));
  if (av.local) info.push('📍 ' + av.local);
  info.forEach(l => { y += 58; x.fillText(l, W / 2, y); });
  y += info.length ? 80 : 40;
  x.font = '400 38px system-ui,sans-serif'; x.fillStyle = '#f5ead6';
  quebrar(x, av.msg || '', W - 180).forEach(l => { if (y < H - 140) { x.fillText(l, W / 2, y); y += 50; } });
  x.font = 'italic 800 40px system-ui,sans-serif'; x.fillStyle = '#f2c14e'; x.fillText('空手道 · OSS!', W / 2, H - 90);
}
function enviarAviso() {
  $('#preview').toBlob(b => compartilharArquivo(new File([b], `Aviso ${MODELOS[av.modelo].titulo}.png`, { type: 'image/png' }), av.titulo), 'image/png');
}

// ---------- mensalidades ----------
function telaMensal(app, t) {
  const ord = { pendente: 0, nunca: 1, ok: 2 };
  const alunos = [...D.turmas[t].alunos].sort((a, b) => ord[mensal(a).st] - ord[mensal(b).st] || a.nome.localeCompare(b.nome));
  const pend = alunos.filter(a => mensal(a).st === 'pendente');
  let html = `<div class="tela fundo-escuro" style="background-image:url(img/dojo.jpg)">${topo('Mensalidades', TURMAS[t], 'menu/' + t)}
    <button class="btn cheio" style="margin-bottom:12px" onclick="editarAluno('${t}')">+ Cadastrar aluno</button>`;
  if (alunos.length) html += pend.length ? `<div class="aviso-topo ruim">⚠ <b>${pend.length} mensalidade(s) pendente(s)</b>. A mensalidade vence 30 dias depois do último pagamento.</div>`
    : `<div class="aviso-topo">✔ Todas as mensalidades em dia.</div>`;
  else html += `<div class="card vazio">Nenhum aluno cadastrado.</div>`;
  alunos.forEach(a => {
    const s = mensal(a);
    html += `<div class="card"><div class="linha"><span class="faixa" style="background:${corFaixa(a.faixa)}"></span><span class="nome grow" onclick="editarAluno('${t}','${a.id}')">${esc(a.nome)}</span>
      <span class="tag ${s.st === 'ok' ? 'ok' : s.st === 'pendente' ? 'ruim' : 'neutra'}">${s.st === 'ok' ? 'EM DIA' : s.st === 'pendente' ? 'PENDENTE' : 'SEM REGISTRO'}</span></div>
      <div class="pq" style="margin:6px 0 8px">${s.txt}${a.pago ? ` · último: ${dataBR(a.pago)}` : ''}</div>
      <div class="linha"><button class="btn verde grow" onclick="pagar('${t}','${a.id}')">✔ Marcar pago hoje</button><button class="btn" onclick="editarAluno('${t}','${a.id}')">Editar data</button></div></div>`;
  });
  app.innerHTML = html + '</div>';
}
function pagar(t, id) {
  const a = D.turmas[t].alunos.find(x => x.id === id);
  if (a.pago === hoje()) return toast('Já está marcado como pago hoje');
  a.pago = hoje(); salvar(); render(); toast(`${a.nome}: pago em ${dataBR(hoje())}`);
}

// ================= início =================
render();
(() => { const n = pendentes('infantil'); if (n) setTimeout(() => toast(`⚠ ${n} mensalidade(s) pendente(s) na Turma Infantil`, 4000), 600); })();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
