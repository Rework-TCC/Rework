const { Router } = require("express");
const {
  login,
  usuarioAtual,
  logout,
  trocarSenha
} = require("../controllers/authController");
const { showHome } = require("../controllers/homeController");
const { criarUsuario, listarUsuarios } = require("../controllers/userController");
const {
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis
} = require("../middlewares/authMiddleware");
const db = require("../config/database");

const {
  listarOcorrencias,
  criarOcorrencia,
  atualizarOcorrencia,
  atualizarCustos,
  excluirOcorrencia,
  buscarOcorrencia
} = require("../controllers/occurrenceController");

const { salvarMetodo, removerArquivoMetodo } = require("../controllers/methodController");
const { uploadMetodo } = require("../middlewares/uploadMethod");
const { registrarSerial, excluirSerial } = require("../controllers/scanController");

const router = Router();

router.post("/auth/login", login);
router.get("/auth/me", usuarioAtual);
router.post(
  "/auth/change-password",
  trocarSenha
);
router.post("/auth/logout", logout);

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

// Consulta continua disponível para o Dashboard da Produção.
router.get(
  "/occurrences",
  listarOcorrencias
);

// Detalhes exigem login.
router.get(
  "/occurrences/:protocolo",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis("Qualidade", "Engenharia", "Expedição"),
  buscarOcorrencia
);

// Somente Qualidade cria ocorrência.
router.post(
  "/occurrences",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis("Qualidade"),
  criarOcorrencia
);

// Somente Qualidade pode editar os dados gerais.
router.put(
  "/occurrences/:protocolo",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis("Qualidade"),
  atualizarOcorrencia
);

router.patch(
  "/occurrences/:protocolo/costs",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis("Expedição"),
  atualizarCustos
);

// Somente Qualidade exclui.
router.delete(
  "/occurrences/:protocolo",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis("Qualidade"),
  excluirOcorrencia
);

// Somente Engenharia pode definir o método.
router.post(
  "/occurrences/:protocolo/method",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis("Engenharia"),
  uploadMetodo,
  salvarMetodo
);

router.delete(
  "/occurrences/:protocolo/method/file",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis("Engenharia"),
  removerArquivoMetodo
);

// Bipagem é da Qualidade.
router.post(
  "/occurrences/:protocolo/scans",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis("Qualidade"),
  registrarSerial
);

router.delete(
  "/occurrences/:protocolo/scans/:serial",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis("Qualidade"),
  excluirSerial
);

router.get(
  "/users",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis("Qualidade"),
  listarUsuarios
);

router.post(
  "/users",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis("Qualidade"),
  criarUsuario
);

module.exports = router;
