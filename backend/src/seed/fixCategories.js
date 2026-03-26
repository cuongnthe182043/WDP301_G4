/**
 * Migration: Fix categories
 * - Keep only 4 valid root categories: Thời trang nam, Thời trang nữ, Unisex, Phụ kiện
 * - Remove ALL other root-level categories (parent_id: null) that are not in the valid list
 * - Add "Phụ kiện" (Accessories) if missing
 *
 * Run from project root: node backend/src/seed/fixCategories.js
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const mongoose = require("mongoose");
const { connectDB } = require("../config/db");
const Category = require("../models/Category");

const VALID_ROOT_IDS = [
  "cat-4625f711-588e-4131-abed-343ce9bbee06", // Thời trang nam
  "cat-997e61c0-488d-4abe-9f07-9b738f2ec8c1", // Thời trang nữ
  "cat-7bbddde7-e682-4519-86fc-3c80d84a778f", // Unisex
  "cat-acc00001-0000-4000-a000-000000000001", // Phụ kiện
];

async function run() {
  await connectDB();

  // 1. Add "Phụ kiện" if not exists
  const phuKienId = VALID_ROOT_IDS[3];
  const exists = await Category.findById(phuKienId);
  if (exists) {
    console.log(`"Phụ kiện" already exists (${phuKienId}), skipping.`);
  } else {
    await Category.create({
      _id: phuKienId,
      name: "Phụ kiện",
      slug: "phu-kien",
      description: "Phụ kiện thời trang",
      parent_id: null,
      level: 0,
      path: [],
      ancestors: [],
      children_count: 0,
      gender_hint: "unisex",
      is_active: true,
    });
    console.log(`Created "Phụ kiện" (${phuKienId})`);
  }

  // 2. Find ALL invalid root categories (parent_id null AND not in valid list)
  const invalidRoots = await Category.find({
    parent_id: null,
    _id: { $nin: VALID_ROOT_IDS },
  }).lean();

  if (invalidRoots.length > 0) {
    console.log(`\nFound ${invalidRoots.length} invalid root categories to remove:`);
    for (const cat of invalidRoots) {
      console.log(`  - "${cat.name}" (${cat._id})`);
    }

    const invalidIds = invalidRoots.map(c => c._id);
    const del = await Category.deleteMany({ _id: { $in: invalidIds } });
    console.log(`Deleted ${del.deletedCount} invalid root categories.`);
  } else {
    console.log("\nNo invalid root categories found.");
  }

  // 3. Verify
  const roots = await Category.find({ parent_id: null, is_active: true }).sort({ name: 1 }).lean();
  console.log(`\nRoot categories (${roots.length}):`);
  roots.forEach(r => console.log(`  - ${r.name} (${r._id}) [${r.gender_hint}]`));

  await mongoose.disconnect();
  console.log("\nDone.");
}

run().catch(e => { console.error(e); process.exit(1); });
