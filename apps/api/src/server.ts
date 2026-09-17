import { createApp } from "./app.js";
import { getConfig } from "./shared/config/index.js";
import { logger } from "./infrastructure/logger.js";

const config = getConfig();
const app = createApp();

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, operation: "listen" }, "API listening");
});
