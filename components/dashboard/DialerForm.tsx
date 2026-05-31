"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff } from "lucide-react";

export function DialerForm() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return toast.error("Phone number required");
    setLoading(true);
    try {
      const res = await fetch("/api/vapi/dialer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone, callerName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start call");
      toast.success(`Call started (Vapi ID ${data.call.id})`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-1">
        <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
        <div className="flex items-center">
          <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
          <Input id="phone" placeholder="+92xxxxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} required />
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">Caller Name (optional)</label>
        <Input id="name" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <Button type="submit" disabled={loading} className="mt-6 md:col-span-2">
        {loading ? (
          <>
            <PhoneOff className="mr-2 h-4 w-4 animate-spin" /> Initiating…
          </>
        ) : (
          "Start Call"
        )}
      </Button>
    </form>
  );
}
