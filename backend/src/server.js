require("dotenv").config();

const app = require("./app");
const { port } = require("./config");

// Inicia o servidor HTTP na porta configurada.
app.listen(port, () => {
  console.log(`Servidor Rework executando na porta ${port}`);
});
