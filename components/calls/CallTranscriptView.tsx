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
      <CardHeader>
        <CardTitle className="text-base font-semibold text-dc-navy">
          Conversation transcript
        </CardTitle>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {status === "in_progress"
              ? "Transcript will appear here as the call progresses."
              : "Transcript will appear here after the call ends."}
          </p>
        ) : (
          <ol className="space-y-3" aria-label="Transcript messages">
            {messages.map((m, i) => {
              const isAi = m.role === "ai";
              return (
                <li
                  key={i}
                  className={cn(
                    "flex w-full",
                    isAi ? "justify-start" : "justify-end",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                      isAi
                        ? "rounded-bl-sm bg-dc-blue text-white"
                        : "rounded-br-sm bg-muted text-dc-navy",
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {m.text}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-[10px] uppercase tracking-wider",
                        isAi ? "text-white/70" : "text-muted-foreground",
                      )}
                    >
                      {isAi ? "AI" : "Caller"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
