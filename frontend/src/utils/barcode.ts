import jsPDF from 'jspdf';
import { Product } from '@/types/product';

// Formats d'étiquettes standards pour imprimantes code-barres
export enum BarcodeLabelFormat {
  // Format standard 50x30mm
  STANDARD_50x30 = '50x30',
  // Format petit 40x25mm
  SMALL_40x25 = '40x25',
  // Format grand 60x40mm
  LARGE_60x40 = '60x40',
  // Format ticket 80x50mm
  TICKET_80x50 = '80x50',
}

interface LabelDimensions {
  width: number;
  height: number;
  fontSize: number;
  barcodeHeight: number;
  margin: number;
}

const LABEL_FORMATS: Record<BarcodeLabelFormat, LabelDimensions> = {
  [BarcodeLabelFormat.STANDARD_50x30]: {
    width: 50,
    height: 30,
    fontSize: 10,
    barcodeHeight: 15,
    margin: 2,
  },
  [BarcodeLabelFormat.SMALL_40x25]: {
    width: 40,
    height: 25,
    fontSize: 8,
    barcodeHeight: 12,
    margin: 2,
  },
  [BarcodeLabelFormat.LARGE_60x40]: {
    width: 60,
    height: 40,
    fontSize: 12,
    barcodeHeight: 20,
    margin: 3,
  },
  [BarcodeLabelFormat.TICKET_80x50]: {
    width: 80,
    height: 50,
    fontSize: 14,
    barcodeHeight: 25,
    margin: 4,
  },
};

