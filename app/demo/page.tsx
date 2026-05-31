import { VapiWebCall } from "@/components/shared/VapiWebCall";
import { Bot, Mic } from "lucide-react";

const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? "";

const DEPARTMENTS = [
  {
    id: "appointment-scheduler",
    name: "Appointment Scheduler",
    description: "Book a test drive, service visit, or sales consultation with our AI agent.",
    icon: "📅",
  },
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D1B3E] to-[#1A2950] flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#0066FF] flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold leading-tight">DC AI Receptionist</p>
            <p className="text-white/50 text-xs">Live Demo</p>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-2xl w-full text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/70 text-sm border border-white/10">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            AI Agent Online
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
            Talk to Our AI Receptionist
          </h1>
          <p className="text-white/60 text-lg">
            Experience our bilingual AI agent live. Click any department below to start a browser call — no phone needed.
          </p>
        </div>

        {/* Department Cards */}
        <div className="max-w-2xl w-full grid gap-4 sm:grid-cols-1">
          {DEPARTMENTS.map((dept) => (
            <div
              key={dept.id}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-white/10 transition-colors"
            >
              <div className="text-4xl">{dept.icon}</div>
              <div className="flex-1">
                <h2 className="text-white font-semibold text-lg">{dept.name}</h2>
                <p className="text-white/50 text-sm mt-1">{dept.description}</p>
              </div>
              <VapiWebCall
                assistantId={ASSISTANT_ID}
                label={`Start Demo`}
                className="shrink-0"
              />
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="max-w-2xl w-full mt-10 p-5 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-start gap-3">
            <Mic className="h-5 w-5 text-[#0066FF] shrink-0 mt-0.5" />
            <div className="text-sm text-white/60 space-y-1">
              <p className="text-white/80 font-medium">How it works</p>
              <p>1. Click <strong className="text-white">Start Demo</strong> — your browser will ask for microphone access.</p>
              <p>2. Speak naturally in English or Urdu.</p>
              <p>3. The AI will respond in real-time and can schedule appointments.</p>
              <p>4. Click <strong className="text-white">End</strong> when finished.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center text-white/30 text-xs py-6">
        Powered by Developers of Chicago · Vapi AI
      </footer>
    </div>
  );
}
