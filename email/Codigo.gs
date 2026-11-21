// ====== Karatê – envio automático da lista de presença ======
// 1) Troque o CODIGO abaixo por uma senha sua (a mesma que vai no app).
const CODIGO = 'TROQUE-ESTA-SENHA';

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.codigo !== CODIGO) return resposta({ ok: false, erro: 'código secreto errado' });
    if (!d.para) return resposta({ ok: false, erro: 'nenhum e-mail de destino' });

    const alunos = d.alunos || [];
    const pres = alunos.filter(a => a.presente).length;
    const linhas = alunos.map((a, i) =>
      `<tr style="background:${i % 2 ? '#fff' : '#f5ecdc'}"><td>${i + 1}</td><td>${esc(a.nome)}</td><td>${esc(a.faixa)}</td>
       <td style="font-weight:bold;color:${a.presente ? '#147828' : '#c81e1e'}">${a.presente ? 'Presente' : 'Falta'}</td></tr>`).join('');
    const html = `<div style="font-family:Arial,sans-serif">
      <div style="background:#4a2a14;color:#f2c14e;padding:14px 18px;border-bottom:4px solid #c8202a">
        <div style="font-size:22px;font-weight:bold">LISTA DE PRESENÇA</div>
        <div style="color:#fff6e6">${esc(d.turma)} • ${esc(d.data)}</div></div>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:14px" cellpadding="6">
        <tr style="text-align:left"><th>Nº</th><th>Aluno</th><th>Faixa</th><th>Situação</th></tr>${linhas}</table>
      <p style="font-weight:bold;margin-top:14px">Total: ${alunos.length} alunos • Presentes: ${pres} • Faltas: ${alunos.length - pres}</p></div>`;

    const pdf = Utilities.newBlob(html, 'text/html', 'lista.html').getAs('application/pdf')
      .setName(`Chamada ${d.turma} ${String(d.data).replace(/\//g, '-')}.pdf`);
    MailApp.sendEmail({
      to: d.para,
      subject: `Lista de presença – ${d.turma} – ${d.data}`,
      htmlBody: html,
      attachments: [pdf],
      name: 'Karatê – Chamada'
    });
    return resposta({ ok: true });
  } catch (err) {
    return resposta({ ok: false, erro: String(err) });
  }
}

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function resposta(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// Rode esta função uma vez pelo editor para autorizar o envio de e-mails.
function autorizar() { MailApp.getRemainingDailyQuota(); }
