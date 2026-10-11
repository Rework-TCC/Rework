const db = require("../config/database");

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
    await connection.query(`
      INSERT INTO metodo_retrabalho (id_ocorrencia, causa, metodo, classificacao, departamento, responsavel)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE causa = VALUES(causa), metodo = VALUES(metodo),
        classificacao = VALUES(classificacao), departamento = VALUES(departamento), responsavel = VALUES(responsavel)
    `, [id, causa, metodo, classificacao, departamento, responsavel]);
    await connection.query(`
      UPDATE ocorrencia_retrabalho SET status = CASE WHEN status = 'Pendente'
        THEN 'Iniciado' ELSE status END WHERE id_ocorrencia = ?
    `, [id]);
    await connection.commit();
    res.json({ mensagem: "Método salvo com sucesso" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(error);
    res.status(500).json({ mensagem: "Erro ao salvar método" });
  } finally {
    if (connection) connection.release();
  }
}

module.exports = { salvarMetodo };
