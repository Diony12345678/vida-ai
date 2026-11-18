
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";

const app = express();
app.use(express.json({ limit: "100kb" }));

const PORT = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;
const adminToken = process.env.VIDA_ADMIN_TOKEN;

if (!supabaseUrl || !supabaseKey || !adminToken) {
  console.error("Configurações obrigatórias ausentes no Render.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Proteção das rotas administrativas
function proteger(req, res, next) {
  const authorization = req.headers.authorization || "";
  const tokenRecebido = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  const recebido = Buffer.from(tokenRecebido);
  const esperado = Buffer.from(adminToken);

  if (
    recebido.length !== esperado.length ||
    !timingSafeEqual(recebido, esperado)
  ) {
    return res.status(401).json({ erro: "Acesso não autorizado." });
  }

  next();
}

app.get("/", (req, res) => {
  res.json({
    empresa: "VIDA AI",
    status: "Backend iniciado",
    versao: "1.1.0"
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const { error } = await supabase
      .from("vida_status")
      .select("id")
      .limit(1);

    if (error) throw error;

    res.json({
      servidor: "online",
      supabase: "Conectado"
    });
  } catch (error) {
    console.error("Erro Supabase:", error.message);
    res.status(500).json({
      servidor: "online",
      supabase: "Verificação falhou"
    });
  }
});

// MEMÓRIA
app.get("/api/memory", proteger, async (req, res) => {
  let consulta = supabase
    .from("vida_memory")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (req.query.category) {
    consulta = consulta.eq("category", req.query.category);
  }

  const { data, error } = await consulta;
  if (error) return res.status(500).json({ erro: error.message });

  res.json(data);
});

app.post("/api/memory", proteger, async (req, res) => {
  const { category, content } = req.body;

  if (
    typeof category !== "string" || !category.trim() ||
    typeof content !== "string" || !content.trim()
  ) {
    return res.status(400).json({
      erro: "Informe category e content."
    });
  }

  const { data, error } = await supabase
    .from("vida_memory")
    .insert({
      category: category.trim(),
      content: content.trim()
    })
    .select()
    .single();

  if (error) return res.status(500).json({ erro: error.message });

  res.status(201).json(data);
});

// TAREFAS
app.get("/api/tasks", proteger, async (req, res) => {
  const { data, error } = await supabase
    .from("vida_tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ erro: error.message });

  res.json(data);
});

app.post("/api/tasks", proteger, async (req, res) => {
  const { title, description, priority } = req.body;

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ erro: "Informe o título da tarefa." });
  }

  const prioridade = Number.isInteger(priority)
    ? Math.max(1, Math.min(priority, 5))
    : 1;

  const { data, error } = await supabase
    .from("vida_tasks")
    .insert({
      title: title.trim(),
      description: typeof description === "string" ? description.trim() : null,
      priority: prioridade
    })
    .select()
    .single();

  if (error) return res.status(500).json({ erro: error.message });

  res.status(201).json(data);
});

app.patch("/api/tasks/:id", proteger, async (req, res) => {
  const id = Number(req.params.id);
  const { status, result } = req.body;
  const statusPermitidos = ["pending", "in_progress", "completed", "failed"];

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ erro: "ID inválido." });
  }

  if (!statusPermitidos.includes(status)) {
    return res.status(400).json({ erro: "Status inválido." });
  }

  const atualizacao = { status };

  if (typeof result === "string") {
    atualizacao.result = result;
  }

  if (status === "completed") {
    atualizacao.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("vida_tasks")
    .update(atualizacao)
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ erro: error.message });

  res.json(data);
});

// HISTÓRICO DE ATIVIDADES
app.get("/api/activity", proteger, async (req, res) => {
  const { data, error } = await supabase
    .from("vida_activity")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ erro: error.message });

  res.json(data);
});

app.post("/api/activity", proteger, async (req, res) => {
  const { action, details } = req.body;

  if (typeof action !== "string" || !action.trim()) {
    return res.status(400).json({ erro: "Informe a ação." });
  }

  const { data, error } = await supabase
    .from("vida_activity")
    .insert({
      action: action.trim(),
      details: typeof details === "string" ? details.trim() : null
    })
    .select()
    .single();

  if (error) return res.status(500).json({ erro: error.message });

  res.status(201).json(data);
});

// Resposta padrão para erros inesperados
app.use((err, req, res, next) => {
  console.error("Erro interno:", err.message);
  res.status(500).json({ erro: "Erro interno do servidor." });
});

app.listen(PORT, () => {
  console.log(`VIDA AI rodando na porta ${PORT}`);
});
