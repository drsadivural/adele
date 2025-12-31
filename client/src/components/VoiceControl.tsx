import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Loader2,
  Sparkles,
  Globe,
  X
} from "lucide-react";
import { toast } from "sonner";
// Storage import removed - using Web Speech API for demo

interface VoiceControlProps {
  projectId: number;
  onCommand?: (action: { type: string; data?: unknown }) => void;
  language?: "en" | "ja";
}

export default function VoiceControl({ 
  projectId, 
  onCommand,
  language: initialLanguage = "en" 
}: VoiceControlProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [language, setLanguage] = useState<"en" | "ja">(initialLanguage);
  const [showPanel, setShowPanel] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const processCommand = trpc.voice.processCommand.useMutation({
    onSuccess: (result) => {
      setResponse(result.response);
      speakResponse(result.response);
      
      if (result.execution?.success && result.execution.data) {
        const data = result.execution.data as { action?: string; redirect?: string };
        if (onCommand) {
          onCommand({ type: data.action || "unknown", data });
        }
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to process command");
      setResponse(language === "ja" 
        ? "エラーが発生しました。もう一度お試しください。" 
        : "An error occurred. Please try again.");
    },
  });

  const { data: suggestions } = trpc.voice.getProactiveSuggestions.useQuery(
    { projectId, language },
    { enabled: showPanel }
  );

  // Start listening
  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
      setTranscript("");
      setResponse("");
      
      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          stopListening();
        }
      }, 10000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error("Failed to access microphone");
    }
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }, []);

  // Process recorded audio
  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // For demo purposes, use Web Speech API for transcription
      // In production, upload to S3 and use the server-side transcription
      const SpeechRecognitionAPI = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = SpeechRecognitionAPI ? new SpeechRecognitionAPI() : null;
      
      if (recognition) {
        recognition.lang = language === "ja" ? "ja-JP" : "en-US";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setTranscript(text);
          
          // Process the command
          processCommand.mutate({
            projectId,
            transcription: text,
            language,
          });
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          toast.error("Failed to recognize speech");
          setIsProcessing(false);
        };

        recognition.onend = () => {
          setIsProcessing(false);
        };

        // Create audio URL and play it back to trigger recognition
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.onended = () => URL.revokeObjectURL(audioUrl);
        
        // Start recognition
        recognition.start();
      } else {
        // Fallback: just show a message
        toast.info("Speech recognition not supported in this browser");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      toast.error("Failed to process audio");
      setIsProcessing(false);
    }
  };

  // Speak response using Web Speech API
  const speakResponse = (text: string) => {
    if (!text || !window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "ja" ? "ja-JP" : "en-US";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Stop speaking
  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Toggle language
  const toggleLanguage = () => {
    setLanguage(prev => prev === "en" ? "ja" : "en");
  };

  // Keyboard shortcut for voice control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space + Ctrl to toggle voice
      if (e.code === "Space" && e.ctrlKey) {
        e.preventDefault();
        if (isListening) {
          stopListening();
        } else {
          startListening();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isListening, startListening, stopListening]);

  return (
    <>
      {/* Floating Voice Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <Button
          size="lg"
          className={`rounded-full w-14 h-14 shadow-lg ${
            isListening 
              ? "bg-red-500 hover:bg-red-600 animate-pulse" 
              : "gradient-bg hover:opacity-90"
          }`}
          onClick={() => {
            if (isListening) {
              stopListening();
            } else {
              setShowPanel(true);
              startListening();
            }
          }}
        >
          {isListening ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </Button>
      </motion.div>

      {/* Voice Control Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-24 right-6 z-50 w-80"
          >
            <Card className="glass-card p-4 shadow-apple-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Voice Control</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleLanguage}
                    className="h-8 px-2"
                  >
                    <Globe className="w-4 h-4 mr-1" />
                    {language.toUpperCase()}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPanel(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 mb-4">
                {isListening && (
                  <Badge variant="destructive" className="animate-pulse">
                    <Mic className="w-3 h-3 mr-1" />
                    Listening...
                  </Badge>
                )}
                {isProcessing && (
                  <Badge variant="secondary">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Processing...
                  </Badge>
                )}
                {isSpeaking && (
                  <Badge variant="default" className="bg-green-500">
                    <Volume2 className="w-3 h-3 mr-1" />
                    Speaking
                    <button 
                      onClick={stopSpeaking}
                      className="ml-1 hover:text-red-200"
                    >
                      <VolumeX className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
              </div>

              {/* Transcript */}
              {transcript && (
                <div className="mb-4 p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">You said:</p>
                  <p className="text-sm">{transcript}</p>
                </div>
              )}

              {/* Response */}
              {response && (
                <div className="mb-4 p-3 rounded-lg bg-primary/10">
                  <p className="text-xs text-primary mb-1">ADELE:</p>
                  <p className="text-sm">{response}</p>
                </div>
              )}

              {/* Suggestions */}
              {suggestions && suggestions.length > 0 && !transcript && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Try saying:</p>
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="text-xs p-2 rounded bg-muted/30 text-muted-foreground"
                    >
                      "{suggestion}"
                    </div>
                  ))}
                </div>
              )}

              {/* Keyboard shortcut hint */}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  Press <kbd className="px-1 py-0.5 rounded bg-muted text-xs">Ctrl</kbd> + <kbd className="px-1 py-0.5 rounded bg-muted text-xs">Space</kbd> to toggle voice
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
