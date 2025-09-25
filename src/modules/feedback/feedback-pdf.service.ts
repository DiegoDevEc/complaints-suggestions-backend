import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Feedback } from './schemas/feedback.schema';
import * as path from 'path';
import * as fs from 'fs';

interface PdfObject {
  id: number;
  content: Buffer;
}

interface ImageData {
  data: Buffer;
  width: number;
  height: number;
}

const A4_WIDTH = 595.28; // 210mm
const A4_HEIGHT = 841.89; // 297mm

@Injectable()
export class FeedbackPdfService {
  private readonly logger = new Logger(FeedbackPdfService.name);
  private readonly siteLogoUrl?: string;
  private readonly siteLogoMarcaAguaUrl?: string;
  private readonly publicFeedbackBaseUrl: string;
  private readonly logoCache = new Map<string, Promise<ImageData | null>>();
  private logoPath: string;
  private logoPathMarcaAgua: string;

  constructor(private readonly configService: ConfigService) {
    this.logoPath = path.join(
      process.cwd(),
      'dist',
      'img',
      'logo-distrito-quito2.jpg',
    );
    if (!fs.existsSync(this.logoPath)) {
      this.logoPath = path.join(
        process.cwd(),
        'src',
        'img',
        'logo-distrito-quito2.jpg',
      );
    }

    this.logoPathMarcaAgua = path.join(
      process.cwd(),
      'dist',
      'img',
      'logo-distrito-quito.jpg',
    );
    if (!fs.existsSync(this.logoPathMarcaAgua)) {
      this.logoPathMarcaAgua = path.join(
        process.cwd(),
        'src',
        'img',
        'logo-distrito-quito.jpg',
      );
    }

    this.siteLogoUrl =
      this.configService.get<string>('PUBLIC_SITE_LOGO_URL') ?? this.logoPath;

    this.siteLogoMarcaAguaUrl =
      this.configService.get<string>('PUBLIC_SITE_LOGO_URL') ??
      this.logoPathMarcaAgua;

    this.publicFeedbackBaseUrl =
      this.configService.get<string>('PUBLIC_FEEDBACK_BASE_URL') ??
      'https://tusistema.com/feedback';
  }

  async generateComplaintCertificate(feedback: Feedback): Promise<Buffer> {
    this.nextId = 1;
    const caseUrl = `${this.publicFeedbackBaseUrl.replace(/\/$/, '')}/${feedback.caseNumber}`;

    const catalogId = this.reserveId();
    const pagesId = this.reserveId();
    const pageId = this.reserveId();
    const fontId = this.reserveId();
    const fontDescriptorId = this.reserveId();
    const fontFileId = this.reserveId();

    const logoPromise = this.fetchLogo(this.siteLogoUrl ?? '');
    const logoPromiseMarcaAgua = this.fetchLogo(
      this.siteLogoMarcaAguaUrl ?? '',
    );
    const qrPromise = this.fetchQrImage(caseUrl);

    const [logoImage, qrImage, logoImageMarcaAgua] = await Promise.all([
      logoPromise,
      qrPromise,
      logoPromiseMarcaAgua,
    ]);

    const logoId = logoImage ? this.reserveId() : null;
    const logoMarcaAguaId = logoImageMarcaAgua ? this.reserveId() : null;
    const qrId = qrImage ? this.reserveId() : null;
    const contentId = this.reserveId();

    const objects: PdfObject[] = [];

    // === Fuente embebida (DejaVuSans) ===
    let fontPath = path.join(process.cwd(), 'dist', 'fonts', 'DejaVuSans.ttf');
    if (!fs.existsSync(fontPath)) {
      fontPath = path.join(process.cwd(), 'src', 'fonts', 'DejaVuSans.ttf');
    }
    const fontData = fs.readFileSync(fontPath);

    objects.push({
      id: fontFileId,
      content: Buffer.concat([
        Buffer.from(
          `<< /Length ${fontData.length} /Length1 ${fontData.length} >>\nstream\n`,
        ),
        fontData,
        Buffer.from('\nendstream\n'),
      ]),
    });

    objects.push({
      id: fontDescriptorId,
      content: Buffer.from(
        `<< /Type /FontDescriptor /FontName /DejaVuSans /Flags 32 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 800 /Descent -200 /CapHeight 700 /StemV 80 /FontFile2 ${fontFileId} 0 R >>\n`,
      ),
    });

    objects.push({
      id: fontId,
      content: Buffer.from(
        `<< /Type /Font /Subtype /TrueType /BaseFont /DejaVuSans /Encoding /WinAnsiEncoding /FontDescriptor ${fontDescriptorId} 0 R >>\n`,
      ),
    });

    // === Logo y QR ===
    const xObjects: string[] = [];

    if (logoImage && logoId) {
      objects.push({
        id: logoId,
        content: this.buildImageObject(logoImage),
      });
      xObjects.push(`/ImLogo ${logoId} 0 R`);
    }

    if (logoImageMarcaAgua && logoMarcaAguaId) {
      objects.push({
        id: logoMarcaAguaId,
        content: this.buildImageObject(logoImageMarcaAgua),
      });
      xObjects.push(`/ImLogoMarcaAgua ${logoMarcaAguaId} 0 R`);
    }

    if (qrImage && qrId) {
      objects.push({
        id: qrId,
        content: this.buildImageObject(qrImage),
      });
      xObjects.push(`/ImQR ${qrId} 0 R`);
    }

    const contentStream = this.buildContentStream(feedback, {
      logo: logoImage ? { id: logoId!, image: logoImage } : null,
      logoMarcaAgua: logoImageMarcaAgua
        ? { id: logoMarcaAguaId!, image: logoImageMarcaAgua }
        : null,
      qr: qrImage ? { id: qrId!, image: qrImage } : null,
      caseUrl,
    });

    objects.push({
      id: contentId,
      content: this.wrapStream(contentStream),
    });

    const resourcesParts = [`/Font << /F1 ${fontId} 0 R >>`];
    if (xObjects.length > 0) {
      resourcesParts.push(`/XObject << ${xObjects.join(' ')} >>`);
    }

    const resources = `<< ${resourcesParts.join(' ')} >>`;

    objects.push({
      id: pageId,
      content: Buffer.from(
        `<< /Type /Page /Parent ${pagesId} 0 R /Resources ${resources} /MediaBox [0 0 ${A4_WIDTH.toFixed(
          2,
        )} ${A4_HEIGHT.toFixed(2)}] /Contents ${contentId} 0 R >>\n`,
      ),
    });

    objects.push({
      id: pagesId,
      content: Buffer.from(
        `<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>\n`,
      ),
    });

    objects.push({
      id: catalogId,
      content: Buffer.from(`<< /Type /Catalog /Pages ${pagesId} 0 R >>\n`),
    });

    return this.buildPdf({ objects, catalogId });
  }

