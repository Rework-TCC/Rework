const db = require("../config/database");
const bcrypt = require("bcryptjs");

async function login(req, res) {
  try {
    const { email, senha, perfil } = req.body;

    if (!email || !senha || !perfil) {
      return res.status(400).json({
        mensagem: "E-mail, senha e perfil são obrigatórios."
      });
    }

    const perfisPermitidos = ["Qualidade", "Engenharia", "Expedição"];

    if (!perfisPermitidos.includes(perfil)) {
      return res.status(400).json({
        mensagem: "Perfil de acesso inválido."
      });
    }

    const [usuarios] = await db.query(
      `
      SELECT
        u.id_usuario,
        u.nome,
        u.email,
        u.senha_hash,
        u.ativo,
        u.troca_senha_obrigatoria,
        p.nome AS perfil
      FROM usuario u
      INNER JOIN perfil p
        ON p.id_perfil = u.id_perfil
      WHERE u.email = ?
      LIMIT 1
      `,
      [email.trim().toLowerCase()]
    );

    if (!usuarios.length) {
      return res.status(401).json({
        mensagem: "E-mail ou senha inválidos."
      });
    }

    const usuario = usuarios[0];

    if (!usuario.ativo) {
      return res.status(401).json({
        mensagem: "E-mail ou senha inválidos."
      });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaCorreta) {
      return res.status(401).json({
        mensagem: "E-mail ou senha inválidos."
      });
    }

    if (usuario.perfil !== perfil) {
      return res.status(403).json({
        mensagem: "O perfil selecionado não corresponde ao perfil cadastrado."
      });
    }

    await new Promise((resolve, reject) => {
      req.session.regenerate((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    req.session.usuario = {
      id_usuario: usuario.id_usuario,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      troca_senha_obrigatoria: Boolean(usuario.troca_senha_obrigatoria)
    };

    await new Promise((resolve, reject) => {
      req.session.save((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    res.json({
      mensagem: "Login realizado com sucesso.",
      usuario: {
        id_usuario: usuario.id_usuario,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil
      },
      troca_senha_obrigatoria: Boolean(usuario.troca_senha_obrigatoria)
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ mensagem: "Erro ao realizar login." });
  }
}

function usuarioAtual(req, res) {
  if (!req.session.usuario) {
    return res.status(401).json({ mensagem: "Usuário não autenticado." });
  }

  res.json({ usuario: req.session.usuario });
}

function logout(req, res) {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({ mensagem: "Erro ao encerrar sessão." });
    }

    res.clearCookie("rework.sid");
    res.json({ mensagem: "Logout realizado com sucesso." });
  });
}

async function trocarSenha(req, res) {
  try {
    console.log("Sessão na troca de senha:", req.session);
    console.log("Usuário na sessão:", req.session?.usuario);

    if (!req.session?.usuario) {
      return res.status(401).json({
        mensagem: "Usuário não autenticado."
      });
    }

    const {
      nova_senha,
      confirmar_senha
    } = req.body;

    if (!nova_senha || !confirmar_senha) {
      return res.status(400).json({
        mensagem: "Nova senha e confirmação são obrigatórias."
      });
    }

    if (nova_senha !== confirmar_senha) {
      return res.status(400).json({
        mensagem: "As senhas não coincidem."
      });
    }

    if (nova_senha.length < 8) {
      return res.status(400).json({
        mensagem: "A nova senha deve possuir pelo menos 8 caracteres."
      });
    }

    const [usuarios] = await db.query(
      `
      SELECT senha_hash
      FROM usuario
      WHERE id_usuario = ?
      LIMIT 1
      `,
      [req.session.usuario.id_usuario]
    );

    if (!usuarios.length) {
      return res.status(404).json({
        mensagem: "Usuário não encontrado."
      });
    }

    const mesmaSenha = await bcrypt.compare(nova_senha, usuarios[0].senha_hash);

    if (mesmaSenha) {
      return res.status(400).json({
        mensagem: "A nova senha deve ser diferente da senha temporária."
      });
    }

    const novaSenhaHash = await bcrypt.hash(nova_senha, 12);

    await db.query(
      `
      UPDATE usuario
      SET
        senha_hash = ?,
        troca_senha_obrigatoria = FALSE,
        senha_atualizada_em = NOW()
      WHERE id_usuario = ?
      `,
      [novaSenhaHash, req.session.usuario.id_usuario]
    );

    req.session.usuario.troca_senha_obrigatoria = false;

    await new Promise((resolve, reject) => {
      req.session.save((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    res.json({ mensagem: "Senha alterada com sucesso." });
  } catch (error) {
    console.error("Erro ao alterar senha:", error);
    res.status(500).json({ mensagem: "Erro ao alterar senha." });
  }
}

module.exports = {
  login,
  usuarioAtual,
  logout,
  trocarSenha
};
