const ErrorResponse = require("./erroResponse");

const errorHandler = (err, req, res, next) => {
  let error = { ...err };

  error.message = err.message;

  // Log to console for dev

  if (err.code == "ESOCKET") {
    const message = `Could not connect to the database`;
    error = new ErrorResponse(message, 404);
  }
  // Mongoose bad ObjectId
  if (err.number == 102) {
    const message = `Resource not found`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key
  if (err.number == 2627) {
    const message = "Duplicate field value entered";
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.number == 245) {
    const message = err.message;
    //const message = Object.values(err.errors).map(val => val.message);

    error = new ErrorResponse(message, 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || "Server Error",
  });
};

module.exports = errorHandler;
