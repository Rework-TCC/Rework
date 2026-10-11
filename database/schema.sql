CREATE DATABASE IF NOT EXISTS rework
CHARACTER SET utf8mb4;

USE rework;

CREATE TABLE perfil (
    id_perfil INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    id_perfil INT NOT NULL,

    CONSTRAINT fk_usuario_perfil
        FOREIGN KEY (id_perfil)
        REFERENCES perfil(id_perfil)
);

CREATE TABLE linha_producao (
    id_linha INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    setor VARCHAR(100)
);

CREATE TABLE modelo_produto (
    id_modelo INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(100) NOT NULL UNIQUE,
    descricao VARCHAR(255)
);

CREATE TABLE ocorrencia_retrabalho (
    id_ocorrencia INT AUTO_INCREMENT PRIMARY KEY,
    protocolo VARCHAR(20) NOT NULL UNIQUE,
    data_abertura DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    parte_processo VARCHAR(150),
    defeito VARCHAR(150) NOT NULL,
    descricao_problema TEXT NOT NULL,

    serial_inicial VARCHAR(100),
    serial_final VARCHAR(100),

    quantidade_bloqueada INT NOT NULL,
    quantidade_detectada INT DEFAULT 0,

    area_solicitante VARCHAR(100),

    status ENUM(
        'Pendente',
        'Iniciado',
        'Finalizado'
    ) NOT NULL DEFAULT 'Pendente',

    custo_container_hora DECIMAL(10,2) DEFAULT 0,
    custo_atraso_venda_hora DECIMAL(10,2) DEFAULT 0,

    resolvido_em DATETIME NULL,

    id_usuario INT,
    id_linha INT,
    id_modelo INT,

    CONSTRAINT fk_ocorrencia_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario),

    CONSTRAINT fk_ocorrencia_linha
        FOREIGN KEY (id_linha)
        REFERENCES linha_producao(id_linha),

    CONSTRAINT fk_ocorrencia_modelo
        FOREIGN KEY (id_modelo)
        REFERENCES modelo_produto(id_modelo)
);

CREATE TABLE metodo_retrabalho (
    id_metodo INT AUTO_INCREMENT PRIMARY KEY,
    id_ocorrencia INT NOT NULL UNIQUE,

    causa TEXT,
    metodo TEXT,
    classificacao VARCHAR(100),
    departamento VARCHAR(150),
    responsavel VARCHAR(150),

    arquivo_nome VARCHAR(255),
    arquivo_tipo VARCHAR(100),
    arquivo_caminho VARCHAR(500),

    CONSTRAINT fk_metodo_ocorrencia
        FOREIGN KEY (id_ocorrencia)
        REFERENCES ocorrencia_retrabalho(id_ocorrencia)
        ON DELETE CASCADE
);

CREATE TABLE container (
    id_container INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(100) NOT NULL,
    quantidade INT NOT NULL,
    id_ocorrencia INT NOT NULL,

    CONSTRAINT fk_container_ocorrencia
        FOREIGN KEY (id_ocorrencia)
        REFERENCES ocorrencia_retrabalho(id_ocorrencia)
        ON DELETE CASCADE
);

CREATE TABLE inspecao_serial (
    id_inspecao INT AUTO_INCREMENT PRIMARY KEY,
    serial VARCHAR(100) NOT NULL,

    resultado ENUM('OK', 'NG') NOT NULL,

    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,

    id_ocorrencia INT NOT NULL,

    CONSTRAINT fk_inspecao_ocorrencia
        FOREIGN KEY (id_ocorrencia)
        REFERENCES ocorrencia_retrabalho(id_ocorrencia)
        ON DELETE CASCADE,

    UNIQUE (id_ocorrencia, serial)
);

CREATE TABLE historico_ocorrencia (
    id_historico INT AUTO_INCREMENT PRIMARY KEY,

    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    acao VARCHAR(150) NOT NULL,
    observacao TEXT,

    id_ocorrencia INT NOT NULL,

    CONSTRAINT fk_historico_ocorrencia
        FOREIGN KEY (id_ocorrencia)
        REFERENCES ocorrencia_retrabalho(id_ocorrencia)
        ON DELETE CASCADE
);

CREATE TABLE apontamento_retrabalho (
    id_apontamento INT AUTO_INCREMENT PRIMARY KEY,

    data_registro DATETIME DEFAULT CURRENT_TIMESTAMP,

    quantidade_retrabalhada INT NOT NULL,
    tempo_horas DECIMAL(10,2),

    custo_mao_obra DECIMAL(10,2) DEFAULT 0,
    custo_material DECIMAL(10,2) DEFAULT 0,

    id_ocorrencia INT NOT NULL,

    CONSTRAINT fk_apontamento_ocorrencia
        FOREIGN KEY (id_ocorrencia)
        REFERENCES ocorrencia_retrabalho(id_ocorrencia)
        ON DELETE CASCADE
);