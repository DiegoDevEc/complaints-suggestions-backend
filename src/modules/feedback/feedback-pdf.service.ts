import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Feedback } from './schemas/feedback.schema';

interface PdfObject {
  id: number;
  content: Buffer;
}

interface JpegImage {
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
  private readonly publicFeedbackBaseUrl: string;
  private readonly logoCache = new Map<string, Promise<JpegImage | null>>();

  constructor(private readonly configService: ConfigService) {
    this.siteLogoUrl = this.configService.get<string>('PUBLIC_SITE_LOGO_URL') ?? undefined;
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

    const logoPromise = this.fetchLogo();
    const qrPromise = this.fetchQrImage(caseUrl);

    const [logoImage, qrImage] = await Promise.all([logoPromise, qrPromise]);

    const logoId = logoImage ? this.reserveId() : null;
    const qrId = qrImage ? this.reserveId() : null;
    const contentId = this.reserveId();

    const objects: PdfObject[] = [];

    objects.push({
      id: fontId,
      content: Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n'),
    });

    const xObjects: string[] = [];

    if (logoImage && logoId) {
      objects.push({
        id: logoId,
        content: this.buildJpegObject(logoImage),
      });
      xObjects.push(`/ImLogo ${logoId} 0 R`);
    }

    if (qrImage && qrId) {
      objects.push({
        id: qrId,
        content: this.buildJpegObject(qrImage),
      });
      xObjects.push(`/ImQR ${qrId} 0 R`);
    }

    const contentStream = this.buildContentStream(feedback, {
      logo: logoImage ? { id: logoId!, image: logoImage } : null,
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
      content: Buffer.from(`<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>\n`),
    });

    objects.push({
      id: catalogId,
      content: Buffer.from(`<< /Type /Catalog /Pages ${pagesId} 0 R >>\n`),
    });

    return this.buildPdf({ objects, catalogId });
  }

  private reserveId(): number {
    if (!this.nextId) {
      this.nextId = 1;
    }
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
      logo: { id: number; image: JpegImage } | null;
      qr: { id: number; image: JpegImage } | null;
      caseUrl: string;
    },
  ): Buffer {
    const parts: string[] = [];
    const margin = 50;
    let cursorY = A4_HEIGHT - margin;

    if (options.logo) {
      const displayWidth = 120;
      const displayHeight = (displayWidth * options.logo.image.height) / options.logo.image.width;
      const yPosition = cursorY - displayHeight;
      parts.push(
        this.drawImage('ImLogo', options.logo.id, margin, yPosition, displayWidth, displayHeight),
      );
      cursorY = yPosition - 20;
    } else {
      cursorY -= 20;
    }

    cursorY = this.drawCenteredText(parts, cursorY, 20, 'Constancia de Registro de Queja') - 10;

    cursorY = this.drawText(parts, margin, cursorY, 12, `Número de caso: ${feedback.caseNumber}`) - 14;
    cursorY = this.drawText(parts, margin, cursorY, 12, `Tipo de feedback: ${feedback.type}`) - 14;

    const expeditionDate = this.formatDate(new Date());
    cursorY =
      this.drawText(parts, margin, cursorY, 12, `Fecha de expedición: ${expeditionDate}`) - 18;

    cursorY = this.drawText(
      parts,
      margin,
      cursorY,
      12,
      `Ciudadano: ${feedback.firstName} ${feedback.lastName}`,
    ) - 14;

    cursorY = this.drawText(parts, margin, cursorY, 12, `Email: ${feedback.email}`) - 20;

    cursorY = this.drawText(parts, margin, cursorY, 12, 'Texto de la queja:') - 16;
    cursorY = this.drawParagraph(parts, feedback.description, margin, cursorY, 12, A4_WIDTH - margin * 2);

    const qrSize = 140;
    if (options.qr) {
      const qrX = A4_WIDTH - margin - qrSize;
      const qrY = margin + 80;
      parts.push(this.drawImage('ImQR', options.qr.id, qrX, qrY, qrSize, qrSize));
      this.drawText(
        parts,
        qrX,
        qrY - 12,
        10,
        'Escanea el código para consultar el caso.',
      );
    }

    this.drawText(parts, margin, margin + 60, 12, `URL del caso: ${options.caseUrl}`);

    this.drawCenteredText(
      parts,
      margin + 20,
      10,
      'Este documento ha sido generado automáticamente por el Sistema de Quejas. No requiere firma.',
    );

    return Buffer.from(parts.join('\n'));
  }

  private drawText(
    parts: string[],
    x: number,
    y: number,
    fontSize: number,
    text: string,
  ): number {
    const escaped = this.escapePdfString(text);
    parts.push(
      `BT /F1 ${fontSize} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escaped}) Tj ET`,
    );
    return y - fontSize * 1.2;
  }

  private drawCenteredText(parts: string[], y: number, fontSize: number, text: string): number {
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
      if (this.estimateTextWidth(candidate, fontSize) > maxWidth && line.length > 0) {
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
    return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  private estimateTextWidth(text: string, fontSize: number): number {
    return text.length * (fontSize * 0.5);
  }

  private buildJpegObject(image: JpegImage): Buffer {
    return Buffer.concat([
      Buffer.from(
        `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>\nstream\n`,
      ),
      image.data,
      Buffer.from('\nendstream\n'),
    ]);
  }

  private buildPdf(params: { objects: PdfObject[]; catalogId: number }): Buffer {
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

  private async fetchLogo(): Promise<JpegImage | null> {
    if (!this.siteLogoUrl) {
      return null;
    }

    if (!this.logoCache.has(this.siteLogoUrl)) {
      this.logoCache.set(this.siteLogoUrl, this.fetchJpeg(this.siteLogoUrl));
    }

    return this.logoCache.get(this.siteLogoUrl) ?? null;
  }

  private async fetchQrImage(caseUrl: string): Promise<JpegImage | null> {
    const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(caseUrl)}&format=jpg&margin=2&size=500`;
    return this.fetchJpeg(qrUrl);
  }

  private async fetchJpeg(url: string): Promise<JpegImage | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('jpeg') && !contentType.includes('jpg')) {
        throw new Error(`Contenido no soportado (${contentType || 'desconocido'})`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const data = Buffer.from(arrayBuffer);
      const dimensions = this.extractJpegDimensions(data);
      if (!dimensions) {
        throw new Error('No fue posible determinar las dimensiones del JPEG');
      }

      return {
        data,
        width: dimensions.width,
        height: dimensions.height,
      };
    } catch (error) {
      this.logger.warn(
        `No se pudo obtener la imagen desde ${url}: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  private extractJpegDimensions(data: Buffer): { width: number; height: number } | null {
    let offset = 2; // skip SOI
    while (offset < data.length) {
      if (data[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const marker = data[offset + 1];
      offset += 2;

      if (marker === 0xd8 || marker === 0xd9) {
        continue;
      }

      const length = data.readUInt16BE(offset);
      if (length < 2) {
        return null;
      }

      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const height = data.readUInt16BE(offset + 3);
        const width = data.readUInt16BE(offset + 5);
        return { width, height };
      }

      offset += length;
    }

    return null;
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
