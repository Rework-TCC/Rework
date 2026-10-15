const db = require("../config/database");

async function listarOcorrencias(req, res) {
  try {
    const [ocorrencias] = await db.query(`
      SELECT
        o.*,
        l.nome AS linha,
        m.codigo AS modelo
      FROM ocorrencia_retrabalho o
      LEFT JOIN linha_producao l
        ON l.id_linha = o.id_linha
      LEFT JOIN modelo_produto m
        ON m.id_modelo = o.id_modelo
      ORDER BY o.data_abertura DESC
    `);

    if (!ocorrencias.length) {
      return res.json([]);
    }

    const ids = ocorrencias.map(
      occurrence => occurrence.id_ocorrencia
    );

    const placeholders =
      ids.map(() => "?").join(",");

    const [scans] = await db.query(
      `
      SELECT
        id_ocorrencia,
        serial,
        resultado AS result,
        data_hora AS at
      FROM inspecao_serial
      WHERE id_ocorrencia IN (${placeholders})
      ORDER BY data_hora DESC
      `,
      ids
    );

    const [metodos] = await db.query(
      `
      SELECT *
      FROM metodo_retrabalho
      WHERE id_ocorrencia IN (${placeholders})
      `,
      ids
    );

    const resultado = ocorrencias.map(
      occurrence => ({
        ...occurrence,

        scans: scans.filter(
          scan =>
            scan.id_ocorrencia ===
            occurrence.id_ocorrencia
        ),

        metodo:
          metodos.find(
            metodo =>
              metodo.id_ocorrencia ===
              occurrence.id_ocorrencia
          ) || null
      })
    );

    res.json(resultado);

  } catch (error) {
    console.error(
      "Erro ao listar ocorrências:",
      error
    );

    res.status(500).json({
      mensagem:
        "Erro ao buscar ocorrências"
    });
  }
}

