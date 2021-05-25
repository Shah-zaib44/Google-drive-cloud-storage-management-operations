var express = require("express");

const errorHandler=require('./middleware/error')
var app = express();
app.use(express.json());
const api = require("./routes/apiRoute");
app.use("/api/v1", api);
app.use(errorHandler);
const PORT = 5000;
app.listen(PORT, console.log(`Server ${PORT} is running in development`));
