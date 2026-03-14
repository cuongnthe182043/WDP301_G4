const Order = require("../models/Order");
const User = require("../models/User");

// GET /api/shop/customers
exports.listCustomers = async (req, res, next) => {
  try {
    const shopId = req.shop._id;
    const { page = 1, limit = 20, q } = req.query;

    let agg = await Order.aggregate([
      { $match: { shop_id: shopId } },
      {
        $group: {
          _id: "$user_id",
          total_orders: { $sum: 1 },
          total_spent: { $sum: "$total_price" },
          last_order_at: { $max: "$createdAt" },
        },
      },
      { $sort: { total_spent: -1 } },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $addFields: { user: { $arrayElemAt: ["$user", 0] } } },
      { $project: { "user.password_hash": 0 } },
    ]);

    if (q) {
      const re = new RegExp(q, "i");
      agg = agg.filter(
        (c) =>
          re.test(c.user?.username) ||
          re.test(c.user?.email) ||
          re.test(c.user?.full_name)
      );
    }

    const total = agg.length;
    const skip = (Number(page) - 1) * Number(limit);
    const items = agg.slice(skip, skip + Number(limit));

    res.json({ success: true, data: { items, total, page: Number(page), limit: Number(limit) } });
  } catch (e) { next(e); }
};

// GET /api/shop/customers/:id
exports.getCustomer = async (req, res, next) => {
  try {
    const shopId = req.shop._id;
    const userId = req.params.id;

    const user = await User.findById(userId)
      .select("_id username email full_name avatar_url phone createdAt")
      .lean();
    if (!user) return res.status(404).json({ message: "Không tìm thấy khách hàng" });

    const [orders, statsArr] = await Promise.all([
      Order.find({ shop_id: shopId, user_id: userId }).sort({ createdAt: -1 }).limit(20).lean(),
      Order.aggregate([
        { $match: { shop_id: shopId, user_id: userId } },
        { $group: { _id: null, total_orders: { $sum: 1 }, total_spent: { $sum: "$total_price" } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        user,
        orders,
        stats: statsArr[0] || { total_orders: 0, total_spent: 0 },
      },
    });
  } catch (e) { next(e); }
};
