/**
 * A wrapper function for async route handlers to catch errors
 * and pass them to the next error-handling middleware.
 * @param {Function} fn The async function to execute.
 * @returns {Function} A function that executes the original function and catches any errors.
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};

module.exports = catchAsync;