  private reserveId(): number {
    if (!this.nextId) this.nextId = 1;
    return this.nextId++;
  }
  private nextId = 1;

  private wrapStream(content: Buffer): Buffer {
    return Buffer.concat([
      Buffer.from(`<< /Length ${content.length} >>\nstream\n`),
      content,
      Buffer.from('\nendstream\n'),
    ]);
  }

  private buildContentStream(
    feedback: Feedback,
    options: {
      logo: { id: number; image: ImageData } | null;
      logoMarcaAgua: { id: number; image: ImageData } | null;
      qr: { id: number; image: ImageData } | null;
      caseUrl: string;
    },
  ): Buffer {
    const parts: string[] = [];
    const margin = 70;
    let cursorY = A4_HEIGHT - margin;

    // Marca de agua centrada
    this.logger.debug('Dibujando marca de agua');
    this.logger.debug(
      `Logo marca de agua: ${JSON.stringify(options.logoMarcaAgua?.id)}`,
    );
    this.logger.debug(`Logo: ${JSON.stringify(options.logo?.id)}`);
    if (options.logoMarcaAgua) {
      this.drawWatermark(
        parts,
        options.logoMarcaAgua.id,
        options.logoMarcaAgua.image,
      );
    }

    // Logo en cabecera (arriba izquierda)
    if (options.logo) {
      const displayWidth = 120;
      const displayHeight =
        (displayWidth * options.logo.image.height) / options.logo.image.width;
      const yPosition = cursorY - displayHeight;
      parts.push(
        this.drawImage(
          'ImLogo',
          options.logo.id,
          margin,
          yPosition,
          displayWidth,
          displayHeight,
        ),
      );
      cursorY = yPosition - 30;
    }

    // Título principal
    cursorY =
      this.drawCenteredText(
        parts,
        cursorY,
        22,
        'Constancia de Registro de Queja',
      ) - 20;

    // Información del caso
    cursorY = this.drawText(
      parts,
      margin,
      cursorY,
      12,
      `Nro de caso: ${feedback.caseNumber}`,
    );
    cursorY = this.drawText(
      parts,
      margin,
      cursorY,
      12,
      `Tipo: ${feedback.type}`,
    );
    const expeditionDate = this.formatDate(new Date());
    cursorY =
      this.drawText(
        parts,
        margin,
        cursorY,
        12,
        `Fecha de registro: ${expeditionDate}`,
      ) - 10;

    // Datos del ciudadano
    cursorY = this.drawText(
      parts,
      margin,
      cursorY,
      12,
      `Nombre: ${feedback.firstName} ${feedback.lastName}`,
    );
    cursorY =
      this.drawText(parts, margin, cursorY, 12, `Email: ${feedback.email}`) -
      10;

    // Detalle de la queja
    cursorY = this.drawText(
      parts,
      margin,
      cursorY,
      12,
      'Detalle de la Denuncia / Queja:',
    );
    cursorY = this.drawParagraph(
      parts,
      feedback.description,
      margin,
      cursorY,
      12,
      A4_WIDTH - margin * 2,
    );

    // QR en la esquina inferior derecha
    if (options.qr) {
      const qrSize = 120;
      const qrX = A4_WIDTH - margin - qrSize;
      const qrY = margin + 100;
      parts.push(
        this.drawImage('ImQR', options.qr.id, qrX, qrY, qrSize, qrSize),
      );
      this.drawText(
        parts,
        qrX,
        qrY - 14,
        10,
        'Escanee para consultar el caso.',
      );
    }

    // Divider + Pie de página
    cursorY = this.drawDivider(parts, margin + 50);
    this.drawCenteredText(
      parts,
      margin + 35,
      10,
      'Documento emitido automáticamente por el Sistema de Quejas. No requiere firma.',
    );
    this.drawCenteredText(
      parts,
      margin + 20,
      10,
      `URL del caso: ${options.caseUrl}`,
    );

    return Buffer.from(parts.join('\n'), 'utf8');
  }

