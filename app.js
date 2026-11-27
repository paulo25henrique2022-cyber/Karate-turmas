'use strict';
// ================= dados =================
const FAIXAS = [
  ['Azul clara', '#8fd3ff'], ['Amarela', '#ffd83a'], ['Laranja', '#ff8c1a'], ['Verde', '#2fae4a'],
  ['Azul escuro', '#1d3f9a'], ['Roxa', '#7a3aa8'], ['Marrom', '#7a4a22'], ['Marrom 1', '#6a3c18'], ['Marrom 2', '#5a300f']];
const TURMAS = { juvenil: 'Turma Juvenil', infantil: 'Turma Infantil', uni1: 'Uni-Júnior 1', uni2: 'Uni-Júnior 2', uni3: 'Uni-Júnior 3' };
const FUNDO = t => t === 'infantil' ? 'infantil' : 'juvenil'; // Uni-Júnior usam o bambu da Juvenil
const PROFESSOR = 'Sensei Adriano';
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
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
// v1.6: faixas e duração da aula separadas por turma, com a faixa Branca no início
const faixasPadrao = () => [{ nome: 'Branca', cor: '#f2f2f2', horas: 117 }, ...FAIXAS.map(([nome, cor]) => ({ nome, cor, horas: 117 }))];
function migrar(d) {
  d = migrarV2(d);
  // v1.7: turmas novas (Uni-Júnior) entram vazias; as que já existem não mudam
  for (const t of Object.keys(TURMAS)) if (!d.turmas[t]) d.turmas[t] = { alunos: [], ultimaChamada: '', faixas: faixasPadrao(), aulaHoras: 1.5 };
  return d;
}
function migrarV2(d) {
  if (d.v >= 2) return d;
  for (const t of ['juvenil', 'infantil']) {
    const tu = d.turmas[t] = d.turmas[t] || { alunos: [], ultimaChamada: '' };
    if (!tu.faixas) {
      tu.faixas = [{ nome: 'Branca', cor: '#f2f2f2', horas: 117 }, ...FAIXAS.map(([nome, cor], i) => ({ nome, cor, horas: d.faixas?.[i]?.horas ?? 117 }))];
      tu.aulaHoras = d.aulaHoras || 1.5;
      tu.alunos.forEach(a => { a.faixa = (+a.faixa || 0) + 1; });
    }
  }
  d.v = 2; return d;
}
D = migrar(D); salvar();
const FX = t => D.turmas[t].faixas;
const aulaH = t => D.turmas[t].aulaHoras || 1.5;
function salvar() { localStorage.setItem(CHAVE, JSON.stringify(D)); }

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const dataBR = iso => iso ? iso.split('-').reverse().join('/') : '';
const diasDesde = iso => Math.floor((new Date(hoje() + 'T12:00') - new Date(iso + 'T12:00')) / 864e5);
const fmtH = h => { const t = Math.round(h * 60), hh = Math.floor(t / 60), mm = t % 60; return mm ? `${hh}h${String(mm).padStart(2, '0')}` : `${hh}h`; };
// (chamada: ch é zerado ao sair da tela)
const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const corFaixa = (t, i) => FX(t)[i]?.cor || '#888';
const nomeFaixa = (t, i) => FX(t)[i]?.nome || '?';

