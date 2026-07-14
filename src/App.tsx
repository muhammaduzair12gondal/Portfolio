import { useState, useEffect, useRef } from 'react';
import { askLeo } from './services/ai';

// Colors & styles for mascot
const SKIN = '#F5C5A3';
const SKIN_SHADOW = '#E8A87C';
const HAIR = '#2C1A0E';
const KIT_BLUE = '#74ACDF';
const KIT_DARK = '#1A3F7A';

// --- TYPEWRITER COMPONENT ---
function Typewriter() {
  const roles = [
    'Full-Stack Developer',
    'AI Integration Specialist',
    'React & Next.js Engineer',
    'Bug Fixer & Problem Solver',
  ];
  const [text, setText] = useState('');
  const [roleIndex, setRoleIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentRole = roles[roleIndex];
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      timer = setTimeout(() => {
        setText(currentRole.slice(0, charIndex + 1));
        setCharIndex((prev) => prev + 1);
      }, 80);

      if (charIndex === currentRole.length) {
        timer = setTimeout(() => setIsDeleting(true), 1800);
      }
    } else {
      timer = setTimeout(() => {
        setText(currentRole.slice(0, charIndex - 1));
        setCharIndex((prev) => prev - 1);
      }, 45);

      if (charIndex === 0) {
        setIsDeleting(false);
        setRoleIndex((prev) => (prev + 1) % roles.length);
      }
    }

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, roleIndex]);

  return (
    <>
      <span>{text}</span>
      <span className="type-cursor">|</span>
    </>
  );
}

// --- INTERACTIVE CANVAS SQUARES BACKGROUND ---
function SquaresBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let squares: Array<{
      x: number;
      y: number;
      opacity: number;
      targetOpacity: number;
      active: boolean;
    }> = [];
    const squareSize = 40;
    let cols = 0;
    let rows = 0;
    let mouse = { x: -1000, y: -1000, hoveredIndex: -1 };

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.ceil(canvas.width / squareSize);
      rows = Math.ceil(canvas.height / squareSize);
      squares = [];
      for (let i = 0; i < cols * rows; i++) {
        squares.push({
          x: (i % cols) * squareSize,
          y: Math.floor(i / cols) * squareSize,
          opacity: 0.0,
          targetOpacity: 0.0,
          active: false,
        });
      }
    }

    window.addEventListener('resize', resize);
    resize();

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;

      const col = Math.floor(mouse.x / squareSize);
      const row = Math.floor(mouse.y / squareSize);
      const index = row * cols + col;

      if (index >= 0 && index < squares.length) {
        squares[index].active = true;
        squares[index].targetOpacity = 0.8;
        mouse.hoveredIndex = index;
      }
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
      mouse.hoveredIndex = -1;
    };

    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    let animationId: number;
    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= cols; i++) {
        ctx.moveTo(i * squareSize, 0);
        ctx.lineTo(i * squareSize, canvas.height);
      }
      for (let j = 0; j <= rows; j++) {
        ctx.moveTo(0, j * squareSize);
        ctx.lineTo(canvas.width, j * squareSize);
      }
      ctx.stroke();

      // Draw Squares
      for (let i = 0; i < squares.length; i++) {
        const sq = squares[i];

        if (!sq.active && i !== mouse.hoveredIndex) sq.targetOpacity = 0.0;

        sq.opacity += (sq.targetOpacity - sq.opacity) * 0.05;
        if (sq.opacity < 0.01) sq.active = false;

        if (sq.opacity > 0) {
          ctx.fillStyle = `rgba(124, 92, 252, ${sq.opacity * 0.15})`;
          ctx.fillRect(sq.x, sq.y, squareSize, squareSize);
        }
      }

      animationId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (canvas) canvas.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="site-bg" aria-hidden="true">
      <canvas ref={canvasRef} id="rb-canvas" />
      <div className="site-vignette" />
    </div>
  );
}

