/**
 * fixBrands.js
 *
 * Migration script:
 *  1. Delete "ANV Fashion" from brands collection (it's a shop name, not a brand)
 *  2. Upsert all correct brand entries (from WDP.brands.json + missing brands)
 *  3. Update every product's brand_id based on keyword match in product name
 *
 * Run: node src/seed/fixBrands.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");
const fs   = require("fs");

const MONGO_URI = process.env.MONGO_URI;

// ─── Brand definitions ───────────────────────────────────────────────────────
// id: use existing IDs already referenced in products where possible
// keywords: lowercase substrings matched against product name
const BRANDS = [
  // ── From WDP.brands.json (already in DB, keep IDs) ──────────────────────
  {
    _id: "brd-5ef8718e-be1a-4c84-a5c5-f3b1fda33d90",
    name: "Louis Vuitton (LV)",
    slug: "louis-vuitton",
    country: "France",
    keywords: ["louis vuitton", "lv bag", "lv "],
  },
  {
    _id: "brd-010e9e76-dfe7-4f22-9158-2c15c6adf319",
    name: "Chanel",
    slug: "chanel",
    country: "France",
    keywords: ["chanel"],
  },
  {
    _id: "brd-adcbe7ec-ffe2-4386-8449-82f29c6b82cf",
    name: "Hermès",
    slug: "hermes",
    country: "France",
    keywords: ["hermès", "hermes"],
  },
  {
    _id: "brd-04851d43-16aa-45c5-bb4a-f91f1f789e52",
    name: "Gucci",
    slug: "gucci",
    country: "Italy",
    keywords: ["gucci"],
  },
  {
    _id: "brd-54f95c67-f0a6-49d3-9b89-c3325506c9b2",
    name: "Dior",
    slug: "dior",
    country: "France",
    keywords: ["dior"],
  },
  {
    _id: "brd-d0e76026-1ddf-4ff7-b07b-f19e992506b0",
    name: "Prada",
    slug: "prada",
    country: "Italy",
    keywords: ["prada"],
  },
  {
    _id: "brd-ec799272-2c37-438d-b8cb-6d8eb10f1fac",
    name: "Adidas",
    slug: "adidas",
    country: "Germany",
    keywords: ["adidas"],
  },
  {
    _id: "brd-294d0a07-893c-4a8d-afff-cc277a43cfc2",
    name: "Balenciaga",
    slug: "balenciaga",
    country: "Spain",
    keywords: ["balenciaga"],
  },
  {
    _id: "brd-d49efd9f-59ce-44f6-8dd0-20ae40bf9641",
    name: "Versace",
    slug: "versace",
    country: "Italy",
    keywords: ["versace"],
  },
  {
    _id: "brd-48a89ac0-2f0d-4379-b520-9c67e1ee1c70",
    name: "Zara",
    slug: "zara",
    country: "Spain",
    keywords: ["zara"],
  },

  // ── Missing brands referenced by products (create if not exist) ──────────
  {
    _id: "brd-adcd511e-cd73-45ab-ace8-3573ca745c4a",
    name: "Nike",
    slug: "nike",
    country: "USA",
    keywords: ["nike"],
  },
  {
    _id: "brd-17cdcb35-2133-4aaa-9571-ea36dc2c51e7",
    name: "Uniqlo",
    slug: "uniqlo",
    country: "Japan",
    keywords: ["uniqlo"],
  },
  {
    _id: "brd-b5d4fc21-d270-4a03-b35e-c3ff97d74a96",
    name: "H&M",
    slug: "hm",
    country: "Sweden",
    keywords: ["h&m"],
  },
  {
    _id: "brd-a4c724bd-dfa5-4a8f-866a-39aea4d9641f",
    name: "Guess",
    slug: "guess",
    country: "USA",
    keywords: ["guess"],
  },
  {
    _id: "brd-9cf5112b-94f1-4679-b239-18e7a9a58e36",
    name: "Calvin Klein",
    slug: "calvin-klein",
    country: "USA",
    keywords: ["calvin klein", "ck underwear", "ck "],
  },

  // ── Additional brands (new IDs) ──────────────────────────────────────────
  {
    _id: "brd-levi-0000-0000-0000-000000000001",
    name: "Levi's",
    slug: "levis",
    country: "USA",
    keywords: ["levi's", "levis"],
  },
  {
    _id: "brd-puma-0000-0000-0000-000000000002",
    name: "Puma",
    slug: "puma",
    country: "Germany",
    keywords: ["puma"],
  },
  {
    _id: "brd-ua00-0000-0000-0000-000000000003",
    name: "Under Armour",
    slug: "under-armour",
    country: "USA",
    keywords: ["under armour"],
  },
  {
    _id: "brd-mng0-0000-0000-0000-000000000004",
    name: "Mango",
    slug: "mango",
    country: "Spain",
    keywords: ["mango"],
  },
  {
    _id: "brd-onrn-0000-0000-0000-000000000005",
    name: "On Running",
    slug: "on-running",
    country: "Switzerland",
    keywords: ["on running"],
  },
  {
    _id: "brd-nb00-0000-0000-0000-000000000006",
    name: "New Balance",
    slug: "new-balance",
    country: "USA",
    keywords: ["new balance"],
  },
  {
    _id: "brd-conv-0000-0000-0000-000000000007",
    name: "Converse",
    slug: "converse",
    country: "USA",
    keywords: ["converse"],
  },
  {
    _id: "brd-lcos-0000-0000-0000-000000000008",
    name: "Lacoste",
    slug: "lacoste",
    country: "France",
    keywords: ["lacoste"],
  },
  {
    _id: "brd-tnf0-0000-0000-0000-000000000009",
    name: "The North Face",
    slug: "the-north-face",
    country: "USA",
    keywords: ["the north face", "north face"],
  },
  {
    _id: "brand-5ba2a9c6-0280-4b27-bde7-efdccaa91284",
    name: "DFS",
    slug: "dfs",
    country: "Vietnam",
    keywords: ["dfs "],
  },
  {
    _id: "brand-519cb6ea-28b5-4002-9e57-e0fe63e27dc6",
    name: "Minimal Form",
    slug: "minimal-form",
    country: "Vietnam",
    keywords: ["minimal form"],
  },
  {
    _id: "brand-a50caedb-2726-45dc-b047-1f1129f4f4aa",
    name: "BlueWave",
    slug: "bluewave",
    country: "Vietnam",
    keywords: ["bluewave"],
  },
  {
    _id: "brand-651a7b21-75bf-4091-8eb8-ba12af8fda70",
    name: "IVY moda",
    slug: "ivy-moda",
    country: "Vietnam",
    keywords: ["ivy moda", "ivy "],
  },
  {
    _id: "brand-df2cae75-1636-4ca7-af90-8bd64aa42830",
    name: "Levents",
    slug: "levents",
    country: "Vietnam",
    keywords: ["levents"],
  },
  {
    _id: "brand-0cec8794-3945-407c-a12e-b04cc41e6fcb",
    name: "1ZEM",
    slug: "1zem",
    country: "Vietnam",
    keywords: ["1zem"],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectBrand(productName) {
  const lower = productName.toLowerCase();
  for (const brand of BRANDS) {
    for (const kw of brand.keywords) {
      if (lower.includes(kw)) return brand._id;
    }
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  const brandsCol   = db.collection("brands");
  const productsCol = db.collection("products");

  // 1. Remove shop-name brands (not real brands)
  //    Catches: "ANV Fashion", "Acme Fashion", or any brand whose _id starts with "brand-"
  //    but is NOT one of the real brand IDs we manage.
  const realBrandIds = new Set(BRANDS.map((b) => b._id));
  const allBrands = await brandsCol.find({}).toArray();
  const fakeIds = allBrands
    .filter((b) => !realBrandIds.has(b._id))
    .map((b) => b._id);

  if (fakeIds.length > 0) {
    const deleted = await brandsCol.deleteMany({ _id: { $in: fakeIds } });
    console.log(`Deleted ${deleted.deletedCount} shop-name/fake brand(s):`, fakeIds);
    // Nullify brand_id on products that pointed to fake brands
    const nullified = await productsCol.updateMany(
      { brand_id: { $in: fakeIds } },
      { $set: { brand_id: null, updatedAt: new Date() } }
    );
    console.log(`Nullified brand_id on ${nullified.modifiedCount} product(s) linked to fake brands`);
  } else {
    console.log("No shop-name/fake brands found");
  }

  // 2. Upsert all correct brand entries
  let upserted = 0;
  for (const brand of BRANDS) {
    await brandsCol.updateOne(
      { _id: brand._id },
      {
        $setOnInsert: {
          _id:          brand._id,
          name:         brand.name,
          slug:         brand.slug,
          country:      brand.country,
          gender_focus: "mixed",
          is_active:    true,
          seo:          { keywords: [] },
          createdAt:    new Date(),
          updatedAt:    new Date(),
        },
      },
      { upsert: true }
    );
    upserted++;
  }
  console.log(`Upserted ${upserted} brand entries`);

  // 3. Fix every product's brand_id based on product name
  const products = await productsCol.find({}).toArray();
  let fixed = 0, skipped = 0;

  for (const product of products) {
    const correctId = detectBrand(product.name);
    if (!correctId) {
      skipped++;
      continue;
    }
    if (product.brand_id !== correctId) {
      await productsCol.updateOne(
        { _id: product._id },
        { $set: { brand_id: correctId, updatedAt: new Date() } }
      );
      console.log(
        `  Fixed: "${product.name}"\n    ${product.brand_id} → ${correctId}`
      );
      fixed++;
    }
  }

  console.log(`\nFixed ${fixed} existing products, ${skipped} had no keyword match (left unchanged).`);

  // 4. Import all products from WDP.products.json with correct brand_ids
  const jsonPath = path.resolve(__dirname, "../../../db/WDP.products.json");
  if (fs.existsSync(jsonPath)) {
    const rawProducts = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    let imported = 0, brandFixed = 0;

    for (const raw of rawProducts) {
      // Resolve $date fields
      const doc = JSON.parse(JSON.stringify(raw), (key, val) => {
        if (val && typeof val === "object" && val.$date) return new Date(val.$date);
        return val;
      });

      // Fix brand_id
      const detectedId = detectBrand(doc.name);
      if (detectedId && doc.brand_id !== detectedId) {
        console.log(`  Brand fix: "${doc.name}" ${doc.brand_id} → ${detectedId}`);
        doc.brand_id = detectedId;
        brandFixed++;
      }

      await productsCol.updateOne(
        { _id: doc._id },
        { $set: doc },
        { upsert: true }
      );
      imported++;
    }
    console.log(`Imported/upserted ${imported} products from WDP.products.json (${brandFixed} brand_ids corrected).`);
  } else {
    console.log("WDP.products.json not found, skipping product import.");
  }

  console.log("\nAll done.");
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
