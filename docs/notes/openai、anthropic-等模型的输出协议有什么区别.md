---
title: OpenAI、Anthropic 等模型的输出协议有什么区别
---
OpenAI 和 Anthropic 的模型输出协议存在显著差异，它们并非简单的“版本不同”，而是两套在**设计哲学、数据结构和能力边界**上完全独立的体系。理解这些区别，对于避免集成时的“想当然”错误至关重要。

### 核心差异概览

下表从几个关键维度，对比了 OpenAI（Chat Completions 和 Responses API）与 Anthropic（Messages API）的输出协议区别。

| 维度 | OpenAI Chat Completions | OpenAI Responses API | Anthropic Messages API |
| :--- | :--- | :--- | :--- |
| **核心端点** | `/v1/chat/completions` | `/v1/responses` | `/v1/messages` |
| **设计定位** | 通用的文本生成，行业事实标准 | 面向智能体（Agent）工作流，集成内置工具 | Claude 原生接口，支持深度思考等特性 |
| **请求体结构** | `messages` 数组包含 `role` (`system`/`user`/`assistant`) | `input` 数组，包含更丰富的 item 类型 | `system` 为独立字段 |
| **响应结构** | `choices[].message` 对象 | 异构的 `output` 数组 (`message`, `function_call`, `reasoning`) | 无 `choices` 数组，响应即为单个结果 |
| **结构化输出** | **Structured Outputs**：通过 `response_format` 保证100%符合 JSON Schema | 支持 `json_schema` 等格式 | **`output_config.format`**：通过约束解码保证符合 Schema |
| **工具调用** | `tools` 数组，响应通过 `tool_calls` 返回 | 内置工具类型 | `tools` 数组，响应通过 `tool_use` 内容块返回 |
| **流式输出** | 基于 **SSE**，数据在 `choices[].delta` 中 | 基于 SSE | 基于 **SSE**，但有自己独立的事件类型（如 `content_block_delta`） |
| **认证方式** | `Authorization: Bearer <token>` | 同左 | `x-api-key` 头，常配合 `anthropic-version` |

### 关键区别详解

#### 1. 结构化输出：可靠性保障的差异
两者的核心目标都是让模型返回符合预期的 JSON，但实现机制和可靠性不同。

*   **OpenAI：强制符合 (Guaranteed Compliance)**
    通过 `response_format` 参数实现。它有两种模式：
    *   **JSON 模式 (`json_object`)**：仅保证输出是有效的 JSON，但不保证符合特定 Schema。
    *   **结构化输出 (`json_schema`)**：在底层通过“约束解码”实现，保证模型输出的每个 token 都符合你定义的 JSON Schema。这是官方推荐的方式。
*   **Anthropic：最佳努力 (Best Effort) + 工具兜底**
    *   **JSON 输出 (`output_config.format`)**：通过约束解码保证输出符合你提供的 JSON Schema。
    *   **工具调用 (`tool_use`)**：这是 Anthropic 早期实现可靠结构化输出的主要方式，将输出格式定义为工具，模型必须按工具定义返回参数。

> **结论**：如果你需要 100% 保证输出格式用于下游系统，OpenAI 的 `json_schema` 模式是更可靠的选择；而 Anthropic 的 JSON 输出在可靠性上接近 OpenAI。

#### 2. 工具/函数调用：概念与结构的映射
两者都支持让模型调用外部函数，但数据模型不同。

*   **OpenAI**：在请求中通过 `tools` 数组定义工具，响应中模型会返回一个 `tool_calls` 数组，明确列出需要调用的函数及其参数。
*   **Anthropic**：同样通过 `tools` 数组定义，但响应中，工具调用请求是作为 `content` 数组中的一个 `tool_use` 类型的块（block）返回的。这种设计将文本回复和工具调用请求放在同一层级，便于处理复杂场景。

#### 3. 响应结构：单一对象与数组
这是最直观的区别，直接影响你的代码解析逻辑。

*   **OpenAI Chat Completions**：响应被包裹在 `choices` 数组中（通常只有一个元素），真正的回复内容在 `choices[0].message` 里。
*   **OpenAI Responses API**：这是一个更新的协议，其 `output` 是一个异构数组，可以包含 `message`、`function_call` 等多种类型的项，为处理复杂工作流提供了更大灵活性。
*   **Anthropic Messages API**：设计更简洁，响应本身就是一个完整的对象，没有 `choices` 这一层封装，直接包含 `content` 数组和 `stop_reason` 等字段。

### 总结：如何选择与迁移

OpenAI 和 Anthropic 的协议差异是根本性的，**不能简单地通过更换 URL 和 API Key 来实现互通**。

*   **对于新项目**：
    *   若主要使用 OpenAI 模型，推荐使用功能更强大的 **Responses API**。
    *   若使用 Claude，应直接使用其原生的 **Messages API**，以充分利用其独特功能。
*   **对于跨模型兼容**：你需要一个“适配层”来转换两套协议的数据结构，或者使用像 Portkey、OpenRouter 这类提供了统一接口的 API 网关。

选择哪种协议，本质上是在**生态兼容性**（OpenAI Chat Completions 是事实标准）和**模型特定能力**（如 Claude 的深度思考）之间做权衡。