function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, ms); }
function abrirModal(html) { $('#modalCaixa').innerHTML = html; $('#modal').hidden = false; }
function fecharModal() { $('#modal').hidden = true; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') fecharModal(); });

function situacao(a, t) {
  const precisa = FX(t)[a.faixa]?.horas ?? 117;
  const falta = Math.max(0, precisa - a.horas);
  return { precisa, falta, aulas: Math.ceil(falta / aulaH(t)), pronto: a.horas >= precisa && a.faixa < FX(t).length - 1, pct: Math.min(100, precisa ? a.horas / precisa * 100 : 100) };
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
  if (tela !== 'chamada') ch = { data: '', hora: '' };
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
    ${Object.keys(TURMAS).map(t => `<button class="placa" onclick="ir('menu/${t}')"><span class="tigre"></span>${TURMAS[t]}<span class="tigre"></span></button>
    <div class="dias-turma" onclick="editarDias('${t}')">${textoDias(t, true)} <span class="eng">⚙</span></div>`).join('')}
    <div style="margin-top:auto;text-align:center"><button class="btn" style="background:rgba(0,0,0,.55)" onclick="abrirBackup()">💾 Cópia de segurança</button></div>
  </div></div>`;
}

// ---------- dias de aula (v1.7) ----------
function textoDias(t, html) {
  const c = D.turmas[t].calendario || {}, dias = (c.dias || []).slice().sort((a, b) => a - b);
  if (!dias.length) return html ? '<span class="sem">Dias não definidos</span>' : '';
  const hora = c.hora ? ` · ${c.hora.replace(':', 'h')}` : '';
  return html ? dias.map(d => `<span class="dia">${DIAS[d]}</span>`).join('') + esc(hora) : dias.map(d => DIAS[d]).join(', ') + hora;
}
let diasEd = [];
function editarDias(t) {
  const c = D.turmas[t].calendario || {}; diasEd = [...(c.dias || [])];
  abrirModal(`<h2>Dias de aula · ${TURMAS[t]}</h2><p class="pq">Toque nos dias em que essa turma treina.</p>
    <div class="linha dias-ed">${DIAS.map((n, i) => `<button class="btn ${diasEd.includes(i) ? 'on' : ''}" onclick="togDia(this,${i})">${n}</button>`).join('')}</div>
    <label class="campo" style="margin-top:12px">Horário (opcional)<input id="diaHora" type="time" value="${c.hora || ''}"></label>
    <div class="linha"><button class="btn grow" onclick="fecharModal()">Cancelar</button><button class="btn verde grow" onclick="salvarDias('${t}')">Salvar</button></div>`);
}
function togDia(b, i) { diasEd = diasEd.includes(i) ? diasEd.filter(x => x !== i) : [...diasEd, i]; b.classList.toggle('on'); }
function salvarDias(t) { D.turmas[t].calendario = { dias: diasEd, hora: $('#diaHora').value }; salvar(); fecharModal(); render(); toast('Dias de aula salvos'); }

// ---------- menus ----------
function telaMenu(app, t) {
  const prontos = D.turmas[t].alunos.filter(a => situacao(a, t).pronto).length;
  const pend = t === 'infantil' ? pendentes(t) : 0;
  app.innerHTML = `<div class="tela" style="background-image:url(img/${FUNDO(t)}.jpg)">
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
  const prontos = alunos.filter(a => situacao(a, t).pronto);
  let html = `<div class="tela fundo-escuro" style="background-image:url(img/dojo.jpg)">${topo('Frequência', TURMAS[t], 'menu/' + t)}
    <div class="linha" style="margin-bottom:12px"><button class="btn grow" onclick="editarAluno('${t}')">+ Aluno</button><button class="btn" onclick="editarFaixas('${t}')">⚙ Faixas e horas</button></div>
    ${alunos.length ? `<button class="btn cheio" style="margin-bottom:12px" onclick="compartilharFreqPDF('${t}')">📄 Gerar PDF da frequência</button>` : ''}`;
  if (prontos.length) html += `<div class="aviso-topo">🥋 <b>${prontos.length} aluno(s) já completaram o tempo para graduar:</b> ${prontos.map(a => esc(a.nome)).join(', ')}</div>`;
  if (!alunos.length) html += `<div class="card vazio">Nenhum aluno cadastrado.<br>Toque em <b>+ Aluno</b>. Os alunos cadastrados aqui entram automaticamente na chamada.</div>`;
  FX(t).forEach(({ nome, cor, horas }, fi) => {
    const lista = alunos.filter(a => a.faixa === fi).sort((a, b) => a.nome.localeCompare(b.nome));
    if (!lista.length) return;
    html += `<div class="grupo"><span class="faixa" style="background:${cor}"></span>${nome} <span class="pq">(${lista.length}) — exige ${fmtH(horas)}</span></div>`;
    lista.forEach(a => {
      const s = situacao(a, t);
      html += `<div class="card ${s.pronto ? 'pronto' : ''}" onclick="editarAluno('${t}','${a.id}')">
        <div class="linha"><span class="nome grow">${esc(a.nome)}</span>${s.pronto ? '<span class="tag ok">PODE GRADUAR</span>' : ''}</div>
        <div class="barra"><b style="width:${s.pct}%"></b></div>
        <div class="pq">${fmtH(a.horas)} de ${fmtH(s.precisa)} · ${s.pronto ? 'tempo completo ✔' : fi === FX(t).length - 1 && a.horas >= s.precisa ? 'última faixa da lista' : `faltam ${fmtH(s.falta)} (≈ ${s.aulas} aula${s.aulas === 1 ? '' : 's'})`}</div></div>`;
    });
  });
  app.innerHTML = html + '</div>';
}

function editarAluno(t, id) {
  const a = id ? D.turmas[t].alunos.find(x => x.id === id) : null;
  abrirModal(`<h2>${a ? 'Editar aluno' : 'Novo aluno'}</h2>
    <label class="campo">Nome<input id="fNome" value="${esc(a?.nome)}" placeholder="Nome do aluno"></label>
    <label class="campo">Faixa atual<select id="fFaixa">${FX(t).map(({ nome: n }, i) => `<option value="${i}" ${a?.faixa === i ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
    <label class="campo">Horas de treino já feitas nesta faixa (pode ajustar à mão)<input id="fHoras" type="number" step="0.5" min="0" inputmode="decimal" value="${a ? a.horas : 0}"></label>
    ${t === 'infantil' ? `<label class="campo">Último pagamento da mensalidade<input id="fPago" type="date" value="${a?.pago || ''}"></label>` : ''}
    <div class="linha" style="margin-top:6px"><button class="btn verde grow" onclick="salvarAluno('${t}','${id || ''}')">Salvar</button><button class="btn" onclick="fecharModal()">Cancelar</button></div>
    ${a ? `<div class="linha" style="margin-top:14px">
      ${a.faixa < FX(t).length - 1 ? `<button class="btn grow" onclick="graduar('${t}','${a.id}')">🥋 Graduar para ${esc(nomeFaixa(t, a.faixa + 1))}</button>` : ''}
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
  if (!confirm(`Graduar ${a.nome} para a faixa ${nomeFaixa(t, a.faixa + 1)}? As horas voltam para zero.`)) return;
  a.faixa++; a.horas = 0; salvar(); render(); toast(`Parabéns, ${a.nome}! 🥋`);
}
function excluirAluno(t, id) {
  const a = D.turmas[t].alunos.find(x => x.id === id);
  if (!confirm(`Excluir ${a.nome}? Isso não pode ser desfeito.`)) return;
  D.turmas[t].alunos = D.turmas[t].alunos.filter(x => x.id !== id); salvar(); render();
}
let fxEd = null;
function editarFaixas(t) { fxEd = { t, lista: FX(t).map(f => ({ ...f, de: FX(t).indexOf(f) })), aula: aulaH(t) }; desenharFaixas(); }
function lerFaixas() {
  fxEd.lista.forEach((f, i) => { f.nome = $('#fxn' + i).value.trim() || f.nome; f.cor = $('#fxc' + i).value; f.horas = Math.max(0, parseFloat(String($('#fx' + i).value).replace(',', '.')) || 0); });
  fxEd.aula = Math.max(0.25, parseFloat(String($('#fxAula').value).replace(',', '.')) || 1.5);
}
function desenharFaixas() {
  const { t, lista } = fxEd;
  abrirModal(`<h2>Faixas e horas · ${TURMAS[t]}</h2><p class="pq">Valem só para a ${TURMAS[t]}. Horas que o aluno precisa cumprir <b>em cada faixa</b> para graduar para a próxima. A ordem da lista é a ordem de graduação.</p>
    <div class="faixas-ed">${lista.map((f, i) => `<div class="linha" style="gap:6px;margin-bottom:8px">
      <input id="fxc${i}" type="color" value="${f.cor}" style="width:38px;height:34px;padding:0;border:none;background:none">
      <input id="fxn${i}" value="${esc(f.nome)}" class="grow" style="min-width:0">
      <input id="fx${i}" type="number" min="0" step="0.5" inputmode="decimal" value="${f.horas}" style="width:64px"> h
      <button class="btn" style="padding:4px 8px" onclick="moverFaixa(${i},-1)" ${i ? '' : 'disabled'}>↑</button><button class="btn" style="padding:4px 8px" onclick="moverFaixa(${i},1)" ${i < lista.length - 1 ? '' : 'disabled'}>↓</button>
      <button class="btn verm" style="padding:4px 8px" onclick="apagarFaixa(${i})">✕</button></div>`).join('')}</div>
    <button class="btn cheio" onclick="novaFaixa()">+ Adicionar faixa</button>
    <label class="campo" style="margin-top:12px">Duração de cada aula desta turma (horas)<input id="fxAula" type="number" min="0.25" step="0.25" inputmode="decimal" value="${fxEd.aula}"></label>
    <p class="pq">Referência: 3 aulas de 1h30 por semana durante 6 meses ≈ 117 h.</p>
    <div class="linha"><button class="btn verde grow" onclick="salvarFaixas()">Salvar</button><button class="btn" onclick="fecharModal()">Cancelar</button></div>
    <button class="btn cheio" style="margin-top:14px" onclick="abrirBackup()">💾 Cópia de segurança</button>`);
}
function moverFaixa(i, d) { lerFaixas(); const L = fxEd.lista; [L[i], L[i + d]] = [L[i + d], L[i]]; desenharFaixas(); }
function novaFaixa() { lerFaixas(); fxEd.lista.push({ nome: 'Nova faixa', cor: '#cccccc', horas: 117, de: -1 }); desenharFaixas(); setTimeout(() => { const e = $('#fxn' + (fxEd.lista.length - 1)); e.focus(); e.select(); }, 50); }
function apagarFaixa(i) {
  lerFaixas(); const f = fxEd.lista[i];
  const n = f.de >= 0 ? D.turmas[fxEd.t].alunos.filter(a => a.faixa === f.de).length : 0;
  if (n) return toast(`${n} aluno(s) estão nesta faixa. Mude a faixa deles antes de apagar.`, 3500);
  if (fxEd.lista.length === 1) return toast('A turma precisa de pelo menos uma faixa');
  if (!confirm(`Apagar a faixa ${f.nome}?`)) return;
  fxEd.lista.splice(i, 1); desenharFaixas();
}
function salvarFaixas() {
  lerFaixas(); const { t, lista } = fxEd, mapa = {};
  lista.forEach((f, i) => { if (f.de >= 0) mapa[f.de] = i; });
  D.turmas[t].alunos.forEach(a => { if (mapa[a.faixa] != null) a.faixa = mapa[a.faixa]; });
  D.turmas[t].faixas = lista.map(({ nome, cor, horas }) => ({ nome, cor, horas }));
  D.turmas[t].aulaHoras = fxEd.aula;
  salvar(); fecharModal(); render(); toast('Faixas atualizadas');
}
function abrirBackup() {
  abrirModal(`<h2>Cópia de segurança</h2><p class="pq">Os dados ficam só neste celular. Faça uma cópia de vez em quando e guarde no Gmail, WhatsApp ou Drive.</p>
    <div class="linha"><button class="btn grow" onclick="backup()">💾 Fazer cópia</button><label class="btn grow" style="text-align:center">📂 Restaurar<input type="file" accept=".json,application/json" hidden onchange="restaurar(this.files[0])"></label></div>
    <label class="campo" style="margin-top:14px">Enviar cópia para o e-mail<input id="bkPara" type="email" multiple value="${esc(D.email?.para)}" placeholder="professor@gmail.com"></label>
    <button class="btn verm cheio" onclick="backupGmail()">📧 Enviar cópia para o Gmail</button>
    <p class="pq" id="bkStatus"></p>
    <button class="btn cheio" style="margin-top:12px" onclick="fecharModal()">Fechar</button>`);
}
const nomeBackup = () => `karate-backup-${hoje()}.json`;
async function backup() {
  const f = new File([JSON.stringify(D)], nomeBackup(), { type: 'application/json' });
  await compartilharArquivo(f, 'Cópia de segurança – Karatê');
}
// Envia a cópia de segurança para o e-mail.
// Com o script do Google configurado: vai direto. Sem ele: abre o compartilhamento (escolha o Gmail).
async function backupGmail() {
  const para = $('#bkPara').value.trim();
  D.email = { ...(D.email || {}), para }; salvar();
  const st = $('#bkStatus');
  if (!D.email.url) {
    toast('Escolha o Gmail na lista que vai abrir', 3000);
    return backup();
  }
  if (!para) return toast('Digite o e-mail de destino');
  if (!navigator.onLine) { st.textContent = '✖ Sem internet. Tente quando tiver sinal, ou use 💾 Fazer cópia.'; return; }
  st.textContent = 'Enviando cópia…';
  try {
    const r = await fetch(D.email.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ tipo: 'backup', nome: nomeBackup(), dados: JSON.stringify(D), data: dataBR(hoje()), para, codigo: D.email.codigo }) });
    const j = await r.json();
    if (!j.ok) throw new Error(j.erro || 'falhou');
    if (!j.backup) throw new Error('o script do Google está desatualizado — cole o novo Codigo.gs e implante de novo');
    st.textContent = '✔ Cópia enviada! Confira o e-mail.';
  } catch (e) { st.textContent = '✖ Falhou: ' + (navigator.onLine ? e.message : 'sem internet'); }
}
function restaurar(arq) {
  if (!arq) return;
  arq.text().then(txt => {
    const n = JSON.parse(txt);
    if (!n.turmas) throw 0;
    if (!confirm('Substituir todos os dados atuais por esta cópia?')) return;
    D = migrar(n); salvar(); render(); toast('Dados restaurados');
  }).catch(() => toast('Arquivo inválido'));
}

// ---------- chamada ----------
let marcas = {};
let ch = { data: '', hora: '' }; // data/hora da chamada (seguem o celular, mas podem ser editadas)
const agoraHora = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
function telaChamada(app, t) {
  if (!ch.data) { ch.data = hoje(); ch.hora = agoraHora(); }
  const alunos = [...D.turmas[t].alunos].sort((a, b) => a.nome.localeCompare(b.nome));
  const ult = D.turmas[t].ultima;
  const feita = ult && ult.data === ch.data;
  let html = `<div class="tela fundo-escuro" style="background-image:url(img/dojo.jpg)">${topo('Chamada', TURMAS[t], 'menu/' + t)}
    <div class="card"><div class="linha">
      <label class="campo grow" style="margin:0">Data da chamada<input type="date" value="${ch.data}" onchange="ch.data=this.value||hoje();render()"></label>
      <label class="campo" style="margin:0;width:120px">Hora<input type="time" value="${ch.hora}" onchange="ch.hora=this.value"></label></div>
      <div class="pq" style="margin-top:6px">Puxa a data e a hora do celular. Altere se a chamada for de outro dia ou horário.</div></div>`;
  if (feita) html += `<div class="aviso-topo">✔ A chamada de ${dataBR(ch.data)} já foi finalizada (veja no fim da página). Se fizer de novo, as horas serão somadas outra vez.</div>`;
  if (!alunos.length) html += `<div class="card vazio">Nenhum aluno na turma.<br>Cadastre os alunos em <b>Frequência</b> e eles aparecem aqui automaticamente.</div>`;
  else {
    html += `<div class="linha" style="margin-bottom:10px"><button class="btn grow" onclick="todos('${t}','p')">Todos presentes</button><button class="btn grow" onclick="todos('${t}','')">Limpar</button></div>`;
    alunos.forEach(a => {
      const m = marcas[a.id] || '';
      html += `<div class="card linha"><span class="faixa" style="background:${corFaixa(t, a.faixa)}"></span><span class="nome grow">${esc(a.nome)}</span>
        <div class="pa"><button class="p ${m === 'p' ? 'on' : ''}" onclick="marcar('${a.id}','p')">P</button><button class="a ${m === 'a' ? 'on' : ''}" onclick="marcar('${a.id}','a')">F</button></div></div>`;
    });
    const p = alunos.filter(a => marcas[a.id] === 'p').length, f = alunos.filter(a => marcas[a.id] === 'a').length;
    html += `<p class="pq" style="text-align:center">Presentes: <b>${p}</b> · Faltas: <b>${f}</b> · Sem marcar: <b>${alunos.length - p - f}</b></p>
      <button class="btn verde cheio" onclick="finalizar('${t}')">✔ Finalizar chamada</button>`;
  }
  if (feita) {
    const pres = ult.alunos.filter(a => a.presente).length;
    const fila = filaEmail().length;
    html += `<div class="card" style="margin-top:18px;border-color:var(--ouro)">
      <h2 style="margin:0 0 4px;color:var(--ouro);font-size:19px">📄 Chamada de ${dataBR(ult.data)} às ${ult.hora.replace(':', 'h')}</h2>
      <div class="pq" style="margin-bottom:12px">${ult.alunos.length} alunos · ${pres} presentes · ${ult.alunos.length - pres} faltas</div>
      <button class="btn cheio" style="margin-bottom:10px" onclick="compartilharPDF('${t}')">📤 Compartilhar PDF (WhatsApp)</button>
      <label class="campo">Enviar para o e-mail<input id="emPara" type="email" multiple value="${esc(D.email?.para)}" placeholder="professor@gmail.com"></label>
      <button class="btn verm cheio" onclick="enviarGmail('${t}')">📧 Enviar PDF para o Gmail</button>
      ${fila ? `<p class="pq">⏳ ${fila} envio(s) aguardando internet — saem sozinhos quando a conexão voltar.</p>` : ''}
      <details style="margin-top:12px"><summary class="pq">⚙ Configurar envio direto (sem abrir o Gmail)</summary>
        <p class="pq">Com o script do Google configurado, o PDF vai direto para o e-mail, sem precisar escolher nada. Sem ele, o botão abre o Gmail com o PDF anexado.</p>
        <label class="campo">Link do script (Apps Script)<input id="emUrl" value="${esc(D.email?.url)}" placeholder="https://script.google.com/macros/s/.../exec"></label>
        <label class="campo">Código secreto (o mesmo do script)<input id="emCod" value="${esc(D.email?.codigo)}"></label>
        <div class="linha"><button class="btn verde grow" onclick="salvarEmail()">Salvar</button><button class="btn" onclick="testarEmail()">Testar envio</button></div>
        <p class="pq" id="emStatus"></p></details></div>`;
  }
  app.innerHTML = html + '</div>';
}
function marcar(id, v) { marcas[id] = marcas[id] === v ? '' : v; const y = $('.tela').scrollTop; render(); $('.tela').scrollTop = y; }
function todos(t, v) { D.turmas[t].alunos.forEach(a => marcas[a.id] = v); render(); }
function finalizar(t) {
  const alunos = [...D.turmas[t].alunos].sort((a, b) => a.nome.localeCompare(b.nome));
  const sem = alunos.filter(a => !marcas[a.id]);
  if (sem.length && !confirm(`${sem.length} aluno(s) sem marcação serão registrados como FALTA. Continuar?`)) return;
  if (D.turmas[t].ultima?.data === ch.data && !confirm(`A chamada de ${dataBR(ch.data)} já foi feita. Somar as horas de novo?`)) return;
  const novosProntos = [];
  alunos.forEach(a => {
    if (marcas[a.id] === 'p') {
      const antes = situacao(a, t).pronto;
      a.horas = Math.round((a.horas + aulaH(t)) * 100) / 100;
      if (!antes && situacao(a, t).pronto) novosProntos.push(a.nome);
    }
  });
  // guarda só a ÚLTIMA chamada (para gerar o PDF); a anterior é apagada
  D.turmas[t].ultima = { data: ch.data, hora: ch.hora, alunos: alunos.map(a => ({ nome: a.nome, faixa: nomeFaixa(t, a.faixa), presente: marcas[a.id] === 'p' })) };
  D.turmas[t].ultimaChamada = ch.data;
  salvar(); marcas = {}; render();
  setTimeout(() => { const tl = $('.tela'); tl.scrollTo({ top: tl.scrollHeight, behavior: 'smooth' }); }, 50);
  if (novosProntos.length) alert(`🥋 Completaram o tempo para graduar:\n\n${novosProntos.join('\n')}`);
  else toast('Chamada finalizada ✔ — envie o PDF no fim da página');
}
const nomePDF = (t, u) => `Chamada ${TURMAS[t]} ${dataBR(u.data).replace(/\//g, '-')}.pdf`;
function compartilharPDF(t) {
  const u = D.turmas[t].ultima;
  compartilharArquivo(new File([pdfChamada(t, u)], nomePDF(t, u), { type: 'application/pdf' }), `Chamada ${TURMAS[t]} – ${dataBR(u.data)}`);
}
async function enviarGmail(t) {
  const u = D.turmas[t].ultima;
  D.email = { ...(D.email || {}), para: $('#emPara').value.trim() }; salvar();
  if (D.email.url) {
    if (!D.email.para) return toast('Digite o e-mail de destino');
    enfileirarEmail({ turma: TURMAS[t], data: `${dataBR(u.data)} às ${u.hora.replace(':', 'h')}`, alunos: u.alunos });
    return;
  }
  // sem script: abre o compartilhamento já com o PDF — escolha o Gmail
  toast('Escolha o Gmail na lista que vai abrir', 3000);
  await compartilharArquivo(new File([pdfChamada(t, u)], nomePDF(t, u), { type: 'application/pdf' }), `Lista de presença – ${TURMAS[t]} – ${dataBR(u.data)}`);
}
function pdfChamada(t, u) {
  const p = new MiniPDF();
  const cab = () => {
    cabecalhoPDF(p, 'LISTA DE PRESENÇA', `${TURMAS[t]}  •  ${dataBR(u.data)} às ${u.hora.replace(':', 'h')}`);
    p.texto(15, 42, 'Nº', 10, true); p.texto(27, 42, 'Aluno', 10, true); p.texto(120, 42, 'Faixa', 10, true); p.texto(170, 42, 'Situação', 10, true);
  };
  cab();
  let y = 50, n = 0;
  u.alunos.forEach((a, i) => {
    if (y > 280) { p.novaPagina(); cab(); y = 50; }
    if (i % 2 === 0) p.retangulo(12, y - 5, 186, 7, [245, 236, 220]);
    if (a.presente) n++;
    p.texto(15, y, String(i + 1), 10); p.texto(27, y, a.nome.slice(0, 48), 10); p.texto(120, y, a.faixa, 10);
    p.texto(170, y, a.presente ? 'Presente' : 'Falta', 10, true, a.presente ? [20, 120, 40] : [200, 30, 30]);
    y += 7;
  });
  y += 6; if (y > 285) { p.novaPagina(); y = 20; }
  p.texto(15, y, `Total: ${u.alunos.length} alunos  •  Presentes: ${n}  •  Faltas: ${u.alunos.length - n}`, 11, true);
  return p.blob();
}
// cabeçalho comum dos PDFs: título, turma, professor responsável e logo da Athletic Center
function cabecalhoPDF(p, titulo, linha) {
  p.retangulo(0, 0, 210, 32, [74, 42, 20]); p.retangulo(0, 32, 210, 2, [200, 32, 42]);
  p.texto(15, 12, titulo, 18, true, [242, 193, 78]);
  p.texto(15, 20, linha, 11, false, [255, 246, 230]);
  p.texto(15, 27, `Professor responsável: ${PROFESSOR}`, 10, true, [255, 246, 230]);
  if (LOGO) p.imagem(181, 3, 26, 26, LOGO);
}
let LOGO = null; // logo convertida para JPEG ao abrir o app (funciona offline: a imagem está guardada no celular)
(() => {
  const im = new Image();
  im.onload = () => {
    try {
      const c = document.createElement('canvas'); c.width = c.height = 300;
      const g = c.getContext('2d'); g.fillStyle = '#4a2a14'; g.fillRect(0, 0, 300, 300); g.drawImage(im, 0, 0, 300, 300);
      const b = atob(c.toDataURL('image/jpeg', 0.9).split(',')[1]), u8 = new Uint8Array(b.length);
      for (let i = 0; i < b.length; i++) u8[i] = b.charCodeAt(i);
      LOGO = { bytes: u8, w: 300, h: 300 };
    } catch { }
  };
  im.src = 'img/logo-athletic.png';
})();
function pdfFrequencia(t) {
  const p = new MiniPDF(), alunos = D.turmas[t].alunos, dias = textoDias(t, false);
  const linha = `${TURMAS[t]}${dias ? '  •  ' + dias : ''}  •  gerado em ${dataBR(hoje())}`;
  cabecalhoPDF(p, 'LISTA DE FREQUÊNCIA', linha);
  let y = 46, prontos = 0;
  const espaco = h => { if (y + h > 285) { p.novaPagina(); cabecalhoPDF(p, 'LISTA DE FREQUÊNCIA', linha); y = 46; } };
  FX(t).forEach(({ nome, horas }, fi) => {
    const lista = alunos.filter(a => a.faixa === fi).sort((a, b) => a.nome.localeCompare(b.nome));
    if (!lista.length) return;
    espaco(22);
    p.texto(15, y, `Faixa ${nome} (${lista.length}) – exige ${fmtH(horas)}`, 12, true, [74, 42, 20]); y += 7;
    p.texto(15, y, 'Aluno', 9, true); p.texto(110, y, 'Horas', 9, true); p.texto(145, y, 'Situação', 9, true); y += 6;
    lista.forEach((a, i) => {
      espaco(7);
      const s = situacao(a, t);
      if (s.pronto) { prontos++; p.retangulo(12, y - 5, 186, 7, [252, 230, 180]); }
      else if (i % 2 === 0) p.retangulo(12, y - 5, 186, 7, [245, 236, 220]);
      p.texto(15, y, a.nome.slice(0, 45), 10); p.texto(110, y, `${fmtH(a.horas)} / ${fmtH(s.precisa)}`, 10);
      const sit = s.pronto ? 'PODE GRADUAR' : fi === FX(t).length - 1 && a.horas >= s.precisa ? 'Última faixa da lista' : `Faltam ${fmtH(s.falta)} (≈ ${s.aulas} aula${s.aulas === 1 ? '' : 's'})`;
      p.texto(145, y, sit, 10, s.pronto, s.pronto ? [20, 120, 40] : [0, 0, 0]);
      y += 7;
    });
    y += 5;
  });
  espaco(10);
  p.texto(15, y, `Total: ${alunos.length} alunos  •  Podem graduar: ${prontos}`, 11, true);
  return p.blob();
}
function compartilharFreqPDF(t) {
  const f = new File([pdfFrequencia(t)], `Frequencia ${TURMAS[t]} ${dataBR(hoje()).replace(/\//g, '-')}.pdf`, { type: 'application/pdf' });
  compartilharArquivo(f, `Frequência ${TURMAS[t]} – ${dataBR(hoje())}`);
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
  prova: { nome: '📅 Data de prova', titulo: 'Exame de Faixa', destaque: 'Não falte!', msg: 'Venham de kimono limpo e faixa amarrada.' },
  convocacao: { nome: '🥋 Convocação', titulo: 'Convocação', destaque: 'Oss!', msg: 'Convocados para o exame de faixa:\n' },
  pagamento: { nome: '💰 Pagamento', titulo: 'Mensalidade', destaque: 'Evite atrasos!', msg: 'Lembramos que a mensalidade vence na data abaixo.' }
};
let av = { modelo: 'prova' };
// fontes do aviso (ficam dentro do app, funcionam sem internet)
const fontesAviso = Promise.all([
  new FontFace('Anton', 'url(fontes/Anton-Regular.ttf)').load(),
  new FontFace('Montserrat', 'url(fontes/Montserrat.ttf)', { weight: '100 900' }).load()
]).then(fs => { fs.forEach(f => document.fonts.add(f)); $('#preview') && desenharAviso(); }).catch(() => {});
function telaAvisos(app, t) {
  const m = MODELOS[av.modelo];
  if (av.turma !== t || av.modeloCarregado !== av.modelo) {
    Object.assign(av, { turma: t, modeloCarregado: av.modelo, titulo: m.titulo, destaque: m.destaque, msg: m.msg, data: av.data || '', hora: av.hora || '', local: av.local || 'Academia Athletic Center' });
    if (av.modelo === 'convocacao') av.msg += D.turmas[t].alunos.filter(a => situacao(a, t).pronto).map(a => a.nome).join(', ');
  }
  app.innerHTML = `<div class="tela fundo-escuro" style="background-image:url(img/dojo.jpg)">${topo('Avisos', 'Crie e envie pelo WhatsApp', 'menu/' + t)}
    <div class="modelos" style="grid-template-columns:1fr 1fr 1fr">${Object.entries(MODELOS).map(([k, v]) => `<button class="${k === av.modelo ? 'on' : ''}" onclick="av.modelo='${k}';render()">${v.nome}</button>`).join('')}</div>
    <canvas id="preview" width="1080" height="1440"></canvas>
    <div class="card">
      <label class="campo">Título<input id="avTitulo" value="${esc(av.titulo)}"></label>
      <div class="linha"><label class="campo grow">Data<input id="avData" type="date" value="${av.data}"></label><label class="campo grow">Horário<input id="avHora" type="time" value="${av.hora}"></label></div>
      <label class="campo">Local<input id="avLocal" value="${esc(av.local)}" placeholder="Ex.: Academia Athletic Center"></label>
      <label class="campo">Mensagem (curta, até 3 linhas)<textarea id="avMsg">${esc(av.msg)}</textarea></label>
      <label class="campo">Destaque (faixa vermelha)<input id="avDest" value="${esc(av.destaque)}" placeholder="Ex.: VAGAS LIMITADAS!"></label>
      <button class="btn verm cheio" style="margin-bottom:10px" onclick="avisoPDF()">📄 Gerar PDF e compartilhar no WhatsApp</button>
      <button class="btn verde cheio" onclick="enviarAviso()">🖼 Compartilhar como imagem</button>
    </div></div>`;
  ['avTitulo', 'avData', 'avHora', 'avLocal', 'avMsg', 'avDest'].forEach(id => $('#' + id).addEventListener('input', () => {
    av.titulo = $('#avTitulo').value; av.data = $('#avData').value; av.hora = $('#avHora').value; av.local = $('#avLocal').value; av.msg = $('#avMsg').value; av.destaque = $('#avDest').value; desenharAviso();
  }));
  desenharAviso();
}
const imgFundoAviso = new Image(); imgFundoAviso.src = 'img/aviso-fundo.jpg'; imgFundoAviso.onload = () => $('#preview') && desenharAviso();
const imgTigre = new Image(); imgTigre.src = 'img/logo-athletic.png'; imgTigre.onload = () => $('#preview') && desenharAviso();
function quebrar(ctx, texto, larg) {
  const linhas = [];
  String(texto).split('\n').forEach(par => {
    let l = '';
    par.split(' ').forEach(p => { const t = l ? l + ' ' + p : p; if (ctx.measureText(t).width > larg && l) { linhas.push(l); l = p; } else l = t; });
    linhas.push(l);
  });
  return linhas;
}
// pincelada vermelha (borda irregular, mais fina nas pontas)
function pincel(x, cx, cy, w, h, cor) {
  x.save(); x.fillStyle = cor; x.beginPath();
  const n = 40;
  for (let i = 0; i <= n; i++) { const t = i / n, px = cx - w / 2 + w * t, esp = h * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (0.85 + 0.15 * Math.sin(i * 2.3)); x.lineTo(px, cy - esp / 2); }
  for (let i = n; i >= 0; i--) { const t = i / n, px = cx - w / 2 + w * t, esp = h * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (0.85 + 0.15 * Math.cos(i * 1.7)); x.lineTo(px, cy + esp / 2); }
  x.closePath(); x.fill(); x.restore();
}
function textoOuro(x, txt, cx, y, tam, larg) {
  x.save(); x.font = `${tam}px Anton, Impact, sans-serif`;
  let t = tam; while (x.measureText(txt).width > larg && t > 50) { t -= 4; x.font = `${t}px Anton, Impact, sans-serif`; }
  x.translate(cx, y); x.transform(1, 0, -0.18, 1, 0, 0); // inclinado, estilo pincel
  const g = x.createLinearGradient(0, -t * 0.8, 0, t * 0.1);
  g.addColorStop(0, '#fff3b0'); g.addColorStop(0.45, '#f7c843'); g.addColorStop(1, '#c78512');
  x.textAlign = 'center'; x.lineJoin = 'round';
  x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 18; x.shadowOffsetY = 6;
  x.lineWidth = 10; x.strokeStyle = '#3a1a05'; x.strokeText(txt, 0, 0);
  x.shadowColor = 'transparent'; x.fillStyle = g; x.fillText(txt, 0, 0);
  x.restore();
  return t;
}
function desenharAviso() {
  const c = $('#preview'); if (!c) return;
  const x = c.getContext('2d'), W = 1080, H = 1440;
  x.fillStyle = '#1a0d06'; x.fillRect(0, 0, W, H);
  if (imgFundoAviso.complete && imgFundoAviso.naturalWidth) x.drawImage(imgFundoAviso, 0, 0, W, H);
  // escurece a área dos textos para ler bem
  const g = x.createLinearGradient(0, 0, 0, 860); g.addColorStop(0, 'rgba(10,5,2,.45)'); g.addColorStop(.75, 'rgba(10,5,2,.55)'); g.addColorStop(1, 'rgba(10,5,2,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, 860);
  // moldura dourada dupla com cantos
  x.strokeStyle = '#c8962e'; x.lineWidth = 8; x.strokeRect(22, 22, W - 44, H - 44);
  x.strokeStyle = '#f2c14e'; x.lineWidth = 3; x.strokeRect(40, 40, W - 80, H - 80);
  [[22, 22, 1, 1], [W - 22, 22, -1, 1], [22, H - 22, 1, -1], [W - 22, H - 22, -1, -1]].forEach(([px, py, sx, sy]) => {
    x.fillStyle = '#f2c14e'; x.fillRect(px - (sx < 0 ? 46 : 0), py - (sy < 0 ? 46 : 0), 46, 46);
    x.fillStyle = '#5a3210'; x.fillRect(px + sx * 10 - (sx < 0 ? 26 : 0), py + sy * 10 - (sy < 0 ? 26 : 0), 26, 26);
  });
  // emblema
  if (imgTigre.complete && imgTigre.naturalWidth) {
    x.save(); x.shadowColor = '#000'; x.shadowBlur = 25;
    x.beginPath(); x.arc(W / 2, 175, 128, 0, Math.PI * 2); x.fillStyle = '#c8962e'; x.fill(); x.restore();
    x.beginPath(); x.arc(W / 2, 175, 116, 0, Math.PI * 2); x.fillStyle = '#fff'; x.fill();
    x.save(); x.beginPath(); x.arc(W / 2, 175, 112, 0, Math.PI * 2); x.clip(); x.drawImage(imgTigre, W / 2 - 112, 63, 224, 224); x.restore();
  }
  // título
  textoOuro(x, (av.titulo || '').toUpperCase(), W / 2 + 10, 420, 112, W - 170);
  pincel(x, W / 2, 452, 760, 22, '#c8101a');
  // data / hora / local
  x.textAlign = 'center'; x.fillStyle = '#fff'; x.shadowColor = '#000'; x.shadowBlur = 10;
  x.font = '600 40px Montserrat, system-ui, sans-serif';
  const info = [];
  if (av.data) { const d = new Date(av.data + 'T12:00'); let s = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }); info.push('📅  ' + s.charAt(0).toUpperCase() + s.slice(1)); }
  if (av.hora) info.push('⏰  ' + av.hora.replace(':', 'h'));
  if (av.local) info.push('📍  ' + av.local);
  let y = 530; info.forEach(l => { x.fillText(l, W / 2, y); y += 58; });
  // separador com torii
  y += 4; x.shadowBlur = 0; x.strokeStyle = '#f2c14e'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(W / 2 - 280, y - 12); x.lineTo(W / 2 - 40, y - 12); x.moveTo(W / 2 + 40, y - 12); x.lineTo(W / 2 + 280, y - 12); x.stroke();
  x.font = '38px system-ui'; x.fillText('⛩', W / 2, y); y += 56;
  // mensagem
  x.fillStyle = '#fff'; x.shadowColor = '#000'; x.shadowBlur = 10; x.font = '600 36px Montserrat, system-ui, sans-serif';
  quebrar(x, av.msg || '', W - 220).slice(0, 3).forEach(l => { x.fillText(l, W / 2, y); y += 46; });
  // destaque em faixa vermelha
  if (av.destaque) {
    y += 34; x.shadowBlur = 0;
    pincel(x, W / 2, y - 22, 700, 96, 'rgba(176,10,18,.95)');
    textoOuro(x, av.destaque.toUpperCase(), W / 2 + 6, y + 6, 66, 600);
  }
  x.shadowBlur = 0;
}
async function avisoPDF() {
  await fontesAviso; desenharAviso();
  const c = $('#preview');
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
  const pdf = pdfDeImagemJPEG(new Uint8Array(await blob.arrayBuffer()), c.width, c.height);
  compartilharArquivo(new File([pdf], `Aviso ${MODELOS[av.modelo].titulo}.pdf`, { type: 'application/pdf' }), av.titulo);
}
async function enviarAviso() {
  await fontesAviso; desenharAviso();
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
    html += `<div class="card"><div class="linha"><span class="faixa" style="background:${corFaixa(t, a.faixa)}"></span><span class="nome grow" onclick="editarAluno('${t}','${a.id}')">${esc(a.nome)}</span>
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
// ---------- e-mail automático ----------
const CHAVE_FILA = 'karate-fila-email';
function filaEmail() { try { return JSON.parse(localStorage.getItem(CHAVE_FILA)) || []; } catch { return []; } }
function gravarFila(f) { localStorage.setItem(CHAVE_FILA, JSON.stringify(f)); }
function salvarEmail() {
  D.email = { ...(D.email || {}), url: $('#emUrl').value.trim(), codigo: $('#emCod').value.trim(), para: $('#emPara') ? $('#emPara').value.trim() : D.email?.para };
  salvar(); toast('Configuração de e-mail salva');
}
async function postarEmail(item) {
  const r = await fetch(D.email.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...item, para: D.email.para, codigo: D.email.codigo }) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.erro || 'falhou');
}
function enfileirarEmail(item) { const f = filaEmail(); f.push(item); gravarFila(f); enviarFila(true); }
let enviando = false;
async function enviarFila(avisar) {
  if (enviando || !D.email?.url) return;
  let f = filaEmail(); if (!f.length) return;
  enviando = true;
  let ok = 0, erro = '';
  while (f.length) {
    try { await postarEmail(f[0]); f.shift(); gravarFila(f); ok++; }
    catch (e) { erro = navigator.onLine ? e.message : 'sem internet'; break; }
  }
  enviando = false;
  if (ok) toast(`📧 ${ok} lista(s) de presença enviada(s) por e-mail`);
  else if (avisar) toast(`📧 Não enviou agora (${erro}). Vai tentar de novo sozinho.`, 4000);
}
async function testarEmail() {
  salvarEmail();
  if (!D.email.url) return toast('Cole o link do script primeiro');
  if (!D.email.para) return toast('Digite o e-mail de destino');
  $('#emStatus').textContent = 'Enviando teste…';
  try {
    await postarEmail({ turma: 'TESTE', data: dataBR(hoje()), alunos: [{ nome: 'Aluno de teste', faixa: 'Azul clara', presente: true }] });
    $('#emStatus').textContent = '✔ Teste enviado! Confira a caixa de entrada.';
  } catch (e) { $('#emStatus').textContent = '✖ Falhou: ' + (navigator.onLine ? e.message : 'sem internet'); }
}
window.addEventListener('online', () => enviarFila(false));
setInterval(() => enviarFila(false), 5 * 60 * 1000);

render();
enviarFila(false);
(() => { const n = pendentes('infantil'); if (n) setTimeout(() => toast(`⚠ ${n} mensalidade(s) pendente(s) na Turma Infantil`, 4000), 600); })();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
