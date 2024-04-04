import express from "express";
import homepageController from "../controllers/homepageController";
import chatBotController from "../controllers/chatBotController";

let router = express.Router();

let initWebRoutes = (app) => {
    router.get("/", homepageController.getHomepage);
    router.get("/webhook/fb", chatBotController.getWebhook);
    router.post("/webhook/fb", chatBotController.postWebhook);

    return app.use("/", router);
};

module.exports = initWebRoutes;