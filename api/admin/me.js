const { json, method, requireAdmin } = require("../../lib/server");
module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET"])) return;
  const session = requireAdmin(req, res);
  if (!session) return;
  json(res, 200, { username: session.username });
};