  // === Marca de agua ===
  private drawWatermark(
    parts: string[],
    objectId: number,
    image: ImageData,
  ): void {
    const scale = 0.6; // ocupa 60% del ancho de la página
    const wmWidth = A4_WIDTH * scale;
    const wmHeight = (wmWidth * image.height) / image.width;

    const x = (A4_WIDTH - wmWidth) / 2;
    const y = (A4_HEIGHT - wmHeight) / 2;

    // "0.9 g" → gris claro
    parts.push(
      `q 0.9 g ${wmWidth.toFixed(2)} 0 0 ${wmHeight.toFixed(
        2,
      )} ${x.toFixed(2)} ${y.toFixed(2)} cm /ImLogoMarcaAgua Do Q`,
    );
  }

  // === Helpers ===
  private drawDivider(parts: string[], y: number): number {
    parts.push(`${50} ${y} moveto ${A4_WIDTH - 50} ${y} lineto stroke`);
    return y - 10;
  }

  private encodeLatin1(text: string): string {
    return Buffer.from(text, 'utf8').toString('latin1');
  }

  private drawText(
    parts: string[],
    x: number,
    y: number,
    fontSize: number,
    text: string,
  ): number {
    const escaped = this.escapePdfString(text);
    const encoded = this.encodeLatin1(escaped);
    parts.push(
      `BT /F1 ${fontSize} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${encoded}) Tj ET`,
    );
    return y - fontSize * 1.2;
  }

  private drawCenteredText(
    parts: string[],
    y: number,
    fontSize: number,
    text: string,
  ): number {
    const estimatedWidth = this.estimateTextWidth(text, fontSize);
    const x = (A4_WIDTH - estimatedWidth) / 2;
    return this.drawText(parts, x, y, fontSize, text);
  }

  private drawParagraph(
    parts: string[],
    text: string,
    x: number,
    y: number,
    fontSize: number,
    maxWidth: number,
  ): number {
    const words = text.replace(/\s+/g, ' ').trim().split(' ');
    const lineHeight = fontSize * 1.5;
    let line = '';
    let cursorY = y;

    for (const word of words) {
      const candidate = line.length === 0 ? word : `${line} ${word}`;
      if (
        this.estimateTextWidth(candidate, fontSize) > maxWidth &&
        line.length > 0
      ) {
        this.drawText(parts, x, cursorY, fontSize, line.trim());
        cursorY -= lineHeight;
        line = word;
      } else {
        line = candidate;
      }
    }

    if (line.trim().length > 0) {
      this.drawText(parts, x, cursorY, fontSize, line.trim());
      cursorY -= lineHeight;
    }

    return cursorY;
  }

  private drawImage(
    name: string,
    objectId: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): string {
    return `q ${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /${name} Do Q`;
  }

