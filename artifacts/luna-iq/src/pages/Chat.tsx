import { AppHeader } from "@/components/AppHeader";
import { PageTransition } from "@/components/PageTransition";

export default function Chat() {
  return (
    <PageTransition className="flex flex-col h-screen max-h-[100dvh] overflow-hidden bg-white">
      <AppHeader 
        title="Luna Chat 🌙" 
        subtitle="Your wellness companion"
      />
      
      <main className="flex-1 w-full pb-20 relative">
        <iframe
          src="https://udify.app/chatbot/your-placeholder"
          style={{ width: "100%", height: "100%", border: "none" }}
          title="Luna AI Chatbot"
          className="absolute inset-0"
        />
        {/* Placeholder overlay since the iframe might not load or look right */}
        <div className="absolute inset-0 bg-luna-lavender/10 flex flex-col items-center justify-center p-8 text-center pointer-events-none backdrop-blur-[1px]">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md mb-6 animate-pulse">
            <span className="text-4xl">🌙</span>
          </div>
          <h2 className="text-xl font-medium text-purple-900 mb-2">Luna is here</h2>
          <p className="text-sm text-purple-700/70 max-w-[250px]">
            Your private, gentle space to talk through your thoughts and feelings.
          </p>
        </div>
      </main>
    </PageTransition>
  );
}
