import dotenv from "dotenv";
import app from "./server.js";

dotenv.config();

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Civic Voice API running on port ${port}`);
});
