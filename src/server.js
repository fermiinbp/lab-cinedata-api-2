require("dotenv").config({ quiet: true });
const { conectar } = require("./config/config.js");
const app = require("./app.js");

const PORT = process.env.PORT || 3000;

async function arrancar() {
    await conectar();
    app.listen(PORT, () => {
        console.log(`API Express en http://localhost:${PORT}`);
    });
}

arrancar().catch(error => {
    console.error("No se pudo conectar a MongoDB:", error.message);
    process.exit(1);
});
