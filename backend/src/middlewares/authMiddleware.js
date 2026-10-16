function exigirAutenticacao(req, res, next) {
  if (!req.session?.usuario) {
    return res.status(401).json({
      mensagem: "Usuário não autenticado."
    });
  }

  next();
}

function exigirSenhaAtualizada(req, res, next) {
  if (!req.session?.usuario) {
    return res.status(401).json({
      mensagem: "Usuário não autenticado."
    });
  }

  if (req.session.usuario.troca_senha_obrigatoria) {
    return res.status(403).json({
      mensagem: "É necessário alterar a senha temporária antes de continuar.",
      codigo: "TROCA_SENHA_OBRIGATORIA"
    });
  }

  next();
}

function permitirPerfis(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.session?.usuario) {
      return res.status(401).json({
        mensagem: "Usuário não autenticado."
      });
    }

    if (!perfisPermitidos.includes(req.session.usuario.perfil)) {
      return res.status(403).json({
        mensagem: "Você não possui permissão para realizar esta ação."
      });
    }

    next();
  };
}

module.exports = {
  exigirAutenticacao,
  exigirSenhaAtualizada,
  permitirPerfis
};
