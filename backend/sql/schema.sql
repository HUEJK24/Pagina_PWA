CREATE TABLE IF NOT EXISTS reportes (
  id UUID PRIMARY KEY,
  tecnico TEXT,
  cliente TEXT NOT NULL,
  servicio TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  ubicacion TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  estado TEXT NOT NULL DEFAULT 'reportado',
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reportes_fecha_idx ON reportes (fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS reportes_cliente_idx ON reportes (cliente);
