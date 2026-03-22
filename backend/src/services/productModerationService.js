/**
 * productModerationService.js
 *
 * Comprehensive product moderation — checks text, images, pricing,
 * and required fields before a product goes live.
 *
 * Moderation result shape:
 * {
 *   approved:  boolean,           // false → auto-reject
 *   flags:     ModerationFlag[],  // list of issues found
 *   score:     number,            // 0 = clean, higher = worse
 *   summary:   string,            // human-readable summary for rejection_reason
 * }
 *
 * ModerationFlag:
 * { type: string, severity: "low"|"medium"|"high", message: string, field: string }
 */

const contentModeration = require("./contentModerationService");

// ─── Banned / suspicious patterns for product names ─────────────────────────
const BANNED_NAME_PATTERNS = [
  // Weapons / drugs / illegal goods (Vietnamese + English)
  /s[uú]ng|đạn|thu[ốô]c\s*n[ổo]|ch[aấ]t\s*n[ổo]/i,
  /ma\s*tu[yý]|c[aầ]n\s*sa|heroin|cocaine|methamphetamine/i,
  /weapon|firearm|explosive|bomb|grenade/i,
  /drug|narcotic|marijuana|cannabis/i,
  // Counterfeit / replica
  /h[aà]ng\s*gi[aả]|h[aà]ng\s*nh[aá]i|fake|replica|counterfeit/i,
  // Adult / sexual content
  /đ[oồ]\s*ch[oơ]i\s*t[iì]nh\s*d[uụ]c|sex\s*toy|adult\s*toy|pornograph/i,
  /kh[iỉ]êu\s*d[aâ]m|d[aâ]m\s*d[uụ]c/i,
  // Gambling
  /c[oờ]\s*b[aạ]c|gambl(e|ing)|casino|slot\s*machine/i,
  // Stolen goods
  /h[aà]ng\s*[aă]n\s*c[aắ]p|stolen|loot/i,
];

// ─── Suspicious image URL patterns ──────────────────────────────────────────
const SUSPICIOUS_IMAGE_PATTERNS = [
  /nsfw/i,
  /xxx/i,
  /porn/i,
  /adult/i,
  /nude/i,
  /sexy/i,
  /erotic/i,
  /hentai/i,
];

// ─── Price thresholds ───────────────────────────────────────────────────────
const PRICE_MIN         = 1000;       // 1,000 VND
const PRICE_MAX         = 500_000_000; // 500M VND
const PRICE_SUSPICIOUS  = 100;        // below this is almost certainly wrong

// ─── Image requirements ─────────────────────────────────────────────────────
const MIN_IMAGES = 1;
const MAX_IMAGES = 20;

// ─── Allowed image hosts ────────────────────────────────────────────────────
const ALLOWED_IMAGE_HOSTS = [
  "res.cloudinary.com",
  "cloudinary.com",
  "images.unsplash.com",
  "i.imgur.com",
];

// ─── Main moderation function ───────────────────────────────────────────────

/**
 * Run full moderation checks on a product document (plain object or Mongoose doc).
 *
 * @param {Object} product - The product to moderate
 * @returns {{ approved: boolean, flags: Array, score: number, summary: string }}
 */
