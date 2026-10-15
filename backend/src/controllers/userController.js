const db = require("../config/database");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

function gerarSenhaTemporaria() {
  const aleatorio = crypto.randomBytes(6).toString("base64url");
  return `Rw!${aleatorio}`;
}

async function criarUsuario(req, res) {
  try {
    const { nome, email, area, perfil } = req.body;

    // Validação básica
    if (!nome || !email || !area || !perfil) {
      return res.status(400).json({
        mensagem: "Nome, e-mail, área e perfil são obrigatórios."
      });
    }

    // Verifica o perfil
    const [perfis] = await db.query(
      `
      SELECT id_perfil
      FROM perfil
      WHERE nome = ?
      `,
      [perfil]
    );

    if (!perfis.length) {
      return res.status(400).json({
        mensagem: "Perfil de acesso inválido."
      });
    }

    // Gera a senha temporária e armazena apenas seu hash.
    const senhaTemporaria = gerarSenhaTemporaria();
    const senhaHash = await bcrypt.hash(senhaTemporaria, 12);

    const [result] = await db.query(
      `
      INSERT INTO usuario (
        nome,
        email,
        area,
        senha_hash,
        troca_senha_obrigatoria,
        ativo,
        id_perfil
      )
      VALUES (?, ?, ?, ?, TRUE, TRUE, ?)
      `,
      [
        nome.trim(),
        email.trim().toLowerCase(),
        area.trim(),
        senhaHash,
        perfis[0].id_perfil
      ]
    );

    // A senha temporária volta SOMENTE nessa resposta.
    res.status(201).json({
      mensagem: "Usuário criado com sucesso.",
      usuario: {
        id_usuario: result.insertId,
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        area: area.trim(),
        perfil
      },
      senha_temporaria: senhaTemporaria
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        mensagem: "Já existe um usuário com este e-mail."
      });
    }

    console.error("Erro ao criar usuário:", error);
    res.status(500).json({
      mensagem: "Erro ao criar usuário."
    });
  }
}

async function listarUsuarios(req, res) {
  try {
    const [usuarios] = await db.query(`
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
        ON p.id_perfil = u.id_perfil
      ORDER BY u.nome ASC
    `);

    res.json(usuarios);
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    res.status(500).json({
      mensagem: "Erro ao buscar usuários."
    });
  }
}

module.exports = { criarUsuario, listarUsuarios };
