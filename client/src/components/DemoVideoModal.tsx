import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface DemoVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Demo video chapters/highlights
const videoChapters = [
  { time: 0, title: "Introduction", description: "Welcome to ADELE" },
  { time: 15, title: "Creating a Project", description: "Start a new application project" },
  { time: 45, title: "Chat Interface", description: "Describe your app in natural language" },
  { time: 90, title: "Multi-Agent System", description: "Watch AI agents collaborate" },
  { time: 150, title: "Code Generation", description: "Real-time code generation" },
  { time: 210, title: "Live Preview", description: "See your app come to life" },
  { time: 270, title: "Deployment", description: "One-click deployment" },
  { time: 300, title: "Download & Export", description: "Get your complete codebase" },
];

export function DemoVideoModal({ isOpen, onClose }: DemoVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [activeChapter, setActiveChapter] = useState(0);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      // Auto-play when modal opens
      videoRef.current.play().catch(() => {
        // Autoplay blocked, user needs to click play
      });
    }
  }, [isOpen]);

  useEffect(() => {
    // Update active chapter based on current time
    for (let i = videoChapters.length - 1; i >= 0; i--) {
      if (currentTime >= videoChapters[i].time) {
        setActiveChapter(i);
        break;
      }
    }
  }, [currentTime]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const jumpToChapter = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      if (!isPlaying) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration);
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-black">
        <DialogHeader className="sr-only">
          <DialogTitle>ADELE Demo Video</DialogTitle>
          <DialogDescription>Watch how ADELE builds applications from natural language</DialogDescription>
        </DialogHeader>
        
        <div className="relative">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Video container */}
          <div 
            className="relative aspect-video bg-black"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => isPlaying && setShowControls(false)}
          >
            {/* Demo video placeholder - in production, this would be an actual video */}
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              poster="/demo-poster.jpg"
            >
              {/* In production, add actual video source */}
              <source src="/demo-video.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>

            {/* Placeholder overlay when no video */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-6 mx-auto">
                  <Play className="h-12 w-12 text-primary ml-1" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">ADELE Demo</h3>
                <p className="text-white/70 max-w-md">
                  Watch how ADELE's multi-agent AI system builds complete applications from natural language descriptions
                </p>
              </div>
            </div>

            {/* Video controls overlay */}
            <div 
              className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
                showControls ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Progress bar */}
              <div className="mb-4">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full"
                />
                <div className="flex justify-between text-xs text-white/70 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/20"
                    onClick={skipBackward}
                  >
                    <SkipBack className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/20 h-12 w-12"
                    onClick={togglePlay}
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6" />
                    ) : (
                      <Play className="h-6 w-6 ml-0.5" />
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/20"
                    onClick={skipForward}
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/20"
                    onClick={toggleMute}
                  >
                    {isMuted ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/70">
                    {videoChapters[activeChapter]?.title}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/20"
                    onClick={toggleFullscreen}
                  >
                    <Maximize className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Chapter navigation */}
          <div className="bg-zinc-900 p-4">
            <h4 className="text-sm font-medium text-white/70 mb-3">Chapters</h4>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {videoChapters.map((chapter, index) => (
                <button
                  key={index}
                  onClick={() => jumpToChapter(chapter.time)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-left transition-colors ${
                    activeChapter === index
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <p className="text-sm font-medium">{chapter.title}</p>
                  <p className="text-xs opacity-70">{formatTime(chapter.time)}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
