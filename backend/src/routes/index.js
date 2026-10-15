const { Router } = require("express");
const { showHome } = require("../controllers/homeController");
const { criarUsuario, listarUsuarios } = require("../controllers/userController");
const db = require("../config/database");

const {
  listarOcorrencias,
  criarOcorrencia, atualizarOcorrencia, excluirOcorrencia, buscarOcorrencia
} = require("../controllers/occurrenceController");

const { salvarMetodo, removerArquivoMetodo } = require("../controllers/methodController");
const { uploadMetodo } = require("../middlewares/uploadMethod");
const { registrarSerial, excluirSerial } = require("../controllers/scanController");

const router = Router();

router.get("/health", showHome);

router.get("/database-test", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM perfil ORDER BY id_perfil"
    );

    res.json({
      banco: "conectado",
      dados: rows
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      banco: "erro",
      mensagem: error.message
    });
  }
});

router.get("/occurrences", listarOcorrencias);

router.post("/occurrences", criarOcorrencia);

router.get("/occurrences/:protocolo", buscarOcorrencia);
router.put("/occurrences/:protocolo", atualizarOcorrencia);
router.delete("/occurrences/:protocolo", excluirOcorrencia);
router.post("/occurrences/:protocolo/method", uploadMetodo, salvarMetodo);
router.delete("/occurrences/:protocolo/method/file", removerArquivoMetodo);
router.post("/occurrences/:protocolo/scans", registrarSerial);
router.delete("/occurrences/:protocolo/scans/:serial", excluirSerial);

// Sem autenticação durante o desenvolvimento local.
router.get("/users", listarUsuarios);
router.post("/users", criarUsuario);

module.exports = router;