async function criarOcorrencia(req, res) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      linha,
      modelo,
      parte_processo,
      defeito,
      descricao_problema,
      serial_inicial,
      serial_final,
      quantidade_bloqueada,
      quantidade_detectada,
      area_solicitante,
      status,
      custo_container_hora,
      custo_atraso_venda_hora,
      containers = []
    } = req.body;

    // ================================
    // 1. LINHA DE PRODUÇÃO
    // ================================

    const [linhas] = await connection.query(
      `
      SELECT id_linha
      FROM linha_producao
      WHERE nome = ?
      LIMIT 1
      `,
      [linha]
    );

    let idLinha;

    if (linhas.length > 0) {
      idLinha = linhas[0].id_linha;
    } else {
      const [novaLinha] = await connection.query(
        `
        INSERT INTO linha_producao (nome)
        VALUES (?)
        `,
        [linha]
      );

      idLinha = novaLinha.insertId;
    }

    // ================================
    // 2. MODELO DO PRODUTO
    // ================================

    const [modelos] = await connection.query(
      `
      SELECT id_modelo
      FROM modelo_produto
      WHERE codigo = ?
      LIMIT 1
      `,
      [modelo]
    );

    let idModelo;

    if (modelos.length > 0) {
      idModelo = modelos[0].id_modelo;
    } else {
      const [novoModelo] = await connection.query(
        `
        INSERT INTO modelo_produto (codigo)
        VALUES (?)
        `,
        [modelo]
      );

      idModelo = novoModelo.insertId;
    }

    // ================================
    // 3. GERAR PROTOCOLO
    // ================================

    const [protocolos] = await connection.query(`
      SELECT
        COALESCE(
          MAX(
            CAST(
              SUBSTRING(protocolo, 4)
              AS UNSIGNED
            )
          ),
          0
        ) + 1 AS proximo
      FROM ocorrencia_retrabalho
      WHERE protocolo REGEXP '^RW-[0-9]+$'
    `);

    const numeroProtocolo = protocolos[0].proximo;

    const protocolo =
      `RW-${String(numeroProtocolo).padStart(3, "0")}`;

    // ================================
    // 4. CRIAR OCORRÊNCIA
    // ================================

    const [result] = await connection.query(
      `
      INSERT INTO ocorrencia_retrabalho (
        protocolo,
        parte_processo,
        defeito,
        descricao_problema,
        serial_inicial,
        serial_final,
        quantidade_bloqueada,
        quantidade_detectada,
        area_solicitante,
        status,
        custo_container_hora,
        custo_atraso_venda_hora,
        id_linha,
        id_modelo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        protocolo,
        parte_processo,
        defeito,
        descricao_problema,
        serial_inicial,
        serial_final,
        quantidade_bloqueada,
        quantidade_detectada,
        area_solicitante,
        status || "Pendente",
        custo_container_hora || 0,
        custo_atraso_venda_hora || 0,
        idLinha,
        idModelo
      ]
    );

    const idOcorrencia = result.insertId;

    // ================================
    // 5. CONTAINERS
    // ================================

    for (const container of containers) {
      await connection.query(
        `
        INSERT INTO container (
          codigo,
          quantidade,
          id_ocorrencia
        )
        VALUES (?, ?, ?)
        `,
        [
          container.id,
          container.qty,
          idOcorrencia
        ]
      );
    }

    // Tudo funcionou
    await connection.commit();

    res.status(201).json({
      mensagem: "Ocorrência criada com sucesso",
      id_ocorrencia: idOcorrencia,
      protocolo: protocolo
    });

  } catch (error) {

    // Se qualquer etapa der erro,
    // desfaz tudo daquele cadastro.
    await connection.rollback();

    console.error(
      "Erro ao criar ocorrência:",
      error
    );

    res.status(500).json({
      mensagem: "Erro ao criar ocorrência",
      erro: error.message
    });

  } finally {
    connection.release();
  }
}

async function atualizarOcorrencia(req, res) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const { protocolo } = req.params;
    const { linha, modelo, defeito, descricao_problema, serial_inicial,
      serial_final, quantidade_bloqueada, status, custo_container_hora,
      custo_atraso_venda_hora } = req.body;
    const [existentes] = await connection.query(
      "SELECT id_ocorrencia FROM ocorrencia_retrabalho WHERE protocolo = ? FOR UPDATE", [protocolo]);
    if (!existentes.length) {
      await connection.rollback();
      return res.status(404).json({ mensagem: "Ocorrência não encontrada" });
    }
    const [linhas] = await connection.query(
      "SELECT id_linha FROM linha_producao WHERE nome = ? LIMIT 1", [linha]);
    let idLinha = linhas[0]?.id_linha;
    if (!idLinha) {
      const [result] = await connection.query("INSERT INTO linha_producao (nome) VALUES (?)", [linha]);
      idLinha = result.insertId;
    }
    const [modelos] = await connection.query(
      "SELECT id_modelo FROM modelo_produto WHERE codigo = ? LIMIT 1", [modelo]);
    let idModelo = modelos[0]?.id_modelo;
    if (!idModelo) {
      const [result] = await connection.query("INSERT INTO modelo_produto (codigo) VALUES (?)", [modelo]);
      idModelo = result.insertId;
    }
    await connection.query(`
      UPDATE ocorrencia_retrabalho SET
        defeito = ?, descricao_problema = ?, serial_inicial = ?, serial_final = ?,
        quantidade_bloqueada = ?, status = ?, custo_container_hora = ?,
        custo_atraso_venda_hora = ?, id_linha = ?, id_modelo = ?,
        resolvido_em = CASE WHEN ? = 'Finalizado'
          THEN COALESCE(resolvido_em, NOW()) ELSE NULL END
      WHERE protocolo = ?
    `, [defeito, descricao_problema, serial_inicial, serial_final,
      quantidade_bloqueada, status, custo_container_hora || 0,
      custo_atraso_venda_hora || 0, idLinha, idModelo, status, protocolo]);
    await connection.commit();
    res.json({ mensagem: "Ocorrência atualizada com sucesso" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(error);
    res.status(500).json({ mensagem: "Erro ao atualizar ocorrência", erro: error.message });
  } finally {
    if (connection) connection.release();
  }
}

async function excluirOcorrencia(req, res) {
  try {
    const [result] = await db.query(
      "DELETE FROM ocorrencia_retrabalho WHERE protocolo = ?", [req.params.protocolo]);
    if (!result.affectedRows) return res.status(404).json({ mensagem: "Ocorrência não encontrada" });
    res.json({ mensagem: "Ocorrência excluída com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensagem: "Erro ao excluir ocorrência" });
  }
}

async function buscarOcorrencia(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT o.*, l.nome AS linha, m.codigo AS modelo
      FROM ocorrencia_retrabalho o
      LEFT JOIN linha_producao l ON l.id_linha = o.id_linha
      LEFT JOIN modelo_produto m ON m.id_modelo = o.id_modelo
      WHERE o.protocolo = ?
    `, [req.params.protocolo]);
    if (!rows.length) return res.status(404).json({ mensagem: "Ocorrência não encontrada" });
    const ocorrencia = rows[0];
    const [containers] = await db.query(
      "SELECT codigo AS id, quantidade AS qty FROM container WHERE id_ocorrencia = ?",
      [ocorrencia.id_ocorrencia]);
    const [scans] = await db.query(`
      SELECT serial, resultado AS result, data_hora AS at FROM inspecao_serial
      WHERE id_ocorrencia = ? ORDER BY data_hora DESC
    `, [ocorrencia.id_ocorrencia]);
    const [metodos] = await db.query(
      "SELECT * FROM metodo_retrabalho WHERE id_ocorrencia = ?", [ocorrencia.id_ocorrencia]);
    res.json({ ...ocorrencia, containers, scans, metodo: metodos[0] || null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensagem: "Erro ao carregar ocorrência" });
  }
}

module.exports = {
  listarOcorrencias, criarOcorrencia, atualizarOcorrencia, excluirOcorrencia, buscarOcorrencia
};
