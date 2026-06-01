import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseTranscript } from "@/lib/format";

interface Props {
  transcript: string | null;
  status: string | null;
}

export function CallTranscriptView({ transcript, status }: Props) {
  const messages = parseTranscript(transcript);

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-dc-navy">
            Conversation
          </CardTitle>
          {messages.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {status === "in_progress"
              ? "Transcript will appear here as the call progresses."
              : "No transcript available for this call."}
          </p>
        ) : (
          <div className="flex flex-col gap-1 p-4 max-h-[520px] overflow-y-auto">
            {messages.map((m, i) => {
              const isAi = m.role === "ai";
              const prevRole = messages[i - 1]?.role;
              const nextRole = messages[i + 1]?.role;
              const isFirst = prevRole !== m.role;
              const isLast = nextRole !== m.role;

              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-end gap-2",
                    isAi ? "justify-start" : "justify-end",
                    !isLast && "mb-0.5",
                    isLast && "mb-3",
                  )}
                >
                  {/* AI avatar — only on last bubble in group */}
                  {isAi && (
                    <div className={cn("shrink-0 w-7 h-7", !isLast && "invisible")}>
                      <div className="w-7 h-7 rounded-full bg-dc-blue flex items-center justify-center">
                        <Bot className="h-3.5 w-3.5 text-white" />
                      </div>
                    </div>
                  )}

                  <div
                    className={cn(
                      "max-w-[72%] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                      isAi
                        ? "bg-[#E8EAED] text-gray-900"
                        : "bg-dc-blue text-white",
                      // Messenger-style radius: flat corner on grouped side
                      isAi && isFirst && isLast && "rounded-2xl",
                      isAi && isFirst && !isLast && "rounded-2xl rounded-bl-md",
                      isAi && !isFirst && isLast && "rounded-2xl rounded-tl-md",
                      isAi && !isFirst && !isLast && "rounded-2xl rounded-l-md",
                      !isAi && isFirst && isLast && "rounded-2xl",
                      !isAi && isFirst && !isLast && "rounded-2xl rounded-br-md",
                      !isAi && !isFirst && isLast && "rounded-2xl rounded-tr-md",
                      !isAi && !isFirst && !isLast && "rounded-2xl rounded-r-md",
                    )}
                  >
                    {isFirst && (
                      <p className={cn(
                        "text-[10px] font-semibold uppercase tracking-wider mb-1",
                        isAi ? "text-dc-blue" : "text-white/70",
                      )}>
                        {isAi ? "AI Agent" : "Caller"}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>

                  {/* Caller avatar — only on last bubble in group */}
                  {!isAi && (
                    <div className={cn("shrink-0 w-7 h-7", !isLast && "invisible")}>
                      <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
