const db = require("../config/database");
const fs = require("fs");
const path = require("path");

async function salvarMetodo(req, res) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const { causa, metodo, classificacao, departamento, responsavel } = req.body;
    const [ocorrencias] = await connection.query(
      "SELECT id_ocorrencia FROM ocorrencia_retrabalho WHERE protocolo = ? FOR UPDATE", [req.params.protocolo]);
    if (!ocorrencias.length) {
      await connection.rollback();
      return res.status(404).json({ mensagem: "Ocorrência não encontrada" });
    }
    const id = ocorrencias[0].id_ocorrencia;
    const arquivoNome = req.file ? req.file.originalname : null;
    const arquivoTipo = req.file ? req.file.mimetype : null;
    const arquivoCaminho = req.file ? `/uploads/methods/${req.file.filename}` : null;
    await connection.query(`
      INSERT INTO metodo_retrabalho (id_ocorrencia, causa, metodo, classificacao, departamento, responsavel,
        arquivo_nome, arquivo_tipo, arquivo_caminho)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE causa = VALUES(causa), metodo = VALUES(metodo),
        classificacao = VALUES(classificacao), departamento = VALUES(departamento), responsavel = VALUES(responsavel),
        arquivo_nome = COALESCE(VALUES(arquivo_nome), arquivo_nome),
        arquivo_tipo = COALESCE(VALUES(arquivo_tipo), arquivo_tipo),
        arquivo_caminho = COALESCE(VALUES(arquivo_caminho), arquivo_caminho)
    `, [id, causa, metodo, classificacao, departamento, responsavel,
      arquivoNome, arquivoTipo, arquivoCaminho]);
    await connection.query(`
      UPDATE ocorrencia_retrabalho SET status = CASE WHEN status = 'Pendente'
        THEN 'Iniciado' ELSE status END WHERE id_ocorrencia = ?
    `, [id]);
    await connection.commit();
    res.json({
      mensagem: "Método salvo com sucesso",
      arquivo: req.file ? { nome: arquivoNome, tipo: arquivoTipo, caminho: arquivoCaminho } : null
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(error);
    res.status(500).json({ mensagem: "Erro ao salvar método" });
  } finally {
    if (connection) connection.release();
  }
}

async function removerArquivoMetodo(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT m.id_metodo, m.arquivo_caminho
      FROM metodo_retrabalho m
      INNER JOIN ocorrencia_retrabalho o
        ON o.id_ocorrencia = m.id_ocorrencia
      WHERE o.protocolo = ?
      LIMIT 1
    `, [req.params.protocolo]);

    if (!rows.length) {
      return res.status(404).json({ mensagem: "Método não encontrado." });
    }
    const metodo = rows[0];
    if (!metodo.arquivo_caminho) {
      return res.status(404).json({ mensagem: "Esta ocorrência não possui arquivo anexado." });
    }

    await db.query(`
      UPDATE metodo_retrabalho
      SET arquivo_nome = NULL, arquivo_tipo = NULL, arquivo_caminho = NULL
      WHERE id_metodo = ?
    `, [metodo.id_metodo]);

    const nomeArquivo = path.basename(metodo.arquivo_caminho);
    const caminhoFisico = path.resolve(__dirname, "../../uploads/methods", nomeArquivo);
    try {
      await fs.promises.unlink(caminhoFisico);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error("Erro ao remover arquivo físico:", error);
      }
    }
    res.json({ mensagem: "Arquivo removido com sucesso." });
  } catch (error) {
    console.error("Erro ao remover arquivo do método:", error);
    res.status(500).json({ mensagem: "Erro ao remover arquivo." });
  }
}

module.exports = { salvarMetodo, removerArquivoMetodo };
