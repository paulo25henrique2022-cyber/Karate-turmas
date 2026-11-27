// Gerador de PDF mínimo (A4, Helvetica, acentos do português). Sem bibliotecas externas.
class MiniPDF {
  constructor() { this.paginas = []; this.imagens = []; this.novaPagina(); }
  novaPagina() { this.ops = []; this.paginas.push(this.ops); }
  static txt(s) {
    // converte para WinAnsi (latin-1 cobre os acentos do português) e escapa
    let o = '';
    for (const ch of String(s)) {
      let c = ch.charCodeAt(0);
      if (ch === '–' || ch === '—') c = 0x2d;
      else if (ch === '•') c = 0x95;
      else if (ch === '≈') c = 0x7e; // ~
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
  // imagem JPEG ({bytes,w,h}); x, y, w, h em mm, y de cima para baixo
  imagem(x, y, w, h, img) {
    let i = this.imagens.indexOf(img); if (i < 0) { this.imagens.push(img); i = this.imagens.length - 1; }
    const k = 2.8346;
    this.ops.push(`q ${(w * k).toFixed(1)} 0 0 ${(h * k).toFixed(1)} ${(x * k).toFixed(1)} ${((297 - y - h) * k).toFixed(1)} cm /Im${i + 1} Do Q`);
  }
  blob() {
    const objs = [];
    const add = s => { objs.push(s); return objs.length; };
    const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const imgIds = this.imagens.map(im => add({ cab: `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`, bytes: im.bytes }));
    const xo = imgIds.length ? ` /XObject << ${imgIds.map((id, i) => `/Im${i + 1} ${id} 0 R`).join(' ')} >>` : '';
    const paisId = objs.length + 1 + this.paginas.length * 2;
    const kids = [];
    for (const ops of this.paginas) {
      const conteudo = ops.join('\n');
      const c = add(`<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`);
      kids.push(add(`<< /Type /Page /Parent ${paisId} 0 R /MediaBox [0 0 595.3 841.9] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >>${xo} >> /Contents ${c} 0 R >>`));
    }
    add(`<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`);
    const cat = add(`<< /Type /Catalog /Pages ${paisId} 0 R >>`);
    const partes = []; let tam = 0;
    const put = s => { const b = typeof s === 'string' ? Uint8Array.from(s, c => c.charCodeAt(0) & 255) : s; partes.push(b); tam += b.length; };
    put('%PDF-1.4\n');
    const pos = [];
    objs.forEach((o, i) => {
      pos.push(tam);
      if (typeof o === 'string') put(`${i + 1} 0 obj\n${o}\nendobj\n`);
      else { put(`${i + 1} 0 obj\n${o.cab}`); put(o.bytes); put('\nendstream\nendobj\n'); }
    });
    const xref = tam;
    put(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + pos.map(q => String(q).padStart(10, '0') + ' 00000 n \n').join(''));
    put(`trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(partes, { type: 'application/pdf' });
  }
}

// PDF de uma página com uma imagem JPEG ocupando a página inteira (usado nos avisos).
function pdfDeImagemJPEG(bytes, w, h) {
  const pw = 595.3, ph = pw * h / w; // largura A4, altura proporcional à imagem
  const conteudo = `q ${pw.toFixed(1)} 0 0 ${ph.toFixed(1)} 0 0 cm /Im1 Do Q`;
  const cab = s => new TextEncoder().encode(s);
  const partes = [], pos = [];
  let tam = 0;
  const push = p => { partes.push(p); tam += p.length; };
  push(cab('%PDF-1.4\n'));
  const obj = (n, antes, bin, depois) => { pos[n] = tam; push(cab(`${n} 0 obj\n${antes}`)); if (bin) push(bin); push(cab(`${depois || ''}\nendobj\n`)); };
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw.toFixed(1)} ${ph.toFixed(1)}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>`);
  obj(4, `<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`, bytes, '\nendstream');
  obj(5, `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`);
  const xref = tam;
  push(cab(`xref\n0 6\n0000000000 65535 f \n${[1, 2, 3, 4, 5].map(i => String(pos[i]).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
  return new Blob(partes, { type: 'application/pdf' });
}
