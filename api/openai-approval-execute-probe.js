const MCP_TOOL = {
  type: "mcp",
  server_label: "openai_docs",
  server_description: "Search and read the public OpenAI documentation.",
  server_url: "https://developers.openai.com/mcp",
  require_approval: "always",
  allowed_tools: ["search_openai_docs"],
};

async function postOpenAI(apiKey, body) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    return {
      ok: false,
      status: response.status,
      parseError: error?.message || "unknown",
      data: null,
    };
  }

  return { ok: response.ok, status: response.status, data };
}

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

  const [
    { collectExecutionFact, appendExecutionFact },
    { detectBoundary },
    { routeDetectedFact },
    { evaluateBoundaryPolicy },
  ] = await Promise.all([
    import("../direction-gate/execution-facts.js"),
    import("../direction-gate/boundary-detector.js"),
    import("../direction-gate/execution-os.js"),
    import("../direction-gate/boundary-policy.js"),
  ]);

  let first;
  try {
    first = await postOpenAI(apiKey, {
      model: "gpt-6-luna",
      input: "Search the OpenAI docs for the MCP approval flow. Find the documentation that contains both mcp_approval_request and require_approval. You must use the openai_docs tool before answering.",
      tools: [MCP_TOOL],
      reasoning: { effort: "none" },
      text: { verbosity: "low" },
      max_output_tokens: 200,
      store: true,
    });
  } catch (error) {
    console.error("OPENAI_APPROVAL_FLOW_INITIAL_FETCH_ERROR", {
      name: error?.name || null,
      message: error?.message || null,
    });
    return res.status(503).json({
      status: "UNKNOWN",
      stage: "INITIAL_RESPONSE",
      reason: "OPENAI_RUNTIME_UNAVAILABLE",
    });
  }

  if (!first.ok) {
    console.error("OPENAI_APPROVAL_FLOW_INITIAL_API_ERROR", {
      openai_status: first.status,
      error_code: first.data?.error?.code || null,
      error_type: first.data?.error?.type || null,
      error_message: first.data?.error?.message || null,
      parse_error: first.parseError || null,
    });
    return res.status(502).json({
      status: "UNKNOWN",
      stage: "INITIAL_RESPONSE",
      reason: "OPENAI_RUNTIME_ERROR",
      openai_status: first.status,
      error: first.data?.error?.message || first.parseError || null,
    });
  }

  const initial = first.data;
  const approval = Array.isArray(initial?.output)
    ? initial.output.find((item) => item?.type === "mcp_approval_request")
    : null;

  if (!approval) {
    return res.status(409).json({
      status: "UNKNOWN",
      stage: "PRE_EXECUTION",
      reason: "PRE_EXECUTION_APPROVAL_NOT_OBSERVED",
      response_id: initial?.id || null,
      output_types: Array.isArray(initial?.output)
        ? initial.output.map((item) => item?.type || "unknown")
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
    responseId: initial?.id || null,
  };

  const preFact = collectExecutionFact({
    kind: "external_action",
    phase: "PRE_EXECUTION",
    source: "openai-responses-mcp",
    sourceEventId: approval.id,
    target: proposal.target,
    evidence: {
      response_id: initial?.id || null,
      approval_request_id: approval.id,
      tool_name: approval.name || null,
      server_label: approval.server_label || null,
    },
  });

  const preRecord = appendExecutionFact([], preFact);
  const detection = detectBoundary(preFact);
  const route = routeDetectedFact(preFact, detection);

  const exactReadOnlyProbe =
    approval.server_label === "openai_docs" &&
    approval.name === "search_openai_docs";

  const actionPolicyInput = {
    permission: exactReadOnlyProbe,
    target: proposal.target,
    scope: "openai-docs-readonly-probe",
    impact: "LOW",
    reversibility: "REVERSIBLE",
  };

  const policy =
    route === "POLICY_GATE"
      ? evaluateBoundaryPolicy({
          boundary: detection.classification,
          action: actionPolicyInput,
        })
      : {
          gate: "ROUTER",
          decision: "UNKNOWN",
          reasons: ["NOT_PRE_EXECUTION_POLICY_ROUTE"],
        };

  if (preRecord.status !== "RECORDED" || policy.decision !== "ALLOW") {
    return res.status(200).json({
      status: "CONTROLLED_STOP",
      executed: false,
      approval_sent: false,
      proposal,
      pre_execution: {
        record_status: preRecord.status,
        fact: preFact,
        detection,
        route,
        policy_input: actionPolicyInput,
        policy,
      },
    });
  }

  let second;
  try {
    second = await postOpenAI(apiKey, {
      model: "gpt-6-luna",
      tools: [MCP_TOOL],
      previous_response_id: initial.id,
      input: [
        {
          type: "mcp_approval_response",
          approve: true,
          approval_request_id: approval.id,
        },
      ],
      reasoning: { effort: "none" },
      text: { verbosity: "low" },
      max_output_tokens: 300,
      store: false,
    });
  } catch (error) {
    console.error("OPENAI_APPROVAL_FLOW_CONTINUE_FETCH_ERROR", {
      name: error?.name || null,
      message: error?.message || null,
    });
    return res.status(503).json({
      status: "UNKNOWN",
      stage: "APPROVAL_CONTINUATION",
      approval_sent: true,
      reason: "OPENAI_RUNTIME_UNAVAILABLE",
      pre_execution: { detection, route, policy },
    });
  }

  if (!second.ok) {
    console.error("OPENAI_APPROVAL_FLOW_CONTINUE_API_ERROR", {
      openai_status: second.status,
      error_code: second.data?.error?.code || null,
      error_type: second.data?.error?.type || null,
      error_message: second.data?.error?.message || null,
      parse_error: second.parseError || null,
    });
    return res.status(502).json({
      status: "UNKNOWN",
      stage: "APPROVAL_CONTINUATION",
      approval_sent: true,
      reason: "OPENAI_RUNTIME_ERROR",
      openai_status: second.status,
      error: second.data?.error?.message || second.parseError || null,
      pre_execution: { detection, route, policy },
    });
  }

  const continued = second.data;
  const mcpCall = Array.isArray(continued?.output)
    ? continued.output.find(
        (item) =>
          item?.type === "mcp_call" &&
          (item?.approval_request_id === approval.id ||
            (item?.server_label === approval.server_label &&
              item?.name === approval.name))
      )
    : null;

  const postFact = mcpCall
    ? collectExecutionFact({
        kind: "external_action",
        phase: "POST_EXECUTION",
        source: "openai-responses-mcp",
        sourceEventId: mcpCall.id || approval.id,
        target: proposal.target,
        evidence: {
          response_id: continued?.id || null,
          approval_request_id: approval.id,
          mcp_call_id: mcpCall.id || null,
          mcp_call_status: mcpCall.status || null,
          mcp_call_error: mcpCall.error || null,
        },
      })
    : null;

  const postDetection = postFact ? detectBoundary(postFact) : null;
  const postRoute =
    postFact && postDetection ? routeDetectedFact(postFact, postDetection) : null;

  let reobserve = {
    status: "UNKNOWN",
    reasons: ["EXECUTION_NOT_OBSERVED"],
  };

  if (mcpCall) {
    const markers = ["mcp_approval_request", "require_approval"];
    const executionOutput =
      typeof mcpCall.output === "string" ? mcpCall.output : "";

    let realityResponse = null;
    let realityText = "";
    try {
      realityResponse = await fetch(
        "https://developers.openai.com/api/docs/guides/tools-connectors-mcp",
        {
          method: "GET",
          headers: {
            "User-Agent": "execution-os-v0-reobserve",
          },
        }
      );
      realityText = await realityResponse.text();
    } catch (error) {
      console.error("OPENAI_DOCS_REOBSERVE_FETCH_ERROR", {
        name: error?.name || null,
        message: error?.message || null,
      });
      reobserve = {
        status: "UNKNOWN",
        reasons: ["REALITY_UNAVAILABLE"],
      };
    }

    if (realityResponse) {
      if (!realityResponse.ok) {
        reobserve = {
          status: "UNKNOWN",
          reasons: ["REALITY_HTTP_NOT_OK"],
          reality_status: realityResponse.status,
        };
      } else {
        const missingFromExecution = markers.filter(
          (marker) => !executionOutput.includes(marker)
        );
        const missingFromReality = markers.filter(
          (marker) => !realityText.includes(marker)
        );

        if (missingFromReality.length) {
          reobserve = {
            status: "UNKNOWN",
            reasons: ["REALITY_MARKERS_NOT_OBSERVED"],
            missing_from_reality: missingFromReality,
          };
        } else if (missingFromExecution.length) {
          reobserve = {
            status: "CONFLICT",
            reasons: ["EXECUTION_OUTPUT_DOES_NOT_MATCH_REALITY_MARKERS"],
            missing_from_execution: missingFromExecution,
          };
        } else {
          reobserve = {
            status: "VERIFIED",
            reasons: [],
            reality_source:
              "https://developers.openai.com/api/docs/guides/tools-connectors-mcp",
            markers,
          };
        }
      }
    }
  }

  return res.status(200).json({
    status: mcpCall ? "EXECUTION_OBSERVED" : "EXECUTION_NOT_OBSERVED",
    executed:
      Boolean(mcpCall) &&
      mcpCall.status !== "failed" &&
      !mcpCall.error,
    approval_sent: true,
    proposal,
    pre_execution: {
      record_status: preRecord.status,
      fact: preFact,
      detection,
      route,
      policy_input: actionPolicyInput,
      policy,
    },
    approval_response: {
      approve: true,
      approval_request_id: approval.id,
      previous_response_id: initial.id,
    },
    execution: mcpCall
      ? {
          type: mcpCall.type,
          id: mcpCall.id || null,
          name: mcpCall.name || null,
          server_label: mcpCall.server_label || null,
          status: mcpCall.status || null,
          approval_request_id: mcpCall.approval_request_id || null,
          error: mcpCall.error || null,
          output_present: typeof mcpCall.output === "string",
        }
      : {
          output_types: Array.isArray(continued?.output)
            ? continued.output.map((item) => item?.type || "unknown")
            : [],
        },
    post_execution: postFact
      ? {
          fact: postFact,
          detection: postDetection,
          route: postRoute,
        }
      : null,
    reality_reobserve: reobserve,
  });
};
