const svc = require("../services/bankService");
const ok  = (res, data) => res.json({ status: "success", data });
const bad = (res, e, fb="Bad request") => res.status(e?.status||400).json({ status:"fail", message:e?.message||fb });
const nf  = (res, msg) => res.status(404).json({ status:"fail", message: msg });

exports.list   = async (req, res) => { try { ok(res, { items: await svc.list(req.user._id) }); } catch(e){ bad(res,e,"Cannot list bank accounts"); } };
exports.create = async (req, res) => { try { ok(res, { item: await svc.create(req.user._id, req.body) }); } catch(e){ bad(res,e); } };
exports.update = async (req, res) => { try { const item = await svc.update(req.user._id, req.params.id, req.body); if (!item) return nf(res, "Bank account not found"); ok(res, { item }); } catch(e){ bad(res,e); } };
exports.remove = async (req, res) => { try { const item = await svc.remove(req.user._id, req.params.id); if (!item) return nf(res, "Bank account not found"); ok(res, { deleted_id: req.params.id }); } catch(e){ bad(res,e); } };
exports.setDefault = async (req, res) => { try { const item = await svc.setDefault(req.user._id, req.params.id); if (!item) return nf(res, "Bank account not found"); ok(res, { item }); } catch(e){ bad(res,e); } };
exports.sendOtp = async (req, res) => { try { const r = await svc.sendOtp(req.user._id, req.params.id); if (!r) return nf(res, "Bank account not found"); ok(res, r); } catch(e){ bad(res,e); } };
exports.verifyOtp = async (req, res) => { try { const item = await svc.verifyOtp(req.user._id, req.params.id, req.body?.otp); if (!item) return nf(res, "Bank account not found"); ok(res, { item }); } catch(e){ bad(res,e); } };
