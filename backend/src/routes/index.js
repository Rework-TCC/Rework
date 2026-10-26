const { Router } = require("express");

const {
  login,
  usuarioAtual,
  logout,
  trocarSenha
} = require("../controllers/authController");

const {
  listarUsuarios,
  atualizarPerfilUsuario,
  atualizarStatusUsuario
} = require("../controllers/userController");

const {
  solicitarAcesso,
  listarSolicitacoes,
  listarPendentes,
  aprovarSolicitacao,
  rejeitarSolicitacao
} = require(
  "../controllers/accessRequestController"
);

const {
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis
} = require(
  "../middlewares/authMiddleware"
);

const {
  listarOcorrencias,
  criarOcorrencia,
  atualizarOcorrencia,
  atualizarCustos,
  excluirOcorrencia,
  buscarOcorrencia
} = require(
  "../controllers/occurrenceController"
);

const {
  salvarMetodo,
  removerArquivoMetodo
} = require(
  "../controllers/methodController"
);

const {
  uploadMetodo
} = require(
  "../middlewares/uploadMethod"
);

const {
  registrarSerial,
  excluirSerial
} = require(
  "../controllers/scanController"
);

const {
  showHome
} = require(
  "../controllers/homeController"
);

const db =
  require("../config/database");

const router = Router();

/* =========================
   AUTENTICAÇÃO
========================= */

router.post(
  "/auth/login",
  login
);

router.get(
  "/auth/me",
  usuarioAtual
);

router.post(
  "/auth/change-password",
  trocarSenha
);

router.post(
  "/auth/logout",
  logout
);

/* =========================
   SOLICITAÇÃO PÚBLICA
========================= */

router.post(
  "/access-requests",
  solicitarAcesso
);

/* =========================
   ADMINISTRAÇÃO
========================= */

router.get(
  "/access-requests",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis("Administrador"),
  listarSolicitacoes
);

router.get(
  "/access-requests/pending",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis("Administrador"),
  listarPendentes
);

router.post(
  "/access-requests/:id/approve",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis("Administrador"),
  aprovarSolicitacao
);

router.post(
  "/access-requests/:id/reject",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis("Administrador"),
  rejeitarSolicitacao
);

router.get(
  "/users",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis("Administrador"),
  listarUsuarios
);

router.patch(
  "/users/:id/profile",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis("Administrador"),
  atualizarPerfilUsuario
);

router.patch(
  "/users/:id/status",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis("Administrador"),
  atualizarStatusUsuario
);

/* =========================
   SISTEMA
========================= */

router.get(
  "/health",
  showHome
);

router.get(
  "/database-test",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis("Administrador"),
  async (req, res) => {
    try {
      const [rows] =
        await db.query(
          `
          SELECT *
          FROM perfil
          ORDER BY id_perfil
          `
        );

      res.json({
        banco: "conectado",
        dados: rows
      });

    } catch (error) {
      res.status(500).json({
        banco: "erro",
        mensagem: error.message
      });
    }
  }
);

/* =========================
   OCORRÊNCIAS
========================= */

/*
  Continua público porque
  a Produção usa o Dashboard.
*/
router.get(
  "/occurrences",
  listarOcorrencias
);

router.get(
  "/occurrences/:protocolo",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis(
    "Administrador",
    "Qualidade",
    "Engenharia",
    "Expedição"
  ),
  buscarOcorrencia
);

/*
  Qualidade ou Administrador
*/
router.post(
  "/occurrences",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis(
    "Administrador",
    "Qualidade"
  ),
  criarOcorrencia
);

router.put(
  "/occurrences/:protocolo",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis(
    "Administrador",
    "Qualidade"
  ),
  atualizarOcorrencia
);

router.delete(
  "/occurrences/:protocolo",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis(
    "Administrador",
    "Qualidade"
  ),
  excluirOcorrencia
);

/*
  Custos:
  Expedição ou Administrador
*/
router.patch(
  "/occurrences/:protocolo/costs",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis(
    "Administrador",
    "Expedição"
  ),
  atualizarCustos
);

/*
  Método:
  Engenharia ou Administrador
*/
router.post(
  "/occurrences/:protocolo/method",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis(
    "Administrador",
    "Engenharia"
  ),
  uploadMetodo,
  salvarMetodo
);

router.delete(
  "/occurrences/:protocolo/method/file",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis(
    "Administrador",
    "Engenharia"
  ),
  removerArquivoMetodo
);

/*
  Bipagem:
  Qualidade ou Administrador
*/
router.post(
  "/occurrences/:protocolo/scans",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis(
    "Administrador",
    "Qualidade"
  ),
  registrarSerial
);

router.delete(
  "/occurrences/:protocolo/scans/:serial",
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis(
    "Administrador",
    "Qualidade"
  ),
  excluirSerial
);

module.exports = router;
