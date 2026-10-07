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
        input: "Search the OpenAI docs for Responses API streaming. You must use the openai_docs tool before answering.",
        tools: [
          {
            type: "mcp",
            server_label: "openai_docs",
            server_description: "Search and read the public OpenAI documentation.",
            server_url: "https://developers.openai.com/mcp",
            require_approval: "always",
            allowed_tools: ["search_openai_docs"],
          },
        ],
        reasoning: { effort: "none" },
        text: { verbosity: "low" },
        max_output_tokens: 200,
        store: false,
      }),
    });
  } catch (error) {
    console.error("OPENAI_PREEXEC_FETCH_ERROR", {
      name: error?.name || null,
      message: error?.message || null,
    });
    return res.status(503).json({
      status: "UNKNOWN",
      reason: "OPENAI_RUNTIME_UNAVAILABLE",
    });
  }

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    console.error("OPENAI_PREEXEC_RESPONSE_PARSE_ERROR", {
      openai_status: response.status,
      name: error?.name || null,
      message: error?.message || null,
    });
    return res.status(502).json({
      status: "UNKNOWN",
      reason: "OPENAI_RESPONSE_PARSE_ERROR",
      openai_status: response.status,
    });
  }

  if (!response.ok) {
    console.error("OPENAI_PREEXEC_API_ERROR", {
      openai_status: response.status,
      error_code: data?.error?.code || null,
      error_type: data?.error?.type || null,
      error_message: data?.error?.message || null,
    });
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