// --- MAIN APPLICATION COMPONENT ---
export default function App() {
  const [navOpen, setNavOpen] = useState(false);

  // Mascot assistant state
  const [talking, setTalking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [waving, setWaving] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const [followCursor, setFollowCursor] = useState(false);
  const [assistantVisible, setAssistantVisible] = useState(true);

  // Speech and Chat
  const [chatMessage, setChatMessage] = useState("¡Hola! I'm Leo, Uzair's helper. Ask me about his projects or skills! ⚽");
  const [userInput, setUserInput] = useState('');
  const [mouthState, setMouthState] = useState(0); // cycles mouth shapes when talking

  // Mouse gaze coordinates
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  
  // Mascot follow positioning (spring motion)
  const [mascotPos, setMascotPos] = useState({ x: window.innerWidth - 260, y: window.innerHeight - 380 });
  const targetMascotPos = useRef({ x: window.innerWidth - 260, y: window.innerHeight - 380 });
  const mascotRef = useRef<HTMLDivElement | null>(null);

  // Refs for timers
  const blinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouthTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-blink setup
  useEffect(() => {
    const scheduleBlink = () => {
      const delay = 2500 + Math.random() * 2500;
      blinkTimer.current = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => setBlinking(false), 150);
        scheduleBlink();
      }, delay);
    };
    scheduleBlink();
    return () => {
      if (blinkTimer.current) clearTimeout(blinkTimer.current);
    };
  }, []);

  // Gaze tracking listener
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });

      // Update target mascot position if in follow mode
      if (followCursor) {
        // Place mascot slightly down-right of the cursor
        targetMascotPos.current = {
          x: e.clientX + 25,
          y: e.clientY + 20,
        };
      }
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [followCursor]);

  // Stop following cursor on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && followCursor) {
        setFollowCursor(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [followCursor]);

  // Spring animation loop for Mascot position and gaze tracking
  useEffect(() => {
    let animId: number;

    const updatePhysics = () => {
      // 1. Position follow transition
      if (followCursor) {
        setMascotPos((prev) => {
          const dx = targetMascotPos.current.x - prev.x;
          const dy = targetMascotPos.current.y - prev.y;
          // Apply bounds to keep mascot inside screen limits
          const nextX = Math.max(10, Math.min(window.innerWidth - 240, prev.x + dx * 0.08));
          const nextY = Math.max(10, Math.min(window.innerHeight - 360, prev.y + dy * 0.08));
          return { x: nextX, y: nextY };
        });
      } else {
        // Reset smoothly back to default floating corner position
        const defaultX = window.innerWidth - 260;
        const defaultY = window.innerHeight - 440;
        setMascotPos((prev) => {
          const dx = defaultX - prev.x;
          const dy = defaultY - prev.y;
          // If already very close, snap
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return { x: defaultX, y: defaultY };
          return { x: prev.x + dx * 0.1, y: prev.y + dy * 0.1 };
        });
      }

      // 2. Gaze calculations relative to mascot head center
      if (mascotRef.current) {
        const rect = mascotRef.current.getBoundingClientRect();
        // Head center roughly cx=110, cy=73 of SVG, which is center of the top half of the box
        const headX = rect.left + rect.width / 2;
        const headY = rect.top + rect.height * 0.3;

        const dx = mousePos.x - headX;
        const dy = mousePos.y - headY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 10) {
          const angle = Math.atan2(dy, dx);
          // Limit gaze movement radius to 5px
          const gazeRadius = Math.min(5, dist / 40);
          setEyeOffset({
            x: Math.cos(angle) * gazeRadius,
            y: Math.sin(angle) * gazeRadius,
          });
        } else {
          setEyeOffset({ x: 0, y: 0 });
        }
      }

      animId = requestAnimationFrame(updatePhysics);
    };

    updatePhysics();
    return () => cancelAnimationFrame(animId);
  }, [mousePos, followCursor]);

  // Handle mouth movement when talking
  useEffect(() => {
    if (talking) {
      mouthTimer.current = setInterval(() => {
        setMouthState((prev) => (prev + 1) % 3);
      }, 150);
    } else {
      if (mouthTimer.current) clearInterval(mouthTimer.current);
      setMouthState(0); // back to smile
    }

    return () => {
      if (mouthTimer.current) clearInterval(mouthTimer.current);
    };
  }, [talking]);

  // Scroll Reveal Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Helper to trigger voice
  const speakVoice = (text: string, onEnd?: () => void) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // Remove emojis from speech text
      let cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
      
      // Fix pronunciation of Uzair for TTS only (chat bubble still shows "Uzair")
      cleanText = cleanText.replace(/\bUzair's\b/gi, 'his');
      cleanText = cleanText.replace(/\bUzair\b/gi, 'he');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.pitch = 1.1; // More natural pitch
      utterance.rate = 1.0;
      
      // Try to find a better voice: Google UK Male, or a Spanish/Latin voice for Messi vibes
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = 
        voices.find(v => v.name.includes('Google UK English Male')) || 
        voices.find(v => v.lang === 'es-US' || v.lang === 'es-AR') || 
        voices.find(v => v.name.toLowerCase().includes('male') && v.lang.startsWith('en')) || 
        voices.find(v => v.lang.startsWith('es')) || 
        voices[0];
        
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onend = () => {
        if (onEnd) onEnd();
      };
      window.speechSynthesis.speak(utterance);
    } else {
      if (onEnd) setTimeout(onEnd, Math.max(3000, text.length * 70));
    }
  };

  // Mascot tap trigger
  const handleMascotTap = () => {
    if (talking || thinking) return;
    setWaving(true);
    setTalking(true);
    const msg = "¡Vamos! Need a Messi-grade full stack dev? Type your question in the box below! ⚽";
    setChatMessage(msg);
    speakVoice(msg, () => setTalking(false));
    setTimeout(() => setWaving(false), 900);
  };

  // Submit AI Question
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const query = userInput;
    setUserInput('');
    setThinking(true);
    setTalking(true);
    setChatMessage("Leo is thinking... dribbling through data... ⚽");

    // trigger subtle wave / body shake while thinking
    setWaving(true);
    setTimeout(() => setWaving(false), 600);

    const reply = await askLeo(query);

    setThinking(false);
    setChatMessage(reply);
    
    // Wave when delivering the punchline!
    setWaving(true);
    setTimeout(() => setWaving(false), 900);

    // Speak the response aloud and sync talking animation!
    speakVoice(reply, () => setTalking(false));
  };

  return (
    <div className="relative min-h-screen text-slate-100 selection:bg-indigo-600 selection:text-white">
      {/* Site Canvas Grid */}
      <SquaresBackground />

      {/* --- NAV --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 py-4 backdrop-blur-xl border-b border-white/5 bg-slate-950/60">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <a href="#hero" className="font-display text-xl font-extrabold tracking-tight text-white">
            uzair<span className="text-violet-500">.</span>dev
          </a>

          {/* Desktop links */}
          <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0">
            <li>
              <a href="#about" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                About
              </a>
            </li>
            <li>
              <a href="#skills" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                Skills
              </a>
            </li>
            <li>
              <a href="#projects" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                Projects
              </a>
            </li>
            <li>
              <a
                href="#contact"
                className="text-xs font-semibold px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-md transition-colors"
              >
                Hire Me
              </a>
            </li>
          </ul>

          {/* Mobile hamburger */}
          <button
            onClick={() => setNavOpen(!navOpen)}
            className="md:hidden flex flex-col gap-1.5 p-2 bg-transparent border-none cursor-pointer"
            aria-label="Menu"
          >
            <span className={`w-6 h-0.5 bg-white transition-transform ${navOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`w-6 h-0.5 bg-white transition-opacity ${navOpen ? 'opacity-0' : ''}`} />
            <span className={`w-6 h-0.5 bg-white transition-transform ${navOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>

        {/* Mobile dropdown */}
        {navOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-slate-950 border-b border-white/5 px-6 py-6 flex flex-col gap-4">
            <a
              href="#about"
              onClick={() => setNavOpen(false)}
              className="text-lg font-medium text-slate-400 hover:text-white"
            >
              About
            </a>
            <a
              href="#skills"
              onClick={() => setNavOpen(false)}
              className="text-lg font-medium text-slate-400 hover:text-white"
            >
              Skills
            </a>
            <a
              href="#projects"
              onClick={() => setNavOpen(false)}
              className="text-lg font-medium text-slate-400 hover:text-white"
            >
              Projects
            </a>
            <a
              href="#contact"
              onClick={() => setNavOpen(false)}
              className="text-center font-semibold py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-md"
            >
              Hire Me
            </a>
          </div>
        )}
      </nav>

      {/* --- HERO SECTION --- */}
      <section id="hero" className="min-h-screen flex items-center pt-24 pb-12 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 w-full grid md:grid-cols-2 gap-12 items-center relative z-10">
          {/* Left Text */}
          <div className="flex flex-col items-start text-left">
            <div className="hero-badge flex items-center gap-2 bg-violet-600/10 border border-violet-500/30 rounded-full px-4 py-1 text-xs font-mono text-violet-400 mb-6">
              <span className="dot w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_#8b5cf6] animate-pulse" />
              AVAILABLE FOR FREELANCE TRANSFER
            </div>
            <p className="text-slate-400 text-lg font-light mb-1">Hi I am</p>
            <h1 className="hero-name text-4xl sm:text-6xl font-extrabold tracking-tight mb-2 text-white font-display">
              Muhammad Uzair
            </h1>
            <h2 className="text-2xl sm:text-3xl font-bold text-orange-500 mb-6 font-display min-h-[40px]">
              <Typewriter />
            </h2>

            {/* Social profiles row */}
            <div className="flex gap-4 mb-6">
              <a
                href="https://github.com/muhammaduzair12gondal"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-orange-500 hover:border-orange-500 transition-colors"
                aria-label="GitHub"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/in/muhammad-uzair-437b452b0/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-orange-500 hover:border-orange-500 transition-colors"
                aria-label="LinkedIn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>

            <p className="text-slate-400 text-base md:text-lg mb-8 leading-relaxed max-w-xl">
              Full-stack developer & AI integration specialist. I build fast, modern web applications — from
              high-converting landing pages to intelligent, AI-powered platforms — using React, Next.js, Node.js &
              Python.
            </p>

            <div className="flex gap-4 mb-10">
              <a href="#projects" className="btn-primary" style={{ background: '#ff6b00', boxShadow: '0 0 20px rgba(255, 107, 0, 0.4)' }}>
                View My Work
              </a>
              <a href="#contact" className="btn-secondary">
                Get In Touch
              </a>
            </div>

            {/* Experience Box */}
            <div className="flex gap-8 bg-white/3 border border-white/5 rounded-xl px-8 py-5 justify-between w-full max-w-lg">
              <div>
                <strong className="text-orange-500 text-2xl block mb-1">10+</strong>
                <span className="text-xs text-slate-400 font-medium">Apps Deployed</span>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <strong className="text-orange-500 text-2xl block mb-1">3+</strong>
                <span className="text-xs text-slate-400 font-medium">AI Models</span>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <strong className="text-orange-500 text-2xl block mb-1">5+</strong>
                <span className="text-xs text-slate-400 font-medium">Frameworks</span>
              </div>
            </div>
          </div>

          {/* Right Visual Image */}
          <div className="hero-visual justify-center">
            <div className="hero-visual-circle">
              <img className="hero-visual-image mix-blend-lighten" src="/new_transparent_image.jpg" alt="Muhammad Uzair" />
            </div>
          </div>
        </div>

        <div className="hero-scroll">
          <div className="scroll-line" />
          <span>scroll</span>
        </div>
      </section>

      {/* --- ABOUT SECTION --- */}
      <section id="about" className="border-t border-white/5 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="about-grid">
            {/* Glass Terminal Left */}
            <div className="about-visual reveal-left relative flex justify-center py-8">
              <div className="absolute w-[250px] h-[250px] bg-violet-600/30 rounded-full filter blur-[60px] top-10 right-10 animate-pulse" />
              <div className="absolute w-[200px] h-[200px] bg-cyan-600/25 rounded-full filter blur-[50px] bottom-10 left-0 animate-pulse" />

              <div className="glass-terminal relative z-10 w-full max-w-md">
                <div className="flex gap-2 p-4 border-b border-white/5 bg-white/2 rounded-t-xl">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-[0_0_8px_#ff5f56]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-[0_0_8px_#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f] shadow-[0_0_8px_#27c93f]" />
                  <div className="ml-auto font-mono text-[10px] text-slate-600 uppercase tracking-widest">
                    Uzair.ts
                  </div>
                </div>
                <div className="p-6 font-mono text-sm leading-relaxed text-slate-400 text-left">
                  <p className="mb-2">
                    <span className="text-[#ff7b72]">const</span> <span className="text-[#79c0ff]">developer</span>{' '}
                    <span className="text-[#ff7b72]">=</span> {'{'}
                  </p>
                  <p className="mb-2 pl-6">
                    <span className="text-[#d2a8ff]">name</span>: <span className="text-[#a5d6ff]">'Muhammad Uzair'</span>,
                  </p>
                  <p className="mb-2 pl-6">
                    <span className="text-[#d2a8ff]">role</span>: <span className="text-[#a5d6ff]">'Full-Stack & AI Engineer'</span>,
                  </p>
                  <p className="mb-2 pl-6">
                    <span className="text-[#d2a8ff]">education</span>:{' '}
                    <span className="text-[#a5d6ff]">'FAST-NUCES (6th Sem)'</span>,
                  </p>
                  <p className="mb-2 pl-6">
                    <span className="text-[#d2a8ff]">passions</span>:{' '}
                    [<span className="text-[#a5d6ff]">'AI Integration'</span>,{' '}
                    <span className="text-[#a5d6ff]">'Scalable Architecture'</span>],
                  </p>
                  <p className="mb-2 pl-6">
                    <span className="text-[#d2a8ff]">status</span>:{' '}
                    <span className="text-[#7ee787]">'Available for freelance'</span>
                  </p>
                  <p className="mb-2">{'};'}</p>
                  <p className="mt-4 text-[#79c0ff] animate-pulse">&gt; developer.executePlan() _</p>
                </div>
              </div>
            </div>

            {/* Content Right */}
            <div className="reveal-right text-left">
              <span className="section-label">About me</span>
              <h2 className="section-title">
                Bridging AI with <br />
                <span className="accent bg-clip-text text-transparent [-webkit-text-stroke:1px_var(--accent)] font-display bg-none">
                  Scalable Architecture
                </span>
              </h2>
              <p className="text-slate-400 mb-5 text-base md:text-lg">
                I'm a Software Engineering student at <strong className="text-white">FAST-NUCES</strong> — one of
                Pakistan's top CS universities — with a profound passion for building products that are as intelligent
                as they are beautiful.
              </p>
              <p className="text-slate-400 mb-5 text-base md:text-lg">
                By pairing rigorous systems fundamentals with an{' '}
                <strong className="text-cyan-400">innovative builder's mindset</strong>, I specialize in bridging the
                gap between cutting-edge AI and seamless User Interfaces. Whether it's architecting a complex
                multi-agent pipeline or crafting pixel-perfect Next.js interactions, I bring a holistic understanding to
                the entire stack.
              </p>
              <p className="text-slate-400 mb-8 text-base md:text-lg">
                I am currently taking on freelance projects. Hiring me means securing{' '}
                <strong className="text-white">senior-level strategic thinking</strong> and execution at early-career
                rates, while I build my ultimate portfolio.
              </p>

              <div className="about-stats mt-10 gap-6">
                <div className="stat bg-violet-600/5 border border-violet-500/10 rounded-xl p-6 transition-transform hover:-translate-y-1">
                  <span className="stat-num text-3xl font-extrabold text-violet-500 shadow-[0_0_20px_rgba(124,92,252,0.4)]">
                    5+
                  </span>
                  <span className="stat-label text-xs text-slate-400 block mt-2">Production Projects</span>
                </div>
                <div className="stat bg-cyan-600/5 border border-cyan-500/10 rounded-xl p-6 transition-transform hover:-translate-y-1">
                  <span className="stat-num text-3xl font-extrabold text-cyan-400 shadow-[0_0_20px_rgba(0,212,255,0.4)]">
                    6th
                  </span>
                  <span className="stat-label text-xs text-slate-400 block mt-2">Semester @ FAST NUCES</span>
                </div>
                <div className="stat bg-orange-600/5 border border-orange-500/10 rounded-xl p-6 transition-transform hover:-translate-y-1">
                  <span className="stat-num text-3xl font-extrabold text-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.4)]">
                    100%
                  </span>
                  <span className="stat-label text-xs text-slate-400 block mt-2">AI Integration Focus</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SKILLS SECTION --- */}
      <section id="skills" className="vision-section border-t border-white/5 py-24">
        <div className="max-w-6xl mx-auto px-6 reveal">
          <div className="flex justify-center mb-2">
            <span className="section-label">Tech stack</span>
          </div>
          <h2 className="vision-title">
            What I <span>work with</span>
          </h2>
          <p className="vision-subtitle">Technologies and tools I use to build robust and scalable applications</p>

          {/* Rotating Orbit System */}
          <div className="vision-orbit mb-12">
            <div className="orbit-center">Σ</div>
            <div className="orbit-rings">
              <div className="orbit-ring">
                <div className="orbit-icon oi-1">Figma</div>
                <div className="orbit-icon oi-3">React</div>
              </div>
              <div className="orbit-ring">
                <div className="orbit-icon oi-6">Node</div>
                <div className="orbit-icon oi-2">JS</div>
                <div className="orbit-icon oi-7">Next</div>
              </div>
              <div className="orbit-ring">
                <div className="orbit-icon oi-4">C++</div>
                <div className="orbit-icon oi-5">AI</div>
              </div>
            </div>
          </div>

          {/* Tag Cloud */}
          <div className="mt-16 flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            <span className="tag text-sm px-4 py-2">React.js</span>
            <span className="tag text-sm px-4 py-2">Next.js</span>
            <span className="tag text-sm px-4 py-2">Node.js</span>
            <span className="tag text-sm px-4 py-2">Oracle Database</span>
            <span className="tag text-sm px-4 py-2">Flask</span>
            <span className="tag text-sm px-4 py-2">FastAPI</span>
            <span className="tag cyan text-sm px-4 py-2">Deep Learning</span>
            <span className="tag cyan text-sm px-4 py-2">Natural Language Processing (NLP)</span>
            <span className="tag cyan text-sm px-4 py-2">Machine Learning</span>
            <span className="tag cyan text-sm px-4 py-2">Scikit-Learn</span>
            <span className="tag cyan text-sm px-4 py-2">TensorFlow</span>
            <span className="tag cyan text-sm px-4 py-2">PyTorch</span>
            <span className="tag text-sm px-4 py-2">Full-Stack Development</span>
            <span className="tag text-sm px-4 py-2">SDLC</span>
            <span className="tag text-sm px-4 py-2">Requirements Analysis</span>
            <span className="tag text-sm px-4 py-2">CSS / Tailwind</span>
            <span className="tag text-sm px-4 py-2">HTML</span>
            <span className="tag text-sm px-4 py-2">JavaScript</span>
            <span className="tag text-sm px-4 py-2">Selenium</span>
            <span className="tag text-sm px-4 py-2">Problem Solver</span>
          </div>

          {/* Arsenal Cards */}
          <div className="flex justify-center mt-24 mb-2">
            <span className="section-label">Tools</span>
          </div>
          <h2 className="vision-title mb-12">
            My <span>Arsenal</span>
          </h2>

          <div className="skills-grid text-left">
            <div className="skill-card">
              <div className="skill-icon">🛠️</div>
              <h3>Development Tools</h3>
              <div className="skill-tags">
                <span className="tag">VS Code</span>
                <span className="tag">Visual Studio</span>
                <span className="tag">Git</span>
                <span className="tag">GitHub</span>
                <span className="tag">Postman</span>
              </div>
            </div>
            <div className="skill-card">
              <div className="skill-icon">🗄️</div>
              <h3>Databases</h3>
              <div className="skill-tags">
                <span className="tag cyan">MySQL</span>
                <span className="tag cyan">SQLite</span>
                <span className="tag cyan">MongoDB</span>
              </div>
            </div>
            <div className="skill-card">
              <div className="skill-icon">📚</div>
              <h3>Frameworks / Libraries</h3>
              <div className="skill-tags">
                <span className="tag">Flask</span>
                <span className="tag">FastAPI</span>
                <span className="tag">Django</span>
                <span className="tag cyan">React</span>
                <span className="tag cyan">NumPy</span>
                <span className="tag cyan">Pandas</span>
                <span className="tag cyan">Scikit-Learn</span>
                <span className="tag cyan">PyTorch</span>
                <span className="tag">Selenium</span>
              </div>
            </div>
            <div className="skill-card">
              <div className="skill-icon">🎨</div>
              <h3>Design / Collab</h3>
              <div className="skill-tags">
                <span className="tag">Figma</span>
                <span className="tag">Microsoft Visio</span>
                <span className="tag cyan">Trello</span>
                <span className="tag cyan">Jira</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- PROJECTS SECTION --- */}
      <section id="projects" className="border-t border-white/5 py-24 text-left">
        <div className="max-w-6xl mx-auto px-6">
          <span className="section-label mb-2">My Work</span>
          <h2 className="section-title">Featured Projects</h2>

          <div className="zigzag-projects mt-12">
            {/* Project 1: Ripple */}
            <div className="zz-project reveal">
              <div className="zz-info">
                <span className="zz-label">Featured Project</span>
                <h3 className="zz-title">Ripple — Decision Physics Engine</h3>
                <div className="zz-glass-box">
                  <p className="mb-4 text-sm leading-relaxed text-slate-300">
                    A multi-engine AI simulation platform that lets founders, strategists, and product teams see the
                    consequences of a decision before making it. By combining synthetic agent simulation with causal chain
                    propagation and cross-domain historical validation, it predicts not just what should happen — but what
                    humans will actually do.
                  </p>
                  <ul className="list-none mb-6 text-xs p-0 text-slate-400 leading-loose">
                    <li className="mb-2">
                      🔹 <strong>Synthetic Population Engine:</strong> Psychologically coherent AI agents with 15 attributes, social proof dynamics, and zero-clone validation.
                    </li>
                    <li className="mb-2">
                      🔹 <strong>Causal Chain Propagation:</strong> Multi-level consequence graphs with confidence scoring and fourth-order effect detection.
                    </li>
                    <li className="mb-2">
                      🔹 <strong>Isomorphism Layer:</strong> Cross-domain historical matching grounding predictions in structurally identical real-world cases.
                    </li>
                    <li className="mb-2">
                      🔹 <strong>Infrastructure:</strong> Dual-provider AI routing with Groq (SPE) and NVIDIA NIM (CCPE + IVL), Next.js 14, pgvector.
                    </li>
                  </ul>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="https://ripple-lake-two.vercel.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="zz-link text-xs inline-flex items-center gap-1.5 px-4 py-2 rounded-md font-medium text-white decoration-none"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      View Live Deployment
                    </a>
                    <a
                      href="https://www.linkedin.com/in/muhammad-uzair-437b452b0/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="zz-link text-xs inline-flex items-center gap-1.5 px-4 py-2 rounded-md font-medium text-white decoration-none"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                      LinkedIn Post
                    </a>
                  </div>
                </div>
              </div>
              <div className="zz-visual">
                <img src="/ripple.png" alt="Ripple — Decision Physics Engine" />
              </div>
            </div>

            {/* Project 2: AquaYield */}
            <div className="zz-project reverse reveal">
              <div className="zz-info">
                <span className="zz-label">Featured Project</span>
                <h3 className="zz-title">AquaYield - Irrigation Intelligence</h3>
                <div className="zz-glass-box">
                  <p className="mb-4 text-sm leading-relaxed text-slate-300">
                    An AI-powered Smart Irrigation Intelligence Platform designed specifically for smallholder farmers to
                    take the guesswork out of farming. By blending live meteorological data with machine learning, it helps
                    compute exactly how much water crops need down to the millimeter—saving water resources and maximizing
                    yield.
                  </p>
                  <ul className="list-none mb-6 text-xs p-0 text-slate-400 leading-loose">
                    <li className="mb-2">
                      🔹 <strong>Backend:</strong> Python FastAPI architecture deployed on Render.
                    </li>
                    <li className="mb-2">
                      🔹 <strong>Machine Learning:</strong> RandomForestRegressor evapotranspiration prediction via scikit-learn.
                    </li>
                    <li className="mb-2">
                      🔹 <strong>Frontend:</strong> Next.js 14 deployed on Vercel.
                    </li>
                    <li className="mb-2">
                      🔹 <strong>Vision:</strong> Hugging Face Inference API for live crop classification.
                    </li>
                    <li className="mb-2">
                      🔹 <strong>Inclusivity:</strong> Full RTL localization with Urdu/Nastaliq font support.
                    </li>
                  </ul>
                  <a
                    href="https://aqua-yield-xi.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="zz-link text-xs inline-flex items-center gap-1.5 px-4 py-2 rounded-md font-medium text-white decoration-none"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    View Live Deployment
                  </a>
                </div>
              </div>
              <div className="zz-visual">
                <img src="/2.PNG" alt="AquaYield Platform UI" />
              </div>
            </div>

            {/* Project 3: Review Intelligence */}
            <div className="zz-project reveal">
              <div className="zz-info">
                <span className="zz-label">NLP Platform</span>
                <h3 className="zz-title">Customer Review Intelligence</h3>
                <div className="zz-glass-box">
                  <p className="mb-4 text-sm leading-relaxed text-slate-300">
                    Basic AI struggles with mixed reviews, so I built an NLP pipeline that reads feedback like a
                    human—separating emotions, flagging bots, and clustering insights into actionable themes.
                  </p>
                  <ul className="list-none mb-6 text-xs p-0 text-slate-400 leading-loose">
                    <li className="mb-2">
                      🔹 <strong>Aspect-Based Sentiment:</strong> ABSA scores features ("Quality" vs. "Late Delivery") independently.
                    </li>
                    <li className="mb-2">
                      🔹 <strong>Fake Review Detection:</strong> XGBoost + Random Forest ensemble using behavioral heuristics to catch spam reviews.
                    </li>
                    <li className="mb-2">
                      🔹 <strong>Topic Modeling:</strong> BERTopic clusters customer feedback into themes like Shipping or Support.
                    </li>
                  </ul>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="https://customer-review-intelligence-h2k7drvfv.vercel.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="zz-link text-xs inline-flex items-center gap-1.5 px-4 py-2 rounded-md font-medium text-white decoration-none"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      View Live Deployment
                    </a>
                    <a
                      href="https://github.com/muhammaduzair12gondal/customer-review-intelligence"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="zz-link text-xs inline-flex items-center gap-1.5 px-4 py-2 rounded-md font-medium text-white decoration-none"
                    >
                      GitHub Repo
                    </a>
                  </div>
                </div>
              </div>
              <div className="zz-visual">
                <img src="/p1.PNG" alt="Customer Review Intelligence UI" />
              </div>
            </div>

            {/* Project 4: FootballAI */}
            <div className="zz-project reverse reveal">
              <div className="zz-info">
                <span className="zz-label">Full-Stack · Data Science</span>
                <h3 className="zz-title">FootballAI — Match Predictions</h3>
                <div className="zz-glass-box">
                  <p className="mb-4 text-sm leading-relaxed text-slate-300">
                    Full-stack football platform for live scores and match predictions, built with a data-science pipeline where
                    trained models power outcome forecasts—not just simple heuristics. Combines statistical modeling with
                    production APIs.
                  </p>
                  <ul className="list-none mb-6 text-xs p-0 text-slate-400 leading-loose">
                    <li className="mb-2">
                      🔹 <strong>Predictions:</strong> Custom ELO ratings, Poisson distributions, and calibration.
                    </li>
                    <li className="mb-2">
                      🔹 <strong>Real-time:</strong> Live match updates via Server-Sent Events (SSE) with Redis caching.
                    </li>
                    <li className="mb-2">
                      🔹 <strong>Stack:</strong> Node.js, Express, SQLite, and Vite frontend.
                    </li>
                  </ul>
                  <a
                    href="https://vantage-football-ai.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="zz-link text-xs inline-flex items-center gap-1.5 px-4 py-2 rounded-md font-medium text-white decoration-none"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    View Live Deployment
                  </a>
                </div>
              </div>
              <div className="zz-visual">
                <img src="/football.PNG" alt="FootballAI predictions UI" />
              </div>
            </div>

            {/* Project 5: Fiverr Gig Intelligence */}
            <div className="zz-project reveal">
              <div className="zz-info">
                <span className="zz-label">AI Agent Tool</span>
                <h3 className="zz-title">Fiverr Gig Intelligence Tool</h3>
                <div className="zz-glass-box">
                  <p className="text-sm leading-relaxed text-slate-300">
                    A web app that analyzes, scores, and optimizes Fiverr gig listings using multi-agent AI. Scrapes
                    competitor data from Google/DuckDuckGo, runs gig diagnostics, and generates SEO-optimized copy using
                    Gemini and Groq in parallel.
                  </p>
                </div>
              </div>
              <div className="zz-visual">
                <img
                  src="https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=1000&q=80"
                  alt="Fiverr Gig Tool"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- CONTACT SECTION --- */}
      <section id="contact" className="py-24 text-center">
        <div className="max-w-xl mx-auto px-6 reveal">
          <span className="section-label mb-2 justify-center">Contact</span>
          <h2 className="section-title text-center">Let's build something great</h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            I'm currently available for freelance projects. Whether it's a landing page, a bug fix, an AI chatbot, or a full product — let's talk.
          </p>
          <a
            href="mailto:muhammaduzairgondal10@gmail.com"
            className="contact-email hover:text-violet-500 transition-colors inline-flex items-center gap-2 mb-10 font-bold"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            muhammaduzairgondal10@gmail.com
          </a>

          <div className="social-links justify-center gap-4">
            <a
              href="https://github.com/muhammaduzair12gondal"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link"
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/muhammad-uzair-437b452b0/"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-6xl mx-auto px-6">
          <p>
            Designed & built by Muhammad Uzair &nbsp;•&nbsp; FAST-NUCES Software Engineering student &nbsp;•&nbsp;{' '}
            <span className="text-violet-500">2026</span>
          </p>
        </div>
      </footer>

      {/* ═════════════════════════════════════════════ */}
      {/* ═══════════ FLOATING AI MASCOT ═══════════ */}
      {/* ═════════════════════════════════════════════ */}
      {assistantVisible && (
        <div
          ref={mascotRef}
          style={{
            position: 'fixed',
            left: mascotPos.x,
            top: mascotPos.y,
            zIndex: 1000,
            transition: followCursor ? 'none' : 'left 0.4s ease, top 0.4s ease',
            pointerEvents: 'auto',
          }}
          className="flex flex-col items-center select-none"
        >
          {/* Speech Bubble */}
          <div
            style={{
              background: 'rgba(15, 12, 28, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1.5px solid rgba(124, 92, 252, 0.4)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5), inset 0 0 15px rgba(124, 92, 252, 0.1)',
            }}
            className={`rounded-2xl p-4 max-w-[270px] text-xs font-semibold text-slate-200 mb-4 transition-all duration-300 relative text-center leading-relaxed ${
              talking ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
            }`}
          >
            {chatMessage}
            <div
              style={{
                borderTopColor: 'rgba(124, 92, 252, 0.4)',
              }}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px]"
            />
          </div>

          {/* Prompt Input Form (Slides up when talking is false or when hovering) */}
          <form
            onSubmit={handleChatSubmit}
            style={{
              background: 'rgba(15, 12, 28, 0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
            className="flex items-center gap-1.5 p-1.5 rounded-full mb-3 w-[260px] border border-white/5"
          >
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Ask Leo a question..."
              className="bg-transparent border-none text-slate-200 text-xs px-3 py-1.5 outline-none flex-1 placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={thinking}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-full p-1.5 border-none cursor-pointer flex items-center justify-center transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>

          {/* Quick options panel (Follow mode toggle & hide) */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setFollowCursor(!followCursor)}
              style={{
                background: followCursor ? 'rgba(124, 92, 252, 0.25)' : 'rgba(255,255,255,0.05)',
                border: followCursor ? '1px solid rgba(124, 92, 252, 0.5)' : '1px solid rgba(255,255,255,0.1)',
              }}
              className="text-[9px] font-mono font-bold text-slate-300 rounded-full px-3 py-1 cursor-pointer transition-colors"
            >
              {followCursor ? '🟢 Following (ESC to stop)' : '⚪ Follow Cursor'}
            </button>
            <button
              onClick={() => setAssistantVisible(false)}
              className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-[9px] font-mono font-bold text-red-400 rounded-full px-3 py-1 cursor-pointer transition-colors"
            >
              Hide
            </button>
          </div>

          {/* Tap Hint */}
          <div
            className={`text-[9px] text-slate-400 font-mono tracking-wider uppercase mb-1.5 transition-opacity ${
              talking || thinking ? 'opacity-0' : 'opacity-100 animate-pulse'
            }`}
          >
            Tap me for assist!
          </div>

          {/* Mascot SVG Drawing */}
          <div
            onClick={handleMascotTap}
            style={{
              cursor: 'pointer',
              filter: 'drop-shadow(0 16px 32px rgba(0,0,0,0.35))',
              transform: waving ? 'rotate(-6deg) translateY(-8px)' : 'none',
              transition: 'transform 0.38s cubic-bezier(0.34,1.56,0.64,1)',
            }}
            className="w-[180px] h-[260px]"
          >
            <svg viewBox="0 0 220 320" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="argStripes" x="0" y="0" width="12" height="10" patternUnits="userSpaceOnUse">
                  <rect width="6" height="10" fill={KIT_BLUE} />
                  <rect x="6" width="6" height="10" fill="white" />
                </pattern>
                <radialGradient id="faceGrad" cx="45%" cy="38%" r="58%">
                  <stop offset="0%" stopColor="#FDDBB4" />
                  <stop offset="100%" stopColor="#EDAA78" />
                </radialGradient>
                <radialGradient id="ballGrad" cx="32%" cy="32%" r="60%">
                  <stop offset="0%" stopColor="white" />
                  <stop offset="100%" stopColor="#d8d8d8" />
                </radialGradient>
              </defs>

              {/* FOOTBALL */}
              <circle cx="152" cy="288" r="19" fill="url(#ballGrad)" stroke="#2a2a2a" strokeWidth="1.5" />
              <path d="M152 271 L158 275 L156 282 L148 282 L146 275Z" fill="#1a1a1a" />
              <path d="M163 280 L168 285 L165 292 L159 291 L157 284Z" fill="#1a1a1a" />
              <path d="M141 280 L143 284 L141 291 L135 292 L132 285Z" fill="#1a1a1a" />
              <path d="M157 292 L154 298 L148 299 L142 298 L139 292 L146 289 L152 291 L158 289Z" fill="#1a1a1a" />
              <ellipse cx="144" cy="279" rx="5" ry="3.5" fill="white" opacity="0.55" transform="rotate(-20,144,279)" />

              {/* RIGHT LEG */}
              <rect x="114" y="236" width="24" height="40" rx="7" fill={SKIN} />
              <rect x="113" y="257" width="25" height="22" rx="6" fill="white" />
              <rect x="113" y="257" width="25" height="5" fill={KIT_BLUE} rx="3" />
              <path d="M112 270 L112 280 Q112 286 118 287 L140 287 Q145 286 144 279 L136 273Z" fill="#111" />
              <rect x="121" y="272" width="16" height="4" rx="2" fill="#333" opacity="0.45" />

              {/* LEFT LEG */}
              <rect x="82" y="236" width="24" height="40" rx="7" fill={SKIN} />
              <rect x="82" y="257" width="25" height="22" rx="6" fill="white" />
              <rect x="82" y="257" width="25" height="5" fill={KIT_BLUE} rx="3" />
              <path d="M78 270 L84 273 L108 273 L108 280 Q108 286 102 287 L80 287 Q75 286 76 279Z" fill="#111" />
              <rect x="83" y="272" width="16" height="4" rx="2" fill="#333" opacity="0.45" />

              {/* SHORTS */}
              <rect x="64" y="198" width="92" height="42" rx="7" fill={KIT_DARK} />
              <line x1="110" y1="198" x2="110" y2="240" stroke="#0e2557" strokeWidth="1.5" />
              <rect x="64" y="198" width="5" height="42" rx="2" fill={KIT_BLUE} opacity="0.6" />
              <rect x="151" y="198" width="5" height="42" rx="2" fill={KIT_BLUE} opacity="0.6" />

              {/* LEFT ARM */}
              <g>
                <rect x="43" y="128" width="23" height="44" rx="11" fill={KIT_BLUE} transform="rotate(14,54,140)" />
                <rect x="43" y="128" width="23" height="44" rx="11" fill="none" stroke="#5a9bc7" strokeWidth="1.2" transform="rotate(14,54,140)" />
                <rect x="36" y="165" width="19" height="36" rx="9" fill={SKIN} transform="rotate(18,46,180)" />
                <ellipse cx="40" cy="204" rx="11" ry="10" fill={SKIN} />
                <ellipse cx="34" cy="201" rx="6" ry="4.5" fill={SKIN} transform="rotate(-25,34,201)" />
                <ellipse cx="31" cy="209" rx="6" ry="4.5" fill={SKIN} transform="rotate(-10,31,209)" />
                <ellipse cx="38" cy="214" rx="6" ry="4.5" fill={SKIN} />
                <ellipse cx="47" cy="212" rx="6" ry="4.5" fill={SKIN} transform="rotate(12,47,212)" />
              </g>

              {/* JERSEY BODY */}
              <rect x="62" y="120" width="96" height="86" rx="10" fill="url(#argStripes)" />
              <rect x="62" y="120" width="96" height="86" rx="10" fill="none" stroke="#5a9bc7" strokeWidth="1.5" />
              <path d="M90 120 L110 142 L130 120" fill="none" stroke="#5a9bc7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M92 120 L110 140 L128 120 L110 120Z" fill={KIT_BLUE} opacity="0.22" />
              <text
                x="110"
                y="178"
                textAnchor="middle"
                fill={KIT_DARK}
                fontSize="22"
                fontWeight="900"
                fontFamily="'Arial Black', Arial, sans-serif"
                letterSpacing="-1"
              >
                10
              </text>

              {/* RIGHT ARM (waves when waving is active) */}
              <g
                style={{
                  transformOrigin: '160px 128px',
                  transform: waving ? 'rotate(-78deg)' : 'rotate(-10deg)',
                  transition: 'transform 0.42s cubic-bezier(0.34,1.56,0.64,1)',
                }}
              >
                <rect x="154" y="128" width="23" height="44" rx="11" fill={KIT_BLUE} transform="rotate(-14,166,140)" />
                <rect x="154" y="128" width="23" height="44" rx="11" fill="none" stroke="#5a9bc7" strokeWidth="1.2" transform="rotate(-14,166,140)" />
                <rect x="162" y="165" width="19" height="36" rx="9" fill={SKIN} transform="rotate(-18,172,180)" />
                <ellipse cx="176" cy="204" rx="11" ry="10" fill={SKIN} />
                <ellipse cx="182" cy="201" rx="6" ry="4.5" fill={SKIN} transform="rotate(25,182,201)" />
                <ellipse cx="185" cy="209" rx="6" ry="4.5" fill={SKIN} transform="rotate(10,185,209)" />
                <ellipse cx="178" cy="214" rx="6" ry="4.5" fill={SKIN} />
                <ellipse cx="169" cy="212" rx="6" ry="4.5" fill={SKIN} transform="rotate(-12,169,212)" />
              </g>

              {/* NECK */}
              <rect x="96" y="112" width="28" height="18" rx="9" fill={SKIN} />

              {/* HEAD & EARS */}
              <ellipse cx="55" cy="78" rx="10" ry="12" fill={SKIN} />
              <ellipse cx="55" cy="78" rx="6" ry="7.5" fill={SKIN_SHADOW} opacity="0.6" />
              <ellipse cx="165" cy="78" rx="10" ry="12" fill={SKIN} />
              <ellipse cx="165" cy="78" rx="6" ry="7.5" fill={SKIN_SHADOW} opacity="0.6" />

              {/* Face */}
              <ellipse cx="110" cy="73" rx="57" ry="60" fill="url(#faceGrad)" />

              {/* HAIR */}
              <path
                d="
                  M 58 68
                  Q 55 40 70 24
                  Q 86 8 110 6
                  Q 136 4 152 18
                  Q 168 32 166 62
                  L 160 50
                  Q 148 20 110 16
                  Q 72 16 64 48
                  Z
                "
                fill={HAIR}
              />
              <path d="M 58 68 Q 53 76 55 90 Q 58 76 64 67 Z" fill={HAIR} />
              <path d="M 162 68 Q 167 76 165 90 Q 162 76 156 67 Z" fill={HAIR} />
              <path d="M 74 30 Q 80 50 90 54 Q 94 42 100 38 Q 90 27 80 28 Z" fill={HAIR} />
              <path d="M 96 28 Q 104 48 114 52 Q 118 42 126 38 Q 116 24 104 26 Z" fill={HAIR} />
              <path d="M 120 26 Q 130 46 140 50 Q 146 36 154 32 Q 140 18 126 22 Z" fill={HAIR} />
              <path d="M 90 16 Q 110 11 132 20 Q 110 13 90 16 Z" fill="#4a2c1a" opacity="0.55" />

              {/* EYEBROWS (react to thinking state) */}
              <g
                style={{
                  transform: thinking ? 'translateY(-2px) rotate(-3deg)' : 'none',
                  transformOrigin: '110px 58px',
                  transition: 'transform 0.25s ease',
                }}
              >
                <path d="M 83 58 Q 93 53 101 57" stroke={HAIR} strokeWidth="3.2" strokeLinecap="round" fill="none" />
                <path d="M 119 57 Q 127 53 137 58" stroke={HAIR} strokeWidth="3.2" strokeLinecap="round" fill="none" />
              </g>

              {/* EYES (Gaze tracks mouse) */}
              <g>
                {/* Whites */}
                <ellipse cx="91" cy="75" rx="12" ry="13" fill="white" />
                <ellipse cx="129" cy="75" rx="12" ry="13" fill="white" />

                {/* Irises (Shifted by eyeOffset) */}
                <ellipse cx={91 + eyeOffset.x} cy={76 + eyeOffset.y} rx="8" ry="9" fill="#5B3A1E" />
                <ellipse cx={129 + eyeOffset.x} cy={76 + eyeOffset.y} rx="8" ry="9" fill="#5B3A1E" />

                {/* Pupils */}
                <ellipse cx={91 + eyeOffset.x} cy={77 + eyeOffset.y} rx="5" ry="5.5" fill="#111" />
                <ellipse cx={129 + eyeOffset.x} cy={77 + eyeOffset.y} rx="5" ry="5.5" fill="#111" />

                {/* Pupil Highlights */}
                <circle cx={95 + eyeOffset.x * 0.8} cy={71 + eyeOffset.y * 0.8} r="3.2" fill="white" />
                <circle cx={133 + eyeOffset.x * 0.8} cy={71 + eyeOffset.y * 0.8} r="3.2" fill="white" />
                <circle cx={94 + eyeOffset.x} cy={80 + eyeOffset.y} r="1.3" fill="white" opacity="0.65" />
                <circle cx={132 + eyeOffset.x} cy={80 + eyeOffset.y} r="1.3" fill="white" opacity="0.65" />

                {/* Outlines */}
                <ellipse cx="91" cy="75" rx="12" ry="13" fill="none" stroke="#d4956a" strokeWidth="1.2" />
                <ellipse cx="129" cy="75" rx="12" ry="13" fill="none" stroke="#d4956a" strokeWidth="1.2" />
              </g>

              {/* BLINK EYELIDS */}
              {blinking && (
                <>
                  <ellipse cx="91" cy="75" rx="12" ry="13" fill={SKIN} />
                  <path d="M79 75 Q91 85 103 75" stroke="#d4956a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  <ellipse cx="129" cy="75" rx="12" ry="13" fill={SKIN} />
                  <path d="M117 75 Q129 85 141 75" stroke="#d4956a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </>
              )}

              {/* NOSE */}
              <path d="M107 89 Q110 95 113 89" stroke={SKIN_SHADOW} strokeWidth="1.8" fill="none" strokeLinecap="round" />
              <circle cx="107" cy="93" r="2.2" fill={SKIN_SHADOW} opacity="0.55" />
              <circle cx="113" cy="93" r="2.2" fill={SKIN_SHADOW} opacity="0.55" />

              {/* MOUTH (Cycles shapes while speaking) */}
              {talking && mouthState === 1 ? (
                // Wide Smile / Talk state 1
                <path d="M96 104 Q110 120 124 104 Z" fill="#c07050" stroke="#c07050" strokeWidth="1.5" strokeLinecap="round" />
              ) : talking && mouthState === 2 ? (
                // Round "O" / Talk state 2
                <circle cx="110" cy="107" r="7" fill="#c07050" stroke="#c07050" strokeWidth="1" />
              ) : (
                // Normal smile
                <g>
                  <path d="M97 104 Q110 117 123 104" stroke="#c07050" strokeWidth="2.8" fill="none" strokeLinecap="round" />
                  <path d="M100 106 Q110 114 120 106 Q110 111 100 106Z" fill="white" opacity="0.75" />
                </g>
              )}

              {/* BLUSH */}
              <ellipse cx="76" cy="92" rx="12" ry="7" fill="#f09898" opacity="0.32" />
              <ellipse cx="144" cy="92" rx="12" ry="7" fill="#f09898" opacity="0.32" />

              {/* Beard stubble shadow */}
              <path d="M96 106 Q110 120 124 106 Q124 120 110 122 Q96 120 96 106Z" fill="#7a5040" opacity="0.12" />
            </svg>
          </div>

          {/* Name Badge */}
          <div
            style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.3)',
              textShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }}
            className="mt-3.5 rounded-full px-6 py-2 text-white font-bold text-xs tracking-wider"
          >
            LEO · PORTFOLIO ASSISTANT
          </div>
        </div>
      )}

      {/* Floating Toggle button to bring assistant back if hidden */}
      {!assistantVisible && (
        <button
          onClick={() => {
            setAssistantVisible(true);
            setTalking(true);
            setChatMessage("¡Vamos! I'm back on the field. Ready to assist! ⚽");
            setTimeout(() => setTalking(false), 3000);
          }}
          className="fixed bottom-6 right-6 z-50 bg-violet-600 hover:bg-violet-500 border border-violet-500/30 text-white font-mono font-bold text-xs rounded-full px-4 py-2.5 shadow-lg flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <span>⚽ Show Leo Assistant</span>
        </button>
      )}
    </div>
  );
}
