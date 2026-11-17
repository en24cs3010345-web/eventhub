const { validationResult } = require('express-validator');
const { ApiError } = require('../utils/helpers');
module.exports = (req, res, next) => {
  const e = validationResult(req);
  if (e.isEmpty()) return next();
  next(new ApiError(422, 'Please fix the highlighted fields',
    e.array().map((x) => ({ field: x.path, message: x.msg }))));
};