// Générer un code-barres EAN-13
// Structure EAN-13 : 95 modules (barres et espaces)
// Pattern : Start (3) + Left (42) + Middle (5) + Right (42) + Stop (3)
function generateBarcodeImage(code: string, width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width * 3; // Haute résolution pour meilleure qualité
  canvas.height = height * 3;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // Fond blanc
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Normaliser le code à 13 chiffres
  let normalizedCode = code.replace(/\D/g, ''); // Enlever tout sauf les chiffres
  if (normalizedCode.length < 13) {
    normalizedCode = normalizedCode.padStart(13, '0');
  } else if (normalizedCode.length > 13) {
    normalizedCode = normalizedCode.substring(0, 13);
  }
  
  // Patterns EAN-13
  const patterns = {
    L: ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'],
    G: ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'],
    R: ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'],
  };
  
  const firstDigit = parseInt(normalizedCode[0]);
  const leftPattern = [
    'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'
  ][firstDigit];
  
  // Générer les barres
  let x = 0;
  const moduleWidth = canvas.width / 95;
  const barHeight = canvas.height * 0.8; // 80% de la hauteur pour les barres
  
  // Start pattern (3 modules)
  ctx.fillStyle = '#000000';
  ctx.fillRect(x, 0, moduleWidth, barHeight);
  x += moduleWidth;
  ctx.fillRect(x, 0, moduleWidth, barHeight);
  x += moduleWidth;
  
  // Left 6 digits (42 modules)
  for (let i = 1; i <= 6; i++) {
    const digit = parseInt(normalizedCode[i]);
    const pattern = patterns[leftPattern[i - 1] as 'L' | 'G'][digit];
    for (let j = 0; j < 7; j++) {
      if (pattern[j] === '1') {
        ctx.fillRect(x, 0, moduleWidth, barHeight);
      }
      x += moduleWidth;
    }
  }
  
  // Middle pattern (5 modules)
  x += moduleWidth;
  ctx.fillRect(x, 0, moduleWidth, barHeight);
  x += moduleWidth;
  x += moduleWidth;
  ctx.fillRect(x, 0, moduleWidth, barHeight);
  x += moduleWidth;
  
  // Right 6 digits (42 modules) - toujours pattern R
  for (let i = 7; i <= 12; i++) {
    const digit = parseInt(normalizedCode[i]);
    const pattern = patterns.R[digit];
    for (let j = 0; j < 7; j++) {
      if (pattern[j] === '1') {
        ctx.fillRect(x, 0, moduleWidth, barHeight);
      }
      x += moduleWidth;
    }
  }
  
  // Stop pattern (3 modules)
  ctx.fillRect(x, 0, moduleWidth, barHeight);
  x += moduleWidth;
  ctx.fillRect(x, 0, moduleWidth, barHeight);
  
  // Texte du code sous le code-barres
  ctx.fillStyle = '#000000';
  ctx.font = `${Math.floor(canvas.height / 6)}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(normalizedCode, canvas.width / 2, canvas.height - 5);
  
  return canvas.toDataURL('image/png');
}

export function generateBarcodeLabel(
  product: Product,
  quantity: number = 1,
  format: BarcodeLabelFormat = BarcodeLabelFormat.STANDARD_50x30
) {
  const dimensions = LABEL_FORMATS[format];
  const doc = new jsPDF({
    format: [dimensions.width, dimensions.height],
    unit: 'mm',
    orientation: 'landscape',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = dimensions.margin;

  // Nom du produit
  doc.setFontSize(dimensions.fontSize);
  doc.setFont('helvetica', 'bold');
  const productName = doc.splitTextToSize(product.name, pageWidth - 2 * margin);
  let yPos = margin + dimensions.fontSize;
  
  productName.forEach((line: string) => {
    doc.text(line, pageWidth / 2, yPos, { align: 'center' });
    yPos += dimensions.fontSize * 0.6;
  });

  // Code-barres (simulation - en production utiliser jsbarcode)
  const barcodeY = yPos + 2;
  const barcodeWidth = pageWidth - 2 * margin;
  const barcodeCode = product.barcode || product.sku;
  
  if (barcodeCode) {
    // Générer l'image du code-barres
    const barcodeImg = generateBarcodeImage(barcodeCode, barcodeWidth * 3, dimensions.barcodeHeight * 3);
    doc.addImage(barcodeImg, 'PNG', margin, barcodeY, barcodeWidth, dimensions.barcodeHeight);
    
    // Code sous le code-barres
    yPos = barcodeY + dimensions.barcodeHeight + 2;
    doc.setFontSize(dimensions.fontSize * 0.7);
    doc.setFont('helvetica', 'normal');
    doc.text(barcodeCode, pageWidth / 2, yPos, { align: 'center' });
  }

  // SKU
  if (product.sku) {
    yPos += dimensions.fontSize * 0.8;
    doc.setFontSize(dimensions.fontSize * 0.6);
    doc.text(`SKU: ${product.sku}`, pageWidth / 2, yPos, { align: 'center' });
  }

  // Prix (si disponible)
  if (product.salePrice) {
    yPos += dimensions.fontSize * 0.7;
    doc.setFontSize(dimensions.fontSize * 0.8);
    doc.setFont('helvetica', 'bold');
    doc.text(`${product.salePrice.toFixed(2)} €`, pageWidth / 2, yPos, { align: 'center' });
  }

  // Quantité (si > 1)
  if (quantity > 1) {
    yPos += dimensions.fontSize * 0.7;
    doc.setFontSize(dimensions.fontSize * 0.6);
    doc.setFont('helvetica', 'normal');
    doc.text(`Qté: ${quantity}`, pageWidth / 2, yPos, { align: 'center' });
  }

  const fileName = `etiquette-${product.sku || product.id}-${format}.pdf`;
  doc.save(fileName);
}

export function generateMultipleBarcodeLabels(
  items: Array<{ product: Product; quantity: number }>,
  format: BarcodeLabelFormat = BarcodeLabelFormat.STANDARD_50x30
) {
  const dimensions = LABEL_FORMATS[format];
  
  items.forEach((item, index) => {
    if (index > 0) {
      // Pour plusieurs étiquettes, on pourrait créer un PDF multi-pages
      // Pour l'instant, on génère des fichiers séparés
    }
    generateBarcodeLabel(item.product, item.quantity, format);
  });
}

