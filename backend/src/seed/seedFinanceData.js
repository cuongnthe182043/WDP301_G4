/**
 * seedFinanceData.js
 *
 * Seeds wallet balances, transactions, platform fees, bank accounts,
 * and pending withdrawals for testing the Finance Management page.
 *
 * Usage:  node src/seed/seedFinanceData.js
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const { connectDB, disconnectDB } = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const Wallet       = require("../models/Wallet");
const Transaction  = require("../models/Transaction");
const PlatformFee  = require("../models/PlatformFee");
const BankAccount  = require("../models/BankAccount");
const Order        = require("../models/Order");
const Shop         = require("../models/Shop");
const SystemConfig = require("../models/SystemConfig");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pastDate = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(randInt(7, 22), randInt(0, 59), randInt(0, 59));
  return d;
};

const SYSTEM_USER_ID = "system-platform";
const FEE_RATE = 0.05; // 5%

const BANK_NAMES = [
  { name: "Vietcombank", code: "VCB" },
  { name: "Techcombank", code: "TCB" },
  { name: "MB Bank",     code: "MBB" },
  { name: "BIDV",        code: "BIDV" },
  { name: "VietinBank",  code: "CTG" },
  { name: "ACB",         code: "ACB" },
  { name: "TPBank",      code: "TPB" },
  { name: "VPBank",      code: "VPB" },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await connectDB();
  console.log("🔗 Connected to DB");

  // ── 1. Find shops from live DB ────────────────────────────────────────────
  const shops = await Shop.find({}).lean();
  if (shops.length === 0) {
    console.error("❌ No shops found in DB. Run seed data first.");
    process.exit(1);
  }
  console.log(`📦 Found ${shops.length} shop(s)`);

  // ── 2. Clean existing finance data ────────────────────────────────────────
  await Promise.all([
    Wallet.deleteMany({}),
    Transaction.deleteMany({}),
    PlatformFee.deleteMany({}),
    BankAccount.deleteMany({}),
    SystemConfig.deleteOne({ category: "platform", key: "fee_rate" }),
  ]);
  console.log("🧹 Cleaned existing finance data");

  // ── 3. Set platform fee rate ──────────────────────────────────────────────
  await SystemConfig.create({
    category: "platform",
    key: "fee_rate",
    value: String(FEE_RATE),
    label: "Platform Fee Rate",
    input_type: "number",
  });
  console.log(`⚙️  Fee rate set to ${(FEE_RATE * 100)}%`);

  // ── 4. Create system wallet ───────────────────────────────────────────────
  const systemWallet = await Wallet.create({
    _id: `wallet-system-${uuidv4().slice(0, 8)}`,
    user_id: SYSTEM_USER_ID,
    type: "system",
    balance_available: 0,
    balance_pending: 0,
  });
  console.log(`💰 System wallet created: ${systemWallet._id}`);

  // ── 5. Create shop wallets + bank accounts ────────────────────────────────
  const shopData = [];
  for (const shop of shops) {
    // Create shop wallet
    const wallet = await Wallet.create({
      _id: `wallet-shop-${uuidv4().slice(0, 8)}`,
      user_id: shop.owner_id,
      type: "shop",
      balance_available: 0,
      balance_pending: 0,
    });

    // Create bank accounts (1 default + 1 extra)
    const bank1Info = pick(BANK_NAMES);
    const bank2Info = pick(BANK_NAMES.filter(b => b.code !== bank1Info.code));

    const bankDefault = await BankAccount.create({
      _id: `bank-${uuidv4().slice(0, 8)}`,
      user_id: shop.owner_id,
      bank_name: bank1Info.name,
      bank_code: bank1Info.code,
      account_number: String(randInt(1000000000, 9999999999)),
      owner_name: shop.shop_name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      is_verified: true,
      is_default: true,
    });

    await BankAccount.create({
      _id: `bank-${uuidv4().slice(0, 8)}`,
      user_id: shop.owner_id,
      bank_name: bank2Info.name,
      bank_code: bank2Info.code,
      account_number: String(randInt(1000000000, 9999999999)),
      owner_name: shop.shop_name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      is_verified: true,
      is_default: false,
    });

    shopData.push({ shop, wallet, bankDefault });
    console.log(`🏪 ${shop.shop_name}: wallet ${wallet._id}, bank ${bankDefault.bank_name} ***${bankDefault.account_number.slice(-4)}`);
  }

  // ── 6. Get delivered orders and create settlements ────────────────────────
  const deliveredOrders = await Order.find({
    status: "delivered",
    payment_status: "paid",
  }).lean();
  console.log(`📋 Found ${deliveredOrders.length} delivered orders to settle`);

  let totalFees = 0;
  let settledCount = 0;

  for (const order of deliveredOrders) {
    const sd = shopData.find(s => s.shop._id === order.shop_id);
    if (!sd) continue;

    const orderTotal  = order.total_price || 0;
    if (orderTotal <= 0) continue;

    const feeAmount   = Math.round(orderTotal * FEE_RATE);
    const shopReceive = orderTotal - feeAmount;

    // Create PlatformFee record
    const settledDaysAgo = randInt(1, 45);
    const settledAt = pastDate(settledDaysAgo);

    await PlatformFee.create({
      _id:          `pfee-${uuidv4().slice(0, 8)}`,
      order_id:     order._id,
      order_code:   order.order_code,
      shop_id:      order.shop_id,
      user_id:      order.user_id,
      order_total:  orderTotal,
      fee_rate:     FEE_RATE,
      fee_amount:   feeAmount,
      shop_receive: shopReceive,
      settled_at:   settledAt,
    });

    // Transaction: shop wallet IN (payment after fee deduction)
    const shopTxn = await Transaction.create({
      _id:       `txn-${uuidv4().slice(0, 8)}`,
      wallet_id: sd.wallet._id,
      order_id:  order._id,
      type:      "payment",
      direction: "in",
      amount:    shopReceive,
      currency:  "VND",
      status:    "success",
      note:      `Thanh toán đơn #${order.order_code} (sau phí ${(FEE_RATE * 100)}%)`,
      meta:      { order_code: order.order_code, fee_rate: FEE_RATE, fee_amount: feeAmount },
      createdAt: settledAt,
      updatedAt: settledAt,
    });

    sd.wallet.balance_available += shopReceive;

    // Transaction: system wallet IN (platform fee)
    await Transaction.create({
      _id:       `txn-${uuidv4().slice(0, 8)}`,
      wallet_id: systemWallet._id,
      order_id:  order._id,
      type:      "payment",
      direction: "in",
      amount:    feeAmount,
      currency:  "VND",
      status:    "success",
      note:      `Phí nền tảng đơn #${order.order_code}`,
      meta:      { order_code: order.order_code, shop_id: order.shop_id, fee_rate: FEE_RATE },
      createdAt: settledAt,
      updatedAt: settledAt,
    });

    systemWallet.balance_available += feeAmount;
    totalFees += feeAmount;
    settledCount++;
  }

  console.log(`✅ Settled ${settledCount} orders, total fees: ${totalFees.toLocaleString()}₫`);

  // ── 7. Create completed withdrawals (past) ───────────────────────────────
  for (const sd of shopData) {
    const numWithdraws = randInt(2, 4);
    for (let i = 0; i < numWithdraws; i++) {
      const withdrawAmount = randInt(500000, 5000000);
      // Only withdraw if balance sufficient
      if (sd.wallet.balance_available < withdrawAmount) continue;

      const daysAgo = randInt(5, 40);
      const withdrawDate = pastDate(daysAgo);
      const approvedDate = new Date(withdrawDate);
      approvedDate.setHours(approvedDate.getHours() + randInt(2, 48));

      sd.wallet.balance_available -= withdrawAmount;

      await Transaction.create({
        _id:       `txn-${uuidv4().slice(0, 8)}`,
        wallet_id: sd.wallet._id,
        type:      "withdraw",
        direction: "out",
        amount:    withdrawAmount,
        currency:  "VND",
        status:    "success",
        note:      `Rút tiền về ${sd.bankDefault.bank_name} ***${sd.bankDefault.account_number.slice(-4)} | Admin: Đã chuyển khoản`,
        meta:      { bank_account_id: sd.bankDefault._id, approved_at: approvedDate },
        createdAt: withdrawDate,
        updatedAt: approvedDate,
      });
    }
    console.log(`💸 ${sd.shop.shop_name}: ${numWithdraws} completed withdrawals`);
  }

  // ── 8. Create pending withdrawals (for admin to approve/reject) ───────────
  for (const sd of shopData) {
    const numPending = randInt(1, 3);
    for (let i = 0; i < numPending; i++) {
      const withdrawAmount = randInt(200000, 2000000);
      if (sd.wallet.balance_available < withdrawAmount) continue;

      sd.wallet.balance_available -= withdrawAmount;
      sd.wallet.balance_pending += withdrawAmount;

      const requestDate = pastDate(randInt(0, 3));

      await Transaction.create({
        _id:       `txn-${uuidv4().slice(0, 8)}`,
        wallet_id: sd.wallet._id,
        type:      "withdraw",
        direction: "out",
        amount:    withdrawAmount,
        currency:  "VND",
        status:    "pending",
        note:      `Rút tiền về tài khoản ngân hàng`,
        meta:      { bank_account_id: sd.bankDefault._id },
        createdAt: requestDate,
        updatedAt: requestDate,
      });
    }
    console.log(`⏳ ${sd.shop.shop_name}: ${numPending} pending withdrawal(s)`);
  }

  // ── 9. Create some admin deposits ─────────────────────────────────────────
  for (const sd of shopData) {
    if (Math.random() > 0.5) {
      const depositAmount = randInt(500000, 3000000);
      const depositDate = pastDate(randInt(5, 20));

      sd.wallet.balance_available += depositAmount;

      await Transaction.create({
        _id:       `txn-${uuidv4().slice(0, 8)}`,
        wallet_id: sd.wallet._id,
        type:      "deposit",
        direction: "in",
        amount:    depositAmount,
        currency:  "VND",
        status:    "success",
        note:      "Nạp tiền bởi admin — Thưởng doanh số tháng",
        meta:      { source: "admin_deposit" },
        createdAt: depositDate,
        updatedAt: depositDate,
      });
      console.log(`💎 ${sd.shop.shop_name}: admin deposit ${depositAmount.toLocaleString()}₫`);
    }
  }

  // ── 10. Create some refund transactions ───────────────────────────────────
  for (const sd of shopData) {
    const numRefunds = randInt(1, 3);
    for (let i = 0; i < numRefunds; i++) {
      const refundAmount = randInt(100000, 1500000);
      const refundDate = pastDate(randInt(3, 30));

      // Deduct from shop
      if (sd.wallet.balance_available >= refundAmount) {
        sd.wallet.balance_available -= refundAmount;

        await Transaction.create({
          _id:       `txn-${uuidv4().slice(0, 8)}`,
          wallet_id: sd.wallet._id,
          type:      "refund",
          direction: "out",
          amount:    refundAmount,
          currency:  "VND",
          status:    "success",
          note:      `Khấu trừ hoàn tiền đơn hàng`,
          meta:      { trigger: "managed_refund" },
          createdAt: refundDate,
          updatedAt: refundDate,
        });
      }
    }
    console.log(`🔄 ${sd.shop.shop_name}: ${numRefunds} refund transaction(s)`);
  }

  // ── 11. Create some customer wallets with balances ────────────────────────
  // Get some customer user IDs from orders
  const customerIds = [...new Set(deliveredOrders.map(o => o.user_id))].slice(0, 5);
  for (const custId of customerIds) {
    const custWallet = await Wallet.create({
      _id: `wallet-cust-${uuidv4().slice(0, 8)}`,
      user_id: custId,
      type: "customer",
      balance_available: randInt(50000, 500000),
      balance_pending: 0,
    });

    // A couple of refund-in transactions
    const refundCount = randInt(1, 3);
    for (let i = 0; i < refundCount; i++) {
      const refundAmt = randInt(50000, 300000);
      await Transaction.create({
        _id:       `txn-${uuidv4().slice(0, 8)}`,
        wallet_id: custWallet._id,
        type:      "refund",
        direction: "in",
        amount:    refundAmt,
        currency:  "VND",
        status:    "success",
        note:      "Hoàn tiền vào ví",
        meta:      { refund_to: "wallet" },
        createdAt: pastDate(randInt(5, 30)),
      });
    }
  }
  console.log(`👤 Created ${customerIds.length} customer wallets`);

  // ── 12. Save final wallet balances ────────────────────────────────────────
  await Wallet.findByIdAndUpdate(systemWallet._id, {
    balance_available: systemWallet.balance_available,
  });

  for (const sd of shopData) {
    await Wallet.findByIdAndUpdate(sd.wallet._id, {
      balance_available: sd.wallet.balance_available,
      balance_pending: sd.wallet.balance_pending,
    });
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalTxns = await Transaction.countDocuments();
  const totalFeeRecords = await PlatformFee.countDocuments();
  const totalBanks = await BankAccount.countDocuments();
  const totalWallets = await Wallet.countDocuments();
  const pendingWd = await Transaction.countDocuments({ type: "withdraw", status: "pending" });

  console.log("\n════════════════════════════════════════");
  console.log("  ✅ Finance seed complete!");
  console.log("════════════════════════════════════════");
  console.log(`  💰 Wallets:            ${totalWallets}`);
  console.log(`  📝 Transactions:       ${totalTxns}`);
  console.log(`  💵 Platform fees:      ${totalFeeRecords}`);
  console.log(`  🏦 Bank accounts:      ${totalBanks}`);
  console.log(`  ⏳ Pending withdrawals: ${pendingWd}`);
  console.log(`  🏛️  System balance:     ${systemWallet.balance_available.toLocaleString()}₫`);
  for (const sd of shopData) {
    console.log(`  🏪 ${sd.shop.shop_name}: ${sd.wallet.balance_available.toLocaleString()}₫ available, ${sd.wallet.balance_pending.toLocaleString()}₫ pending`);
  }
  console.log("════════════════════════════════════════\n");

  await disconnectDB();
}

main().catch(e => {
  console.error("❌ Error:", e);
  process.exit(1);
});
