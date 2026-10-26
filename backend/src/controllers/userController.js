const db = require("../config/database");

const PERFIS_EDITAVEIS = [
  "Qualidade",
  "Engenharia",
  "Expedição"
];

async function listarUsuarios(req, res) {
  try {
    const [usuarios] =
      await db.query(`
        SELECT
          u.id_usuario,
          u.nome,
          u.email,
          u.area,
          u.ativo,
          u.troca_senha_obrigatoria,
          u.criado_em,
          p.nome AS perfil

        FROM usuario u

        INNER JOIN perfil p
          ON p.id_perfil =
             u.id_perfil

        ORDER BY u.nome ASC
      `);

    res.json(usuarios);

  } catch (error) {
    console.error(
      "Erro ao listar usuários:",
      error
    );

    res.status(500).json({
      mensagem:
        "Erro ao buscar usuários."
    });
  }
}

async function atualizarPerfilUsuario(
  req,
  res
) {
  try {
    const id =
      Number(req.params.id);

    const {
      perfil
    } = req.body;

    if (
      !PERFIS_EDITAVEIS.includes(perfil)
    ) {
      return res.status(400).json({
        mensagem:
          "Perfil inválido."
      });
    }

    if (
      id ===
      req.session.usuario.id_usuario
    ) {
      return res.status(403).json({
        mensagem:
          "Você não pode alterar o próprio perfil administrativo."
      });
    }

    const [usuarios] =
      await db.query(
        `
        SELECT
          p.nome AS perfil

        FROM usuario u

        INNER JOIN perfil p
          ON p.id_perfil =
             u.id_perfil

        WHERE u.id_usuario = ?
        LIMIT 1
        `,
        [id]
      );

    if (!usuarios.length) {
      return res.status(404).json({
        mensagem:
          "Usuário não encontrado."
      });
    }

    if (
      usuarios[0].perfil ===
      "Administrador"
    ) {
      return res.status(403).json({
        mensagem:
          "Contas administrativas não podem ter o perfil alterado por esta tela."
      });
    }

    const [perfis] =
      await db.query(
        `
        SELECT id_perfil
        FROM perfil
        WHERE nome = ?
        LIMIT 1
        `,
        [perfil]
      );

    if (!perfis.length) {
      return res.status(400).json({ mensagem: "Perfil não encontrado." });
    }

    await db.query(
      `
      UPDATE usuario
      SET id_perfil = ?
      WHERE id_usuario = ?
      `,
      [
        perfis[0].id_perfil,
        id
      ]
    );

    res.json({
      mensagem:
        "Perfil atualizado com sucesso."
    });

  } catch (error) {
    console.error(
      "Erro ao atualizar perfil:",
      error
    );

    res.status(500).json({
      mensagem:
        "Erro ao atualizar perfil."
    });
  }
}

async function atualizarStatusUsuario(
  req,
  res
) {
  try {
    const id =
      Number(req.params.id);

    const {
      ativo
    } = req.body;

    if (typeof ativo !== "boolean") {
      return res.status(400).json({
        mensagem:
          "Situação do usuário inválida."
      });
    }

    if (
      id ===
      req.session.usuario.id_usuario
    ) {
      return res.status(403).json({
        mensagem:
          "Você não pode desativar a própria conta."
      });
    }

    const [usuarios] =
      await db.query(
        `
        SELECT
          p.nome AS perfil

        FROM usuario u

        INNER JOIN perfil p
          ON p.id_perfil =
             u.id_perfil

        WHERE u.id_usuario = ?
        LIMIT 1
        `,
        [id]
      );

    if (!usuarios.length) {
      return res.status(404).json({
        mensagem:
          "Usuário não encontrado."
      });
    }

    if (
      usuarios[0].perfil ===
      "Administrador"
    ) {
      return res.status(403).json({
        mensagem:
          "Contas administrativas não podem ser desativadas por esta tela."
      });
    }

    await db.query(
      `
      UPDATE usuario
      SET ativo = ?
      WHERE id_usuario = ?
      `,
      [
        ativo,
        id
      ]
    );

    res.json({
      mensagem:
        ativo
          ? "Usuário reativado."
          : "Usuário inativado."
    });

  } catch (error) {
    console.error(
      "Erro ao atualizar usuário:",
      error
    );

    res.status(500).json({
      mensagem:
        "Erro ao atualizar usuário."
    });
  }
}

module.exports = {
  listarUsuarios,
  atualizarPerfilUsuario,
  atualizarStatusUsuario
};
