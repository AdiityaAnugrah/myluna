import fs from 'fs';
import path from 'path';
import { connectDatabase } from '../config/database';
import Product from '../models/Product';
import Category from '../models/Category';

// Helper to parse SQL value string
// The dump has values like: ('id', 'name', ..., 0xBlob, ...)
// We need to parse this carefully.
// A simpler approach for the specific file structure seen:
// The lines start with INSERT INTO or are part of the values list.
// We can assume standard SQL escaping.

async function importProducts() {
  await connectDatabase();
  console.log('Connected to database.');

  // Optionally clear existing products to ensure update
  // await Product.destroy({ where: {}, truncate: true, cascade: true });
  // console.log('Cleared existing products.');
  
  // Actually, let's keep it safe. If we want to update, we use upsert or just destroy manually.
  // For this run, since we want to populate new fields on existing items, 
  // destroying is cleaner given it's a dev environment import.
  // BUT constraints might block it (Sales).
  // Let's rely on `upsert` or findOneAndUpdate logic.
  
  // Since the previous script effectively skips if SKU exists, we need to change that.
  // We should update if exists.

  const sqlPath = path.resolve(__dirname, '../../../barang (1).sql');
  console.log(`Reading SQL file from: ${sqlPath}`);

  if (!fs.existsSync(sqlPath)) {
    console.error('SQL file not found!');
    process.exit(1);
  }

  const content = fs.readFileSync(sqlPath, 'utf-8');
  
  // We need to extract the tuples inside VALUES (...), (...);
  // Matches tuples taking into account quoted strings and escaped quotes
  // This Regex is tricky. 
  // Given the structure: ('val', 'val', ...), ('val', ...)
  
  // Let's iterate manually or split by `),(`
  // First, find the start of VALUES
  const valuesStartIndex = content.indexOf('VALUES');
  if (valuesStartIndex === -1) {
    console.error('No VALUES found in SQL file');
    process.exit(1);
  }

  // Slice from after VALUES
  let dataStr = content.slice(valuesStartIndex + 6).trim();
  // Remove trailing semicolon if exists
  if (dataStr.endsWith(';')) {
    dataStr = dataStr.slice(0, -1);
  }

  // Rough split by `),\n(` or `), (` might be dangerous if text contains that.
  // Using a simplified regex to extract values might be safer if we assume the format is consistent.
  // The dump shows `INSERT INTO ... VALUES\n('...', ...),`.
  // Let's try splitting by `),\r\n(` or `),(` which seems to be the separator.
  
  // Normalizing newlines
  // The file view showed newlines between rows: `),` followed by newline and `(`.
  const rows = dataStr.split(/\),\s*\(/);

  console.log(`Found approximately ${rows.length} rows to process.`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i++) {
    let row = rows[i];
    // Clean up leading `(` of first item and trailing `)` of last item
    if (i === 0) row = row.replace(/^\s*\(/, '');
    if (i === rows.length - 1) row = row.replace(/\)\s*$/, '');

    // Now we have a comma separated list of values for one record.
    // We need to split by comma, BUT ignoring commas inside quotes.
    // Simple parser:
    const values: string[] = [];
    let currentVal = '';
    let inQuote = false;
    let escape = false;

    for (let charIndex = 0; charIndex < row.length; charIndex++) {
        const char = row[charIndex];
        
        if (escape) {
            currentVal += char;
            escape = false;
            continue;
        }

        if (char === '\\') {
            escape = true;
            currentVal += char; // Keep escape for now? Or process it. SQL dumps usually escape single quotes as \' or ''.
            continue;
        }

        if (char === "'" && !escape) {
            inQuote = !inQuote;
            currentVal += char;
            continue;
        }

        if (char === ',' && !inQuote) {
            values.push(currentVal.trim());
            currentVal = '';
            continue;
        }

        currentVal += char;
    }
    values.push(currentVal.trim()); // Last value

    // Map values based on schema
    // 0: id
    // 1: nama
    // 2: path
    // 3: pencarian
    // 4: gambar (BLOB - starts with 0x)
    // 5: harga
    // 6: rate
    // 7: stok
    // 8: deskripsi
    // 9: deskripsi_nonhtml
    // 10: kategori
    // 11: subkategori
    // 12: diskon
    // 13: berat
    // 14: dimensi
    // ...

    const sanitize = (str: string) => {
        if (str.startsWith("'") && str.endsWith("'")) {
            return str.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
        }
        return str;
    };

    try {
        const legacyId = sanitize(values[0]);
        const name = sanitize(values[1]);
        // const imageBlob = values[4]; // Skip
        const priceStr = sanitize(values[5]);
        const stockStr = sanitize(values[7]);
        const description = sanitize(values[8]); // HTML description
        const categoryName = sanitize(values[10]);
        const subCategoryName = sanitize(values[11]);
        const weightStr = sanitize(values[13]);
        const dimStr = sanitize(values[14]);

        const sellingPrice = parseFloat(priceStr) || 0;
        const stock = parseInt(stockStr) || 0;
        const weight = parseFloat(weightStr) || 0;

        // Dimensions: "60X40X60" or similar
        let length = 0, width = 0, height = 0;
        if (dimStr) {
            const dims = dimStr.toLowerCase().split('x');
            if (dims.length === 3) {
                length = parseFloat(dims[0]) || 0;
                width = parseFloat(dims[1]) || 0;
                height = parseFloat(dims[2]) || 0;
            }
        }

        // Category Logic
        let parentCategory = null;
        if (categoryName) {
            [parentCategory] = await Category.findOrCreate({
                where: { name: categoryName },
                defaults: {
                    name: categoryName,
                    isActive: true,
                    description: 'Imported category'
                }
            });
        }

        let finalCategoryId = parentCategory?.id;

        if (subCategoryName && parentCategory) {
            const [childCategory] = await Category.findOrCreate({
                where: { name: subCategoryName, parentId: parentCategory.id },
                defaults: {
                    name: subCategoryName,
                    parentId: parentCategory.id,
                    isActive: true,
                    description: 'Imported subcategory'
                }
            });
            finalCategoryId = childCategory.id;
        }

        // Default category if none
        if (!finalCategoryId) {
            const [defaultCat] = await Category.findOrCreate({
                where: { name: 'Uncategorized' },
                defaults: { name: 'Uncategorized', isActive: true }
            });
            finalCategoryId = defaultCat.id;
        }

        // Create Product

        // Parse Variants
        const variantsJson = values[15]; // index 15 is 'varian' column in dump
        let variants = null;
        try {
            if (variantsJson && variantsJson !== "''") {
                const cleanedJson = sanitize(variantsJson);
                variants = JSON.parse(cleanedJson);
            }
        } catch (e) {
            console.warn(`Failed to parse variants for ${name}`, e);
        }

        // Parse Marketplace Links
        const marketplaceLinks = {
            shopee: sanitize(values[17]),
            tokopedia: sanitize(values[18]),
            tiktok: sanitize(values[19]),
            youtube: sanitize(values[20])
        };

        const slug = sanitize(values[2]); // 'path' column is index 2

        // Check if exists by SKU (legacyId)
        const existingProduct = await Product.findOne({ where: { sku: legacyId } });
        
        const productData = {
            sku: legacyId,
            name: name,
            description: description,
            categoryId: finalCategoryId,
            // imageUrl: null, // Don't overwrite if not needed
            length,
            width,
            height,
            weight,
            unit: 'Pcs',
            purchasePrice: sellingPrice * 0.8,
            sellingPrice: sellingPrice,
            stock: stock,
            minStock: 1,
            isActive: true,
            variants,
            marketplaceLinks,
            slug
        };

        if (existingProduct) {
            await existingProduct.update(productData);
            console.log(`Updated: ${name} (${legacyId})`);
        } else {
            await Product.create(productData);
            console.log(`Imported: ${name}`);
        }
        
        successCount++;

    } catch (err) {
        console.error(`Error processing row ${i}:`, err);
        errorCount++;
    }
  }

  console.log(`Import finished. Success: ${successCount}, Errors: ${errorCount}`);
  process.exit(0);
}

importProducts().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
