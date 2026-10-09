const { json, method, clearSession, requireAdmin } = require("../../lib/server");
module.exports = async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;
  if (!requireAdmin(req, res, true)) return;
  clearSession(req, res);
  json(res, 200, { message: "आप सुरक्षित रूप से बाहर आ गए हैं।" });
};
