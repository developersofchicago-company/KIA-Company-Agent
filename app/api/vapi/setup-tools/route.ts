import { NextRequest } from "next/server";
import { createTool, getTools, updateAssistant } from "@/lib/vapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/vapi/setup-tools
 * 
 * Creates the three calendar tools in Vapi and attaches them to the assistant:
 * 1. list_services - Lists available Cal.com event types
 * 2. check_availability - Gets slots for a specific service
 * 3. book_appointment - Books the appointment
 */
export async function POST(request: NextRequest) {
  const assistantId = process.env.VAPI_ASSISTANT_ID;
  if (!assistantId) {
    return new Response(
      JSON.stringify({ error: "VAPI_ASSISTANT_ID not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Get your webhook URL (construct from request or env)
  const url = new URL(request.url);
  const webhookUrl = process.env.VAPI_WEBHOOK_URL || 
    `${url.protocol}//${url.host}/api/vapi/webhook`;

  try {
    // 1. Check if tools already exist
    const existingTools = await getTools();
    const toolNames = ["list_services", "check_availability", "book_appointment"];
    const existing = existingTools.filter(t => 
      toolNames.includes(t.function?.name || "")
    );

    if (existing.length > 0) {
      console.log(`Found ${existing.length} existing calendar tools`);
    }

    const createdTools: string[] = [];

    // 2. Create list_services tool if not exists
    const listServicesExists = existing.find(t => t.function?.name === "list_services");
    let listServicesId = listServicesExists?.id;
    
    if (!listServicesId) {
      const listServices = await createTool({
        type: "function",
        function: {
          name: "list_services",
          description: "List all available appointment services/types from the connected Cal.com calendar. Call this first when the caller wants to book, so they can choose which service they need.",
          parameters: {
            type: "object",
            properties: {},
            required: [],
          },
        },
        server: {
          url: webhookUrl,
          timeoutSeconds: 30,
        },
        async: false,
      });
      listServicesId = listServices.id;
      createdTools.push(`list_services (${listServicesId})`);
      console.log("Created list_services tool:", listServicesId);
    }

    // 3. Create check_availability tool if not exists
    const checkAvailExists = existing.find(t => t.function?.name === "check_availability");
    let checkAvailId = checkAvailExists?.id;
    
    if (!checkAvailId) {
      const checkAvailability = await createTool({
        type: "function",
        function: {
          name: "check_availability",
          description: "Check available appointment slots for a specific service from the connected Cal.com calendar. Call this after the caller has chosen a service from list_services.",
          parameters: {
            type: "object",
            properties: {
              service_name: {
                type: "string",
                description: "The exact service name the caller chose (e.g., 'Discovery Call' or 'Security Consultation')",
              },
              days: {
                type: "number",
                description: "Number of days to look ahead for availability (default 7, max 30)",
              },
            },
            required: ["service_name"],
          },
        },
        server: {
          url: webhookUrl,
          timeoutSeconds: 30,
        },
        async: false,
      });
      checkAvailId = checkAvailability.id;
      createdTools.push(`check_availability (${checkAvailId})`);
      console.log("Created check_availability tool:", checkAvailId);
    }

    // 4. Create book_appointment tool if not exists
    const bookExists = existing.find(t => t.function?.name === "book_appointment");
    let bookId = bookExists?.id;
    
    if (!bookId) {
      const bookAppointment = await createTool({
        type: "function",
        function: {
          name: "book_appointment",
          description: "Book an appointment on the Cal.com calendar. Only call this after the caller has confirmed a specific time slot from the availability results.",
          parameters: {
            type: "object",
            properties: {
              start_time: {
                type: "string",
                description: "Exact ISO 8601 datetime of the chosen slot (from check_availability results)",
              },
              service_name: {
                type: "string",
                description: "The service name they selected (e.g., 'Discovery Call')",
              },
              name: {
                type: "string",
                description: "Full name of the person booking",
              },
              email: {
                type: "string",
                description: "Email address of the person booking",
              },
              phone: {
                type: "string",
                description: "Phone number of the person booking (optional)",
              },
            },
            required: ["start_time", "service_name", "name", "email"],
          },
        },
        server: {
          url: webhookUrl,
          timeoutSeconds: 30,
        },
        async: false,
      });
      bookId = bookAppointment.id;
      createdTools.push(`book_appointment (${bookId})`);
      console.log("Created book_appointment tool:", bookId);
    }

    // 5. Attach tools to assistant
    const toolIds = [listServicesId, checkAvailId, bookId].filter(Boolean) as string[];
    
    // Try attaching via tools array with references
    try {
      await updateAssistant(assistantId, {
        tools: toolIds.map(id => ({ type: "function" as const, id })),
      });
    } catch (attachErr) {
      console.error("Failed to attach tools via 'tools' field:", attachErr);
      
      // Fallback: try toolIds field
      try {
        await updateAssistant(assistantId, {
          toolIds: toolIds,
        });
      } catch (attachErr2) {
        console.error("Failed to attach tools via 'toolIds' field:", attachErr2);
        throw new Error(`Could not attach tools to assistant: ${(attachErr as Error).message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Setup complete. ${createdTools.length} tools created, ${toolIds.length} tools attached to assistant.`,
        created: createdTools,
        allToolIds: toolIds,
        webhookUrl,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Failed to setup Vapi tools:", error);
    const err = error as Error;
    // Check if it's a VapiError with more details
    const status = (error as { status?: number }).status;
    const body = (error as { body?: unknown }).body;
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to setup tools", 
        message: err.message,
        status: status,
        vapiError: body,
        stack: err.stack,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * GET /api/vapi/setup-tools
 * 
 * Check current tool status
 */
export async function GET() {
  try {
    const tools = await getTools();
    const calendarTools = tools.filter(t => 
      ["list_services", "check_availability", "book_appointment"].includes(
        t.function?.name || ""
      )
    );

    return new Response(
      JSON.stringify({
        totalTools: tools.length,
        calendarTools: calendarTools.map(t => ({
          id: t.id,
          name: t.function?.name,
          type: t.type,
        })),
        missing: ["list_services", "check_availability", "book_appointment"].filter(
          name => !calendarTools.find(t => t.function?.name === name)
        ),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
