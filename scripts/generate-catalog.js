
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PARTS_DIR = path.join(__dirname, '../public/ldraw/parts');
const CATALOG_FILE = path.join(__dirname, '../public/ldraw/parts-catalog.json');

// Helper to parse a single DAT file
function parseDatFile(filename) {
  const filepath = path.join(PARTS_DIR, filename);
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n');
    
    // First line is usually the description
    // Extract description from "0 Description" or just take the first line if it starts with "0 "
    let description = '';
    const firstLine = lines[0].trim();
    if (firstLine.startsWith('0 ')) {
      description = firstLine.substring(2).trim();
    }
    
    // Look for !CATEGORY and !KEYWORDS
    let category = '';
    let keywords = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('0 !CATEGORY ')) {
        category = trimmed.substring(12).trim();
      } else if (trimmed.startsWith('0 !KEYWORDS ')) {
        const kw = trimmed.substring(12).split(',').map(k => k.trim());
        keywords.push(...kw);
      }
      
      // Stop early if we found everything or searched enough lines
      if (category && keywords.length > 0) break; 
    }
    
    return {
      p: filename.replace('.dat', ''), // Part number
      d: description,
      c: category,
      k: keywords.length > 0 ? keywords : undefined
    };
    
  } catch (err) {
    console.error(`Error parsing ${filename}:`, err.message);
    return null;
  }
}

async function generateCatalog() {
  console.log(`Scanning parts in ${PARTS_DIR}...`);
  
  try {
    const files = fs.readdirSync(PARTS_DIR).filter(f => f.toLowerCase().endsWith('.dat'));
    console.log(`Found ${files.length} parts. Parsing...`);
    
    const catalog = [];
    let processed = 0;
    
    for (const file of files) {
      const entry = parseDatFile(file);
      if (entry) {
        catalog.push(entry);
      }
      
      processed++;
      if (processed % 1000 === 0) {
        console.log(`Processed ${processed}/${files.length} parts...`);
      }
    }
    
    console.log(`Finished parsing. Writing catalog with ${catalog.length} entries...`);
    
    fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog), 'utf8'); // Minified JSON
    console.log(`Catalog saved to ${CATALOG_FILE}`);
    
  } catch (err) {
    console.error('Error generating catalog:', err);
    process.exit(1);
  }
}

generateCatalog();
