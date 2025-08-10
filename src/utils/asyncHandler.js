const asyncHandler = (callback) => {
  return (req, res, next) => {
    callback(req, res, next).catch(next);
  };
};

export { asyncHandler };
