// Gerador de PDF mínimo (A4, Helvetica, acentos do português). Sem bibliotecas externas.
class MiniPDF {
  constructor() { this.paginas = []; this.novaPagina(); }
  novaPagina() { this.ops = []; this.paginas.push(this.ops); }
  static txt(s) {
    // converte para WinAnsi (latin-1 cobre os acentos do português) e escapa
    let o = '';
    for (const ch of String(s)) {
      let c = ch.charCodeAt(0);
      if (ch === '–' || ch === '—') c = 0x2d;
      else if (ch === '•') c = 0x95;
      else if (c > 255) c = 0x3f;
      const t = String.fromCharCode(c);
      o += (t === '(' || t === ')' || t === '\\') ? '\\' + t : t;
    }
    return o;
  }
  // y medido de cima para baixo (mm)
  texto(x, y, s, tam = 11, negrito = false, cor = [0, 0, 0]) {
    const X = x * 2.8346, Y = (297 - y) * 2.8346;
    this.ops.push(`${cor.map(v => (v / 255).toFixed(3)).join(' ')} rg BT /${negrito ? 'F2' : 'F1'} ${tam} Tf ${X.toFixed(1)} ${Y.toFixed(1)} Td (${MiniPDF.txt(s)}) Tj ET`);
  }
  retangulo(x, y, w, h, cor) {
    const k = 2.8346;
    this.ops.push(`${cor.map(v => (v / 255).toFixed(3)).join(' ')} rg ${(x * k).toFixed(1)} ${((297 - y - h) * k).toFixed(1)} ${(w * k).toFixed(1)} ${(h * k).toFixed(1)} re f`);
  }
  blob() {
    const objs = [];
    const add = s => { objs.push(s); return objs.length; };
    const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const paisId = objs.length + 1 + this.paginas.length * 2;
    const kids = [];
    for (const ops of this.paginas) {
      const conteudo = ops.join('\n');
      const c = add(`<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`);
      kids.push(add(`<< /Type /Page /Parent ${paisId} 0 R /MediaBox [0 0 595.3 841.9] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${c} 0 R >>`));
    }
    add(`<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`);
    const cat = add(`<< /Type /Catalog /Pages ${paisId} 0 R >>`);
    let out = '%PDF-1.4\n';
    const pos = [];
    objs.forEach((o, i) => { pos.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + pos.map(p => String(p).padStart(10, '0') + ' 00000 n \n').join('');
    out += `trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
    return new Blob([bytes], { type: 'application/pdf' });
  }
}