function moderateProduct(product) {
  const flags = [];
  let score = 0;

  // ── 1. Required fields validation ──────────────────────────────────────
  if (!product.name || !product.name.trim()) {
    flags.push({ type: "missing_field", severity: "high", message: "Thiếu tên sản phẩm", field: "name" });
    score += 50;
  }

  if (!product.description || product.description.trim().length < 10) {
    flags.push({ type: "missing_field", severity: "medium", message: "Mô tả sản phẩm quá ngắn hoặc trống (tối thiểu 10 ký tự)", field: "description" });
    score += 20;
  }

  if (!product.category_id) {
    flags.push({ type: "missing_field", severity: "medium", message: "Thiếu danh mục sản phẩm", field: "category_id" });
    score += 15;
  }

  // ── 2. Text content moderation (name) ──────────────────────────────────
  if (product.name) {
    const nameResult = contentModeration.moderate(product.name);
    if (!nameResult.clean) {
      const sev = nameResult.severity === 2 ? "high" : "medium";
      flags.push({
        type: "inappropriate_language",
        severity: sev,
        message: `Tên sản phẩm chứa ngôn ngữ không phù hợp: ${nameResult.matched.join(", ")}`,
        field: "name",
        matched: nameResult.matched,
      });
      score += nameResult.severity === 2 ? 80 : 30;
    }

    // Check banned product patterns
    for (const pattern of BANNED_NAME_PATTERNS) {
      if (pattern.test(product.name)) {
        flags.push({
          type: "banned_product",
          severity: "high",
          message: `Tên sản phẩm chứa từ khóa bị cấm: "${product.name.match(pattern)?.[0] || ""}"`,
          field: "name",
        });
        score += 100;
        break; // one match is enough
      }
    }
  }

  // ── 3. Text content moderation (description) ──────────────────────────
  if (product.description) {
    const descResult = contentModeration.moderate(product.description);
    if (!descResult.clean) {
      const sev = descResult.severity === 2 ? "high" : "medium";
      flags.push({
        type: "inappropriate_language",
        severity: sev,
        message: `Mô tả chứa ngôn ngữ không phù hợp: ${descResult.matched.join(", ")}`,
        field: "description",
        matched: descResult.matched,
      });
      score += descResult.severity === 2 ? 60 : 20;
    }

    // Check banned patterns in description too
    for (const pattern of BANNED_NAME_PATTERNS) {
      if (pattern.test(product.description)) {
        flags.push({
          type: "banned_product",
          severity: "high",
          message: "Mô tả sản phẩm chứa nội dung bị cấm",
          field: "description",
        });
        score += 80;
        break;
      }
    }
  }

  // ── 4. Tags moderation ────────────────────────────────────────────────
  if (Array.isArray(product.tags) && product.tags.length > 0) {
    const allTags = product.tags.join(" ");
    const tagResult = contentModeration.moderate(allTags);
    if (!tagResult.clean) {
      flags.push({
        type: "inappropriate_language",
        severity: tagResult.severity === 2 ? "high" : "low",
        message: `Tags chứa ngôn ngữ không phù hợp: ${tagResult.matched.join(", ")}`,
        field: "tags",
        matched: tagResult.matched,
      });
      score += tagResult.severity === 2 ? 40 : 10;
    }
  }

  // ── 5. Image validation ───────────────────────────────────────────────
  const images = product.images || [];

  if (images.length < MIN_IMAGES) {
    flags.push({
      type: "missing_images",
      severity: "medium",
      message: `Sản phẩm cần ít nhất ${MIN_IMAGES} hình ảnh`,
      field: "images",
    });
    score += 15;
  }

  if (images.length > MAX_IMAGES) {
    flags.push({
      type: "too_many_images",
      severity: "low",
      message: `Sản phẩm có quá nhiều hình ảnh (${images.length}/${MAX_IMAGES})`,
      field: "images",
    });
    score += 5;
  }

  // Check image URLs for suspicious patterns and untrusted hosts
  for (let i = 0; i < images.length; i++) {
    const url = images[i];

    // Check for suspicious URL patterns (NSFW keywords)
    for (const pattern of SUSPICIOUS_IMAGE_PATTERNS) {
      if (pattern.test(url)) {
        flags.push({
          type: "suspicious_image",
          severity: "high",
          message: `Hình ảnh ${i + 1} có URL chứa nội dung đáng ngờ`,
          field: `images[${i}]`,
        });
        score += 60;
        break;
      }
    }

    // Validate image host
    try {
      const parsedUrl = new URL(url);
      const isAllowed = ALLOWED_IMAGE_HOSTS.some((h) => parsedUrl.hostname.includes(h));
      if (!isAllowed) {
        flags.push({
          type: "untrusted_image_host",
          severity: "low",
          message: `Hình ảnh ${i + 1} được lưu trữ trên nguồn không xác minh: ${parsedUrl.hostname}`,
          field: `images[${i}]`,
        });
        score += 5;
      }
    } catch {
      flags.push({
        type: "invalid_image_url",
        severity: "medium",
        message: `Hình ảnh ${i + 1} có URL không hợp lệ`,
        field: `images[${i}]`,
      });
      score += 10;
    }
  }

  // ── 6. Price validation ───────────────────────────────────────────────
  const price = Number(product.base_price);

  if (isNaN(price) || price <= 0) {
    flags.push({
      type: "invalid_price",
      severity: "high",
      message: "Giá sản phẩm không hợp lệ (phải lớn hơn 0)",
      field: "base_price",
    });
    score += 40;
  } else if (price < PRICE_SUSPICIOUS) {
    flags.push({
      type: "suspicious_price",
      severity: "high",
      message: `Giá sản phẩm quá thấp (${price.toLocaleString("vi-VN")}₫) — có thể là lỗi nhập liệu hoặc lừa đảo`,
      field: "base_price",
    });
    score += 50;
  } else if (price < PRICE_MIN) {
    flags.push({
      type: "suspicious_price",
      severity: "medium",
      message: `Giá sản phẩm rất thấp (${price.toLocaleString("vi-VN")}₫)`,
      field: "base_price",
    });
    score += 15;
  } else if (price > PRICE_MAX) {
    flags.push({
      type: "suspicious_price",
      severity: "medium",
      message: `Giá sản phẩm quá cao (${price.toLocaleString("vi-VN")}₫) — cần xác minh`,
      field: "base_price",
    });
    score += 20;
  }

  // ── 7. SEO / Spam detection ───────────────────────────────────────────
  if (product.name) {
    // Excessive caps
    const upperRatio = (product.name.match(/[A-Z]/g) || []).length / product.name.length;
    if (product.name.length > 10 && upperRatio > 0.7) {
      flags.push({
        type: "spam_content",
        severity: "low",
        message: "Tên sản phẩm có quá nhiều chữ in hoa (spam)",
        field: "name",
      });
      score += 10;
    }

    // Excessive special characters / emoji spam
    const specialCharRatio = (product.name.match(/[!@#$%^&*()🔥💥🎉✨⭐🏆]/g) || []).length / product.name.length;
    if (product.name.length > 5 && specialCharRatio > 0.3) {
      flags.push({
        type: "spam_content",
        severity: "low",
        message: "Tên sản phẩm chứa quá nhiều ký tự đặc biệt / emoji",
        field: "name",
      });
      score += 10;
    }

    // Very long name (SEO stuffing)
    if (product.name.length > 200) {
      flags.push({
        type: "spam_content",
        severity: "low",
        message: "Tên sản phẩm quá dài (có thể nhồi keyword)",
        field: "name",
      });
      score += 5;
    }
  }

  // ── 8. Duplicate content detection (name == description) ──────────────
  if (product.name && product.description) {
    const normName = product.name.toLowerCase().trim();
    const normDesc = product.description.toLowerCase().trim();
    if (normName === normDesc) {
      flags.push({
        type: "low_quality",
        severity: "low",
        message: "Mô tả trùng với tên sản phẩm",
        field: "description",
      });
      score += 10;
    }
  }

  // ── Build result ──────────────────────────────────────────────────────
  const hasHigh = flags.some((f) => f.severity === "high");
  const hasMedium = flags.some((f) => f.severity === "medium");

  // Auto-reject if any high severity flag or score >= 50
  const approved = !hasHigh && score < 50;

  // Build summary for rejection_reason
  let summary = "";
  if (!approved) {
    const highFlags = flags.filter((f) => f.severity === "high");
    const medFlags  = flags.filter((f) => f.severity === "medium");
    const reasons   = [...highFlags, ...medFlags].map((f) => f.message);
    summary = reasons.length > 0
      ? `Tự động từ chối: ${reasons.join("; ")}`
      : "Sản phẩm không đạt yêu cầu kiểm duyệt tự động";
  }

  return {
    approved,
    flags,
    score: Math.min(score, 100),
    summary,
  };
}

/**
 * Quick check: does a product pass basic moderation?
 * (Lighter version for pre-checks before full moderation)
 */
function quickCheck(product) {
  const result = moderateProduct(product);
  return { pass: result.approved, score: result.score };
}

/**
 * Moderate multiple products in batch.
 *
 * @param {Object[]} products
 * @returns {{ results: Array<{ productId: string, ...moderationResult }>, stats: Object }}
 */
function moderateBatch(products) {
  const results = products.map((p) => ({
    productId: p._id,
    productName: p.name,
    ...moderateProduct(p),
  }));

  const stats = {
    total: results.length,
    approved: results.filter((r) => r.approved).length,
    rejected: results.filter((r) => !r.approved).length,
    avgScore: results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
      : 0,
  };

  return { results, stats };
}

module.exports = { moderateProduct, quickCheck, moderateBatch };
