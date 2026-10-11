const db = require("../config/database");

async function registrarSerial(req, res) {
  try {
    const { serial, resultado } = req.body;
    if (!["OK", "NG"].includes(resultado)) return res.status(400).json({ mensagem: "Resultado inválido" });
    const [ocorrencias] = await db.query(`
      SELECT id_ocorrencia, serial_inicial, serial_final FROM ocorrencia_retrabalho WHERE protocolo = ?
    `, [req.params.protocolo]);
    if (!ocorrencias.length) return res.status(404).json({ mensagem: "Ocorrência não encontrada" });
    const ocorrencia = ocorrencias[0];
    const value = typeof serial === "string" ? serial.trim() : "";
    if (!value || value.localeCompare(ocorrencia.serial_inicial, undefined, { numeric: true }) < 0 ||
      value.localeCompare(ocorrencia.serial_final, undefined, { numeric: true }) > 0) {
      return res.status(400).json({ mensagem: "Serial fora da faixa da ocorrência" });
    }
    await db.query(`
      INSERT INTO inspecao_serial (serial, resultado, id_ocorrencia) VALUES (?, ?, ?)
    `, [value, resultado, ocorrencia.id_ocorrencia]);
    res.status(201).json({ mensagem: `Serial registrado como ${resultado}` });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ mensagem: "Este serial já foi registrado." });
    console.error(error);
    res.status(500).json({ mensagem: "Erro ao registrar serial" });
  }
}

async function excluirSerial(req, res) {
  try {
    const [result] = await db.query(`
      DELETE s FROM inspecao_serial s
      INNER JOIN ocorrencia_retrabalho o ON o.id_ocorrencia = s.id_ocorrencia
      WHERE o.protocolo = ? AND s.serial = ?
    `, [req.params.protocolo, req.params.serial]);
    if (!result.affectedRows) return res.status(404).json({ mensagem: "Leitura não encontrada" });
    res.json({ mensagem: "Leitura excluída" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensagem: "Erro ao excluir leitura" });
  }
}

module.exports = { registrarSerial, excluirSerial };
