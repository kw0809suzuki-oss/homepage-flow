module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "GET only" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      status: "UNKNOWN",
      reason: "OPENAI_API_KEY_MISSING",
    });
  }

  let response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-6-luna",
        input: "Use the dmcp tool to roll 2d4+1. Do not answer without using the tool.",
        tools: [
          {
            type: "mcp",
            server_label: "dmcp",
            server_description: "A Dungeons and Dragons MCP server used only to test pre-execution approval capture.",
            server_url: "https://dmcp-server.deno.dev/mcp",
            require_approval: "always",
          },
        ],
        reasoning: { effort: "none" },
        text: { verbosity: "low" },
        max_output_tokens: 200,
        store: false,
      }),
    });
  } catch {
    return res.status(503).json({
      status: "UNKNOWN",
      reason: "OPENAI_RUNTIME_UNAVAILABLE",
    });
  }

  const data = await response.json();

  if (!response.ok) {
    return res.status(502).json({
      status: "UNKNOWN",
      reason: "OPENAI_RUNTIME_ERROR",
      openai_status: response.status,
      error: data?.error?.message || null,
    });
  }

  const approval = Array.isArray(data.output)
    ? data.output.find((item) => item?.type === "mcp_approval_request")
    : null;

  if (!approval) {
    return res.status(409).json({
      status: "UNKNOWN",
      reason: "PRE_EXECUTION_APPROVAL_NOT_OBSERVED",
      response_id: data.id || null,
      output_types: Array.isArray(data.output)
        ? data.output.map((item) => item?.type || "unknown")
        : [],
    });
  }

  let args = null;
  try {
    args = approval.arguments ? JSON.parse(approval.arguments) : null;
  } catch {
    args = approval.arguments || null;
  }

  const proposal = {
    proposalId: approval.id,
    action: approval.name || "unknown",
    target: `mcp:${approval.server_label || "unknown"}`,
    arguments: args,
    source: "openai-responses-mcp",
    responseId: data.id || null,
  };

  const fact = {
    factType: "external_action",
    phase: "PRE_EXECUTION",
    source: "openai-responses-mcp",
    sourceEventId: approval.id,
    target: proposal.target,
    timestamp: new Date().toISOString(),
    evidence: {
      response_id: data.id || null,
      approval_request_id: approval.id,
      tool_name: approval.name || null,
      server_label: approval.server_label || null,
    },
  };

  const detection = {
    classification: "ACTION",
    signal: "external_action",
    reason: "KNOWN_ACTION_SIGNAL",
  };

  return res.status(200).json({
    status: "PRE_EXECUTION_CAPTURED",
    executed: false,
    approval_sent: false,
    proposal,
    fact,
    detection,
    route: "POLICY_GATE",
  });
};