  private escapePdfString(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  private estimateTextWidth(text: string, fontSize: number): number {
    return text.length * (fontSize * 0.5);
  }

  private buildImageObject(image: ImageData): Buffer {
    return Buffer.concat([
      Buffer.from(
        `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>\nstream\n`,
      ),
      image.data,
      Buffer.from('\nendstream\n'),
    ]);
  }

  private buildPdf(params: {
    objects: PdfObject[];
    catalogId: number;
  }): Buffer {
    const header = Buffer.from('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');
    const sorted = [...params.objects].sort((a, b) => a.id - b.id);

    const buffers: Buffer[] = [header];
    const offsets: number[] = [];
    let offset = header.length;

    for (const object of sorted) {
      const objHeader = Buffer.from(`${object.id} 0 obj\n`);
      const objFooter = Buffer.from('endobj\n');
      const content = Buffer.concat([objHeader, object.content, objFooter]);
      buffers.push(content);
      offsets.push(offset);
      offset += content.length;
    }

    const xrefPosition = offset;
    const xrefLines = ['xref', `0 ${sorted.length + 1}`, '0000000000 65535 f '];
    for (const entry of offsets) {
      xrefLines.push(`${entry.toString().padStart(10, '0')} 00000 n `);
    }
    xrefLines.push('');

    buffers.push(Buffer.from(xrefLines.join('\n')));

    const trailer = `trailer\n<< /Size ${sorted.length + 1} /Root ${params.catalogId} 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`;
    buffers.push(Buffer.from(trailer));

    return Buffer.concat(buffers);
  }

  // === Imagen local/remota ===
  private async fetchLogo(siteLogoUrl: string): Promise<ImageData | null> {
    if (!siteLogoUrl) return null;
    if (!this.logoCache.has(siteLogoUrl)) {
      if (siteLogoUrl.startsWith('http')) {
        this.logoCache.set(siteLogoUrl, this.fetchImage(siteLogoUrl));
      } else {
        this.logoCache.set(siteLogoUrl, this.fetchLocalImage(siteLogoUrl));
      }
    }
    return this.logoCache.get(siteLogoUrl) ?? null;
  }

  private async fetchLocalImage(filePath: string): Promise<ImageData | null> {
    try {
      const data = fs.readFileSync(filePath);
      let dimensions: { width: number; height: number } | null = null;
      if (filePath.endsWith('.png')) {
        dimensions = this.extractPngDimensions(data);
      } else {
        dimensions = this.extractJpegDimensions(data);
      }
      if (!dimensions) throw new Error('Dimensiones no válidas');
      return { data, width: dimensions.width, height: dimensions.height };
    } catch (error) {
      this.logger.warn(
        `No se pudo leer imagen local ${filePath}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return null;
    }
  }

  private async fetchQrImage(caseUrl: string): Promise<ImageData | null> {
    const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(caseUrl)}&format=jpg&margin=2&size=500`;
    return this.fetchImage(qrUrl);
  }

  private async fetchImage(url: string): Promise<ImageData | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const contentType = response.headers.get('content-type') ?? '';
      const arrayBuffer = await response.arrayBuffer();
      const data = Buffer.from(arrayBuffer);
      let dimensions: { width: number; height: number } | null = null;
      if (contentType.includes('png')) {
        dimensions = this.extractPngDimensions(data);
      } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
        dimensions = this.extractJpegDimensions(data);
      } else {
        throw new Error(`Formato no soportado (${contentType})`);
      }
      if (!dimensions) throw new Error('No se pudieron leer dimensiones');
      return { data, width: dimensions.width, height: dimensions.height };
    } catch (error) {
      this.logger.warn(
        `No se pudo obtener la imagen desde ${url}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return null;
    }
  }

  private extractJpegDimensions(
    data: Buffer,
  ): { width: number; height: number } | null {
    let offset = 2; // skip SOI
    while (offset < data.length) {
      if (data[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = data[offset + 1];
      offset += 2;
      if (marker === 0xd8 || marker === 0xd9) continue;
      const length = data.readUInt16BE(offset);
      if (length < 2) return null;
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        const height = data.readUInt16BE(offset + 3);
        const width = data.readUInt16BE(offset + 5);
        return { width, height };
      }
      offset += length;
    }
    return null;
  }

  private extractPngDimensions(
    data: Buffer,
  ): { width: number; height: number } | null {
    if (data.toString('ascii', 1, 4) !== 'PNG') return null;
    const width = data.readUInt32BE(16);
    const height = data.readUInt32BE(20);
    return { width, height };
  }

  private formatDate(date: Date): string {
    try {
      return new Intl.DateTimeFormat('es-PE', {
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return date.toISOString();
    }
  }
}
