const db = require("../config/database");
const bcrypt = require("bcryptjs");

const PERFIS_SOLICITAVEIS = [
  "Qualidade",
  "Engenharia",
  "Expedição"
];

function normalizarEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

async function solicitarAcesso(req, res) {
  try {
    const {
      nome,
      email,
      area,
      perfil,
      senha,
      confirmar_senha
    } = req.body;

    if (
      typeof nome !== "string" || !nome.trim() || nome.trim().length > 150 ||
      typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 150 ||
      typeof area !== "string" || !area.trim() || area.trim().length > 100 ||
      typeof perfil !== "string" ||
      typeof senha !== "string" || !senha ||
      typeof confirmar_senha !== "string" || !confirmar_senha
    ) {
      return res.status(400).json({
        mensagem:
          "Preencha todos os campos obrigatórios."
      });
    }

    if (!PERFIS_SOLICITAVEIS.includes(perfil)) {
      return res.status(400).json({
        mensagem:
          "O perfil solicitado é inválido."
      });
    }

    if (senha.length < 8) {
      return res.status(400).json({
        mensagem:
          "A senha deve possuir pelo menos 8 caracteres."
      });
    }

    if (senha !== confirmar_senha) {
      return res.status(400).json({
        mensagem:
          "As senhas não coincidem."
      });
    }

    const emailNormalizado =
      normalizarEmail(email);

    const [usuarios] = await db.query(
      `
      SELECT id_usuario
      FROM usuario
      WHERE email = ?
      LIMIT 1
      `,
      [emailNormalizado]
    );

    if (usuarios.length) {
      return res.status(409).json({
        mensagem:
          "Já existe um usuário cadastrado com este e-mail."
      });
    }

    const [pendentes] = await db.query(
      `
      SELECT id_solicitacao
      FROM solicitacao_acesso
      WHERE email = ?
        AND status = 'Pendente'
      LIMIT 1
      `,
      [emailNormalizado]
    );

    if (pendentes.length) {
      return res.status(409).json({
        mensagem:
          "Já existe uma solicitação pendente para este e-mail."
      });
    }

    const [perfis] = await db.query(
      `
      SELECT id_perfil
      FROM perfil
      WHERE nome = ?
      LIMIT 1
      `,
      [perfil]
    );

    if (!perfis.length) {
      return res.status(400).json({
        mensagem:
          "Perfil solicitado não encontrado."
      });
    }

    const senhaHash =
      await bcrypt.hash(senha, 12);

    const [result] = await db.query(
      `
      INSERT INTO solicitacao_acesso (
        nome,
        email,
        area,
        senha_hash,
        id_perfil_solicitado,
        status
      )
      VALUES (?, ?, ?, ?, ?, 'Pendente')
      `,
      [
        nome.trim(),
        emailNormalizado,
        area.trim(),
        senhaHash,
        perfis[0].id_perfil
      ]
    );

    res.status(201).json({
      mensagem:
        "Solicitação enviada com sucesso. Aguarde a aprovação do administrador.",
      id_solicitacao: result.insertId
    });

  } catch (error) {
    console.error(
      "Erro ao solicitar acesso:",
      error
    );

    res.status(500).json({
      mensagem:
        "Erro ao enviar solicitação de acesso."
    });
  }
}

async function listarSolicitacoes(req, res) {
  try {
    const [solicitacoes] =
      await db.query(`
        SELECT
          s.id_solicitacao,
          s.nome,
          s.email,
          s.area,
          s.status,
          s.criado_em,
          s.analisado_em,
          s.observacao_admin,

          ps.nome AS perfil_solicitado,
          pa.nome AS perfil_aprovado,
          admin.nome AS administrador

        FROM solicitacao_acesso s

        INNER JOIN perfil ps
          ON ps.id_perfil =
             s.id_perfil_solicitado

        LEFT JOIN perfil pa
          ON pa.id_perfil =
             s.id_perfil_aprovado

        LEFT JOIN usuario admin
          ON admin.id_usuario =
             s.id_admin_analisou

        ORDER BY
          (s.status = 'Pendente') DESC,
          s.criado_em DESC
      `);

    res.json(solicitacoes);

  } catch (error) {
    console.error(
      "Erro ao listar solicitações:",
      error
    );

    res.status(500).json({
      mensagem:
        "Erro ao buscar solicitações."
    });
  }
}

async function listarPendentes(req, res) {
  try {
    const [solicitacoes] =
      await db.query(`
        SELECT
          s.id_solicitacao,
          s.nome,
          s.email,
          s.area,
          s.criado_em,
          p.nome AS perfil_solicitado

        FROM solicitacao_acesso s

        INNER JOIN perfil p
          ON p.id_perfil =
             s.id_perfil_solicitado

        WHERE s.status = 'Pendente'

        ORDER BY s.criado_em ASC
      `);

    res.json(solicitacoes);

  } catch (error) {
    console.error(
      "Erro ao buscar pendentes:",
      error
    );

    res.status(500).json({
      mensagem:
        "Erro ao buscar solicitações pendentes."
    });
  }
}

