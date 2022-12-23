require("dotenv").config();
const admin = require("firebase-admin");
const cors = require("cors");
const express = require("express");
const localtunnel = require("localtunnel");
const {apiAccessClientAddresses} = require("./config/config");
const bodyParser = require("body-parser");
const serviceAccount = require("./config/firebaseServiceAcc.json");
const firebaseDatabaseURL = process.env.FIREBASE_DB_URL;

const Firestore = require("./services/firebaseFirestore");
const db = new Firestore();

const api = express();
const port = process.env.ADDY_AI_PORT || 5005;
const host = "0.0.0.0";

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: firebaseDatabaseURL,
    });
}

api.use(cors({
    origin: apiAccessClientAddresses,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
}));

api.use(bodyParser.json({limit: "50mb"}));
api.use(bodyParser.urlencoded({extended: true, limit: "50mb"}));
api.use(bodyParser.text({limit: "200mb"}));


api.get("/", async (request, response) => {
    response.status(200).json({success: true});
});

api.use(express.json());
api.use("/chatgpt", require("./routes/chatgpt"));

api.listen(5005, host, () => console.log(
    `Started Addy.ai Local tunnel service on port ${port}
`));

// Start local tunnel
(async () => {
    const tunnel = await localtunnel({
        port: port,
        subdomain: "addy-ai-lt",
        local_host: "127.0.0.1",
    });
    const newTunnel = tunnel.url;
    // Update tunnel url in firebase firestore db
    const existingTunnel = db.getDocInCollection(
        "whereis", "string-types");
    if (!(existingTunnel && existingTunnel.tunnel == newTunnel)) {
        // Update
        const update = db.updateLocalTunnelURL(newTunnel);
        if (!update) {
            // TODO: Alert on-call
        }
    }

    tunnel.on("close", () => {
        // TODO: Alert on call
    });
})();

