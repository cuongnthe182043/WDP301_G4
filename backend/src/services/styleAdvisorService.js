const _sdk = require("@anthropic-ai/sdk");
const Anthropic = _sdk.default || _sdk;

// ---------------------------------------------------------------------------
// Rule-based creative fallback (no Claude API key needed)
// ---------------------------------------------------------------------------

const FIT_MESSAGES = {
  perfect: {
    vi: (size) => `✨ Size ${size} như được may riêng cho bạn! Bạn sẽ cảm thấy tự tin và thoải mái suốt cả ngày.`,
    en: (size) => `✨ Size ${size} fits like it was custom-made for you! You'll feel confident and comfortable all day long.`,
  },
  good: {
    vi: (size) => `👍 Size ${size} rất phù hợp với vóc dáng của bạn — vừa vặn, gọn gàng và thể hiện phong cách rõ nét.`,
    en: (size) => `👍 Size ${size} suits your figure beautifully — comfortable, neat, and showcasing your style perfectly.`,
  },
  acceptable: {
    vi: (size) => `👌 Size ${size} phù hợp với bạn. Đây là lựa chọn tốt để thêm vào tủ đồ của bạn.`,
    en: (size) => `👌 Size ${size} works well for you. A solid addition to your wardrobe.`,
  },
  poor: {
    vi: () => `📏 Hãy tham khảo bảng size đầy đủ để tìm lựa chọn phù hợp nhất với bạn.`,
    en: () => `📏 We recommend reviewing the full size chart to find your perfect match.`,
  },
};

const PROFESSION_TIPS = {
  office: {
    vi: "Lựa chọn lý tưởng cho môi trường văn phòng — lịch sự, chuyên nghiệp và thoải mái trong suốt giờ làm việc. Kết hợp với blazer hoặc giày da để hoàn thiện vẻ ngoài.",
    en: "An ideal choice for the office — polished, professional, and comfortable throughout your workday. Pair with a blazer or dress shoes to complete the look.",
  },
  student: {
    vi: "Năng động và cá tính — phù hợp cho cả lớp học lẫn các hoạt động ngoại khoá. Dễ phối với nhiều outfit khác nhau để thể hiện cá tính.",
    en: "Dynamic and stylish — perfect for class and extracurricular activities. Easy to mix and match to express your personality.",
  },
  creative: {
    vi: "Thể hiện cá tính sáng tạo của bạn! Kết hợp với phụ kiện độc đáo và đừng ngại thử nghiệm cách phối đồ táo bạo.",
    en: "Express your creative flair! Pair with unique accessories and don't be afraid to experiment with bold outfit combinations.",
  },
  athletic: {
    vi: "Thoải mái và năng động — lý tưởng cho lối sống vận động. Chất liệu thoáng khí giúp bạn luôn sảng khoái dù trong phòng tập hay ngoài trời.",
    en: "Comfortable and dynamic — ideal for an active lifestyle. Breathable materials keep you fresh whether in the gym or outdoors.",
  },
  fashion: {
    vi: "Một item thời thượng cho bộ sưu tập của bạn! Dễ mix & match với nhiều phong cách — từ casual đến semi-formal. Hãy tạo ra look riêng của bạn.",
    en: "A trendy staple for your collection! Easy to mix and match from casual to semi-formal. Create your own signature look.",
  },
  business: {
    vi: "Toát lên vẻ tự tin và quyền lực — xứng tầm với phong cách của người dẫn đầu. Kết hợp với đồng hồ lịch sự để hoàn thiện hình ảnh chuyên nghiệp.",
    en: "Exudes confidence and authority — befitting the style of a leader. Pair with an elegant watch to perfect your professional image.",
  },
  casual: {
    vi: "Thoải mái, nhẹ nhàng — lựa chọn hoàn hảo cho những ngày thường ngày dễ chịu. Cứ mặc thế này là đủ đẹp rồi!",
    en: "Relaxed and easygoing — the perfect choice for comfortable everyday wear. Simply stylish as it is!",
  },
};

function buildFallbackAdvice(profession, fit, size, lang = "vi") {
  const isVi = lang !== "en";
  const fitFn = FIT_MESSAGES[fit] || FIT_MESSAGES.good;
  const fitMessage = isVi ? fitFn.vi(size) : fitFn.en(size);

  const profTips = profession && PROFESSION_TIPS[profession];
  const styleTip = profTips ? (isVi ? profTips.vi : profTips.en) : null;

  return { fit_message: fitMessage, style_tip: styleTip, source: "rule_based" };
}

// ---------------------------------------------------------------------------
// Claude AI advisor
// ---------------------------------------------------------------------------

async function callClaudeAdvisor({ profession, fit, size, productName, productCategory, lang }) {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const isVi = lang !== "en";

    const fitLabel = isVi
      ? { perfect: "rất phù hợp", good: "phù hợp", acceptable: "tạm ổn", poor: "cần xem xét" }[fit] || "phù hợp"
      : { perfect: "perfect fit", good: "good fit", acceptable: "acceptable fit", poor: "needs review" }[fit] || "good fit";

    const profLabel = profession || (isVi ? "phong cách thường ngày" : "everyday casual");

    const prompt = isVi
      ? `Bạn là chuyên gia tư vấn thời trang thân thiện. Hãy viết lời khuyên phong cách NGẮN (2-3 câu, tối đa 60 từ) cho khách hàng:
Sản phẩm: ${productName}${productCategory ? ` (${productCategory})` : ""}
Size đề xuất: ${size} (${fitLabel})
Nghề nghiệp / phong cách: ${profLabel}
Yêu cầu: Tiếng Việt, giọng ấm áp tích cực, đề cập size ${size}, gợi ý cách phối đồ phù hợp nghề nghiệp. Chỉ trả nội dung, không tiêu đề.`
      : `You are a friendly fashion consultant. Write SHORT style advice (2-3 sentences, max 60 words) for a customer:
Product: ${productName}${productCategory ? ` (${productCategory})` : ""}
Recommended size: ${size} (${fitLabel})
Profession / lifestyle: ${profLabel}
Requirements: English, warm positive tone, mention size ${size}, suggest styling tips for their profession. Return content only, no title.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 120,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content?.[0]?.text?.trim();
    if (!text) return null;

    return { fit_message: text, style_tip: null, source: "claude" };
  } catch (err) {
    console.warn("[styleAdvisorService] Claude API error:", err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate personalized style advice for a customer.
 *
 * @param {Object} opts
 * @param {string} opts.profession  - e.g. "office", "student", "creative", "athletic", "fashion", "business", "casual"
 * @param {string} opts.fit         - "perfect" | "good" | "acceptable" | "poor"
 * @param {string} opts.size        - recommended size label
 * @param {string} opts.productName
 * @param {string} [opts.productCategory]
 * @param {string} [opts.lang]      - "vi" | "en"  (default "vi")
 * @returns {{ fit_message, style_tip, source }}
 */
exports.getStyleAdvice = async ({ profession, fit, size, productName, productCategory, lang = "vi" }) => {
  // Try Claude AI first for creative, personalized advice
  const claudeResult = await callClaudeAdvisor({ profession, fit, size, productName, productCategory, lang });
  if (claudeResult) return claudeResult;

  // Fallback: rule-based creative messages
  return buildFallbackAdvice(profession, fit, size, lang);
};