async function aprovarSolicitacao(req, res) {
  let connection;

  try {
    connection = await db.getConnection();
    const id =
      Number(req.params.id);

    const {
      perfil
    } = req.body;

    await connection.beginTransaction();

    const [solicitacoes] =
      await connection.query(
        `
        SELECT
          s.*,
          p.nome AS perfil_solicitado

        FROM solicitacao_acesso s

        INNER JOIN perfil p
          ON p.id_perfil =
             s.id_perfil_solicitado

        WHERE s.id_solicitacao = ?

        FOR UPDATE
        `,
        [id]
      );

    if (!solicitacoes.length) {
      await connection.rollback();

      return res.status(404).json({
        mensagem:
          "Solicitação não encontrada."
      });
    }

    const solicitacao =
      solicitacoes[0];

    if (solicitacao.status !== "Pendente") {
      await connection.rollback();

      return res.status(409).json({
        mensagem:
          "Esta solicitação já foi analisada."
      });
    }

    const perfilFinal =
      perfil ||
      solicitacao.perfil_solicitado;

    if (
      !PERFIS_SOLICITAVEIS.includes(
        perfilFinal
      )
    ) {
      await connection.rollback();

      return res.status(400).json({
        mensagem:
          "Perfil de aprovação inválido."
      });
    }

    const [usuarios] =
      await connection.query(
        `
        SELECT id_usuario
        FROM usuario
        WHERE email = ?
        LIMIT 1
        `,
        [solicitacao.email]
      );

    if (usuarios.length) {
      await connection.rollback();

      return res.status(409).json({
        mensagem:
          "Já existe um usuário com este e-mail."
      });
    }

    const [perfis] =
      await connection.query(
        `
        SELECT id_perfil
        FROM perfil
        WHERE nome = ?
        LIMIT 1
        `,
        [perfilFinal]
      );

    if (!perfis.length) {
      await connection.rollback();

      return res.status(400).json({
        mensagem:
          "Perfil não encontrado."
      });
    }

    if (!solicitacao.senha_hash) {
      await connection.rollback();

      return res.status(400).json({
        mensagem:
          "A solicitação não possui credenciais válidas."
      });
    }

    await connection.query(
      `
      INSERT INTO usuario (
        nome,
        email,
        area,
        senha_hash,
        troca_senha_obrigatoria,
        ativo,
        senha_atualizada_em,
        id_perfil
      )
      VALUES (?, ?, ?, ?, FALSE, TRUE, NOW(), ?)
      `,
      [
        solicitacao.nome,
        solicitacao.email,
        solicitacao.area,
        solicitacao.senha_hash,
        perfis[0].id_perfil
      ]
    );

    await connection.query(
      `
      UPDATE solicitacao_acesso
      SET
        status = 'Aprovado',
        analisado_em = NOW(),
        id_admin_analisou = ?,
        id_perfil_aprovado = ?,
        senha_hash = NULL
      WHERE id_solicitacao = ?
      `,
      [
        req.session.usuario.id_usuario,
        perfis[0].id_perfil,
        id
      ]
    );

    await connection.commit();

    res.json({
      mensagem:
        "Acesso aprovado com sucesso."
    });

  } catch (error) {
    if (connection) await connection.rollback();

    console.error(
      "Erro ao aprovar solicitação:",
      error
    );

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        mensagem:
          "Já existe um usuário com este e-mail."
      });
    }

    res.status(500).json({
      mensagem:
        "Erro ao aprovar solicitação."
    });

  } finally {
    if (connection) connection.release();
  }
}

async function rejeitarSolicitacao(req, res) {
  try {
    const id =
      Number(req.params.id);

    const observacao =
      String(
        req.body.observacao || ""
      ).trim();

    const [result] =
      await db.query(
        `
        UPDATE solicitacao_acesso
        SET
          status = 'Rejeitado',
          analisado_em = NOW(),
          id_admin_analisou = ?,
          observacao_admin = ?,
          senha_hash = NULL
        WHERE id_solicitacao = ?
          AND status = 'Pendente'
        `,
        [
          req.session.usuario.id_usuario,
          observacao || null,
          id
        ]
      );

    if (!result.affectedRows) {
      return res.status(409).json({
        mensagem:
          "A solicitação não está mais pendente."
      });
    }

    res.json({
      mensagem:
        "Solicitação rejeitada."
    });

  } catch (error) {
    console.error(
      "Erro ao rejeitar solicitação:",
      error
    );

    res.status(500).json({
      mensagem:
        "Erro ao rejeitar solicitação."
    });
  }
}

module.exports = {
  solicitarAcesso,
  listarSolicitacoes,
  listarPendentes,
  aprovarSolicitacao,
  rejeitarSolicitacao
};
