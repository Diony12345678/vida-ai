
import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Configurações do Supabase ausentes.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

app.get("/", (req, res) => {
  res.json({
    empresa: "VIDA AI",
    status: "Backend iniciado",
    versao: "1.0.0"
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const { error } = await supabase
      .from("vida_status")
      .select("*")
      .limit(1);

    if (error && error.code !== "42P01") {
      throw error;
    }

    res.json({
      servidor: "online",
      supabase: error ? "Conectado; tabela ainda não criada" : "Conectado"
    });
  } catch (error) {
    console.error("Erro Supabase:", error.message);
    res.status(500).json({
      servidor: "online",
      supabase: "Verificação falhou"
    });
  }
});

app.listen(PORT, () => {
  console.log(`VIDA AI rodando na porta ${PORT}`);
});
