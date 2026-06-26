"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { parseWhatsAppChat, buildGeminiPrompt } from "@/lib/parseChat";

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
        <defs>
          <style>{`
            @keyframes flow1 {
              0% { d: path("M-100,300 C200,100 400,500 600,200 S900,400 1100,300"); }
              50% { d: path("M-100,400 C150,200 350,600 650,250 S950,350 1100,450"); }
              100% { d: path("M-100,300 C200,100 400,500 600,200 S900,400 1100,300"); }
            }
            @keyframes flow2 {
              0% { d: path("M-100,600 C200,400 500,800 700,500 S950,650 1100,600"); }
              50% { d: path("M-100,500 C250,700 450,300 750,600 S1000,450 1100,500"); }
              100% { d: path("M-100,600 C200,400 500,800 700,500 S950,650 1100,600"); }
            }
            @keyframes flow3 {
              0% { d: path("M-100,150 C300,300 500,50 800,250 S1000,100 1100,200"); }
              50% { d: path("M-100,250 C250,50 550,350 750,150 S1050,300 1100,150"); }
              100% { d: path("M-100,150 C300,300 500,50 800,250 S1000,100 1100,200"); }
            }
            @keyframes flow4 {
              0% { d: path("M-100,800 C200,650 600,900 800,700 S1000,850 1100,800"); }
              50% { d: path("M-100,750 C300,900 550,650 850,800 S1050,700 1100,850"); }
              100% { d: path("M-100,800 C200,650 600,900 800,700 S1000,850 1100,800"); }
            }
          `}</style>
        </defs>
        <path fill="none" stroke="#25D366" strokeWidth="1.5" opacity="0.18"
          style={{ animation: "flow1 12s ease-in-out infinite" }}
          d="M-100,300 C200,100 400,500 600,200 S900,400 1100,300" />
        <path fill="none" stroke="#25D366" strokeWidth="1" opacity="0.12"
          style={{ animation: "flow2 16s ease-in-out infinite reverse" }}
          d="M-100,600 C200,400 500,800 700,500 S950,650 1100,600" />
        <path fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.06"
          style={{ animation: "flow3 20s ease-in-out infinite" }}
          d="M-100,150 C300,300 500,50 800,250 S1000,100 1100,200" />
        <path fill="none" stroke="#25D366" strokeWidth="1" opacity="0.10"
          style={{ animation: "flow4 14s ease-in-out infinite reverse" }}
          d="M-100,800 C200,650 600,900 800,700 S1000,850 1100,800" />
      </svg>
    </div>
  );
}

function Counter({ target, duration = 2000 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <span>{count.toLocaleString()}</span>;
}

function HourArc({ peakHour, hourCounts }) {
  const max = Math.max(...hourCounts);
  return (
    <div className="flex items-end gap-[2px] h-20 w-full max-w-sm mx-auto mt-6">
      {hourCounts.map((count, hour) => (
        <div key={hour} className="flex-1 rounded-sm transition-all duration-500"
          style={{
            height: `${Math.max(max > 0 ? (count / max) * 100 : 4, 4)}%`,
            backgroundColor: hour === peakHour ? "#25D366" : "#27272a",
            opacity: hour === peakHour ? 1 : 0.6,
          }} />
      ))}
    </div>
  );
}

function BarComparison({ people }) {
  const sorted = [...people].sort((a, b) => b.messageCount - a.messageCount);
  const max = Math.max(...sorted.map((p) => p.messageCount));
  return (
    <div className="flex flex-col gap-4 w-full max-w-sm mx-auto mt-6">
      {sorted.map((p, i) => (
        <div key={p.name}>
          <div className="flex justify-between text-base mb-1">
            <span className="text-zinc-300 truncate max-w-[180px]">{p.name}</span>
            <span className="text-white font-medium">{p.messageCount.toLocaleString()}</span>
          </div>
          <div className="h-[3px] bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${(p.messageCount / max) * 100}%`,
                backgroundColor: i === 0 ? "#25D366" : "#52525b",
                transitionDelay: `${i * 150}ms`,
              }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ card, active }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (active) {
      const t = setTimeout(() => setShow(true), 100);
      return () => clearTimeout(t);
    } else { setShow(false); }
  }, [active]);

  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-center px-8 transition-all duration-500 ${
      active && show ? "opacity-100 translate-y-0" : active ? "opacity-0 translate-y-6" : "opacity-0 translate-y-6 pointer-events-none"
    }`}>
      {/* Card label — slightly bigger */}
      <p className="text-xs uppercase tracking-[0.4em] text-zinc-500 mb-8">{card.label}</p>

      {/* Number card */}
      {card.type === "number" && (
        <>
          <h2 className="text-[96px] font-bold text-white leading-none tabular-nums mb-3">
            {active ? <Counter target={card.value} /> : "0"}
          </h2>
          {card.subtitle && <p className="text-zinc-400 text-lg">{card.subtitle}</p>}
          {card.supporting && (
            <div className="flex gap-8 mt-10">
              {card.supporting.map((s, i) => (
                <div key={i} className="text-center bg-zinc-900 rounded-xl px-5 py-4">
                  <p className="text-white text-2xl font-semibold">{s.value}</p>
                  <p className="text-zinc-500 text-sm mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Text card */}
      {card.type === "text" && (
        <>
          <h2 className="text-5xl font-bold text-white text-center leading-tight mb-4 max-w-lg">{card.value}</h2>
          {card.subtitle && <p className="text-zinc-400 text-lg mt-2">{card.subtitle}</p>}
          {card.detail && <p className="text-zinc-600 text-base mt-2">{card.detail}</p>}
        </>
      )}

      {/* Emoji card */}
      {card.type === "emoji" && (
        <div className="flex flex-col gap-4 w-full max-w-sm">
          {card.value.map((person, i) => (
            <div key={i} className="flex items-center justify-between bg-zinc-900 rounded-xl px-5 py-5">
              <div>
                <p className="text-zinc-400 text-sm uppercase tracking-widest mb-1">{person.name}</p>
                <p className="text-zinc-300 text-base">used {person.count} times</p>
              </div>
              <span className="text-6xl">{person.emoji}</span>
            </div>
          ))}
        </div>
      )}

      {/* Words card */}
      {card.type === "words" && (
        <div className="flex flex-col gap-5 w-full max-w-sm">
          {card.value.map((person, i) => (
            <div key={i} className="bg-zinc-900 rounded-xl p-5">
              <p className="text-zinc-400 text-sm uppercase tracking-widest mb-4">{person.name}</p>
              <div className="flex flex-wrap gap-2">
                {person.words.map((w, j) => (
                  <span key={j} className="px-4 py-2 rounded-full text-base border border-zinc-700"
                    style={{ color: "#ffffff", opacity: Math.max(1 - j * 0.12, 0.4) }}>
                    {w.word}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slang card */}
      {card.type === "slang" && (
        <div className="flex flex-col gap-5 w-full max-w-sm">
          {card.value.map((person, i) => (
            <div key={i} className="bg-zinc-900 rounded-xl p-5">
              <p className="text-zinc-400 text-sm uppercase tracking-widest mb-4">{person.name}</p>
              {person.slangs.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {person.slangs.map((s, j) => (
                    <span key={j} className="px-4 py-2 rounded-full text-base"
                      style={{ color: "#ffffff", backgroundColor: "#25D36618", border: "1px solid #25D36635" }}>
                      {s.word}
                      <span className="text-zinc-500 ml-2 text-sm">×{s.count}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-600 text-base">No slang detected</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bar chart card */}
      {card.type === "bars" && (
        <>
          <h2 className="text-4xl font-bold text-white mb-2">{card.hero}</h2>
          {card.subtitle && <p className="text-zinc-400 text-lg mb-2">{card.subtitle}</p>}
          <BarComparison people={card.value} />
        </>
      )}

      {/* Hour arc card */}
      {card.type === "hour" && (
        <>
          <h2 className="text-6xl font-bold text-white mb-2">{card.value}</h2>
          <p className="text-zinc-400 text-lg mb-1">{card.subtitle}</p>
          <HourArc peakHour={card.peakHour} hourCounts={card.hourCounts} />
          <p className="text-zinc-600 text-sm mt-3">activity by hour</p>
        </>
      )}

      {/* Longest message card */}
      {card.type === "longest" && (
        <div className="flex flex-col gap-4 w-full max-w-sm">
          {card.value.map((person, i) => (
            <div key={i} className="bg-zinc-900 rounded-xl p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-zinc-400 text-sm uppercase tracking-widest">{person.name}</p>
                <span className="text-[#25D366] text-base font-mono">{person.length} chars</span>
              </div>
              <p className="text-zinc-300 text-base leading-relaxed italic">"{person.preview}..."</p>
            </div>
          ))}
        </div>
      )}

      {/* Essays card */}
      {card.type === "essays" && (
        <div className="flex flex-col gap-4 w-full max-w-sm">
          {card.value.map((person, i) => (
            <div key={i} className="flex justify-between items-center bg-zinc-900 rounded-xl px-5 py-5">
              <p className="text-zinc-300 text-base truncate max-w-[180px]">{person.name}</p>
              <div className="text-right">
                <p className="text-white text-lg font-semibold">{person.avgLength} chars</p>
                <p className="text-zinc-500 text-sm">avg message length</p>
              </div>
            </div>
          ))}
          {card.subtitle && <p className="text-zinc-500 text-base text-center mt-2">{card.subtitle}</p>}
        </div>
      )}

      {/* Ghost mode card */}
      {card.type === "ghost" && (
        <div className="flex flex-col gap-4 w-full max-w-sm">
          {card.value.length > 0 ? card.value.map((person, i) => (
            <div key={i} className="flex justify-between items-center bg-zinc-900 rounded-xl px-5 py-5">
              <p className="text-zinc-300 text-base truncate max-w-[180px]">{person.name}</p>
              <div className="text-right">
                <p className="text-white text-lg font-semibold">
                  {person.avgResponseTime < 60
                    ? `${person.avgResponseTime}s`
                    : `${Math.round(person.avgResponseTime / 60)}m`}
                </p>
                <p className="text-zinc-500 text-sm">avg reply time</p>
              </div>
            </div>
          )) : (
            <p className="text-zinc-500 text-base text-center">Not enough data to calculate reply times</p>
          )}
          {card.subtitle && <p className="text-zinc-500 text-base text-center mt-2">{card.subtitle}</p>}
        </div>
      )}

      {/* Personality card */}
      {card.type === "personality" && (
        <div className="flex flex-col gap-5 w-full max-w-lg">
          {card.value.map((person, i) => (
            <div key={i} className="bg-zinc-900 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute inset-0 opacity-5"
                style={{ background: "linear-gradient(135deg, #25D366, transparent)" }} />
              <p className="text-zinc-500 text-sm uppercase tracking-widest mb-1">{person.name}</p>
              <p className="text-white text-2xl font-bold mb-2">{person.title}</p>
              <p className="text-zinc-300 text-base leading-relaxed">{person.summary}</p>
            </div>
          ))}
        </div>
      )}

      {/* Group vibe card */}
      {card.type === "vibe" && (
        <>
          <div className="w-px h-12 mb-8 mx-auto rounded-full" style={{ backgroundColor: "#25D366" }} />
          <h2 className="text-3xl font-bold text-white text-center leading-relaxed max-w-lg">{card.value}</h2>
          <p className="text-zinc-500 text-base mt-8 uppercase tracking-widest">group vibe</p>
        </>
      )}
    </div>
  );
}

function LoadingScreen() {
  const phases = [
    "reading your chat...",
    "counting the messages...",
    "detecting personalities...",
    "analyzing patterns...",
    "calculating who ghosts more...",
    "almost there...",
  ];
  const [phaseIndex, setPhaseIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setPhaseIndex((i) => (i + 1) % phases.length), 1200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border border-zinc-800" />
        <div className="absolute inset-0 rounded-full border-t border-[#25D366] animate-spin"
          style={{ animationDuration: "1s" }} />
        <div className="absolute inset-2 rounded-full border-t border-[#25D366] animate-spin opacity-40"
          style={{ animationDuration: "1.5s", animationDirection: "reverse" }} />
      </div>
      <p key={phaseIndex} className="text-zinc-300 text-base tracking-wide"
        style={{ animation: "fadeIn 0.5s ease" }}>
        {phases[phaseIndex]}
      </p>
      <p className="text-zinc-600 text-sm">your messages never leave this device</p>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

export default function Home() {
  const [phase, setPhase] = useState("upload");
  const [cards, setCards] = useState([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  function formatHour(hour) {
    if (hour === 0) return "12 AM";
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return "12 PM";
    return `${hour - 12} PM`;
  }

  const next = useCallback(() => setCurrentCard((c) => Math.min(c + 1, cards.length - 1)), [cards.length]);
  const prev = useCallback(() => setCurrentCard((c) => Math.max(c - 1, 0)), []);

  useEffect(() => {
    function handleKey(e) {
      if (phase !== "reveal") return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, next, prev]);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".txt")) {
      setError("Please upload a WhatsApp chat export (.txt file)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Please use a chat under 10MB.");
      return;
    }

    setPhase("loading");
    setError(null);

    try {
      const text = await file.text();
      const parsed = parseWhatsAppChat(text);

      if (parsed.totalMessages < 10) {
        setError("Not enough messages to analyze. Try a longer chat.");
        setPhase("upload");
        return;
      }

      const prompt = buildGeminiPrompt(parsed);
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Analysis failed");
      }

      const { data } = await response.json();
      const sortedPeople = [...parsed.people].sort((a, b) => b.messageCount - a.messageCount);

      const builtCards = [
        {
          label: "Your Chat in Numbers",
          type: "number",
          value: parsed.totalMessages,
          subtitle: "total messages",
          supporting: [
            { value: parsed.activeDays, label: "active days" },
            { value: `${parsed.longestStreak}d`, label: "longest streak" },
            { value: parsed.people.length, label: "people" },
          ],
        },
        {
          label: "The Talker",
          type: "bars",
          hero: sortedPeople[0]?.name,
          subtitle: `dominates with ${sortedPeople[0]?.messageCount.toLocaleString()} messages`,
          value: parsed.people,
        },
        {
          label: "Peak Hour",
          type: "hour",
          value: formatHour(parsed.peakHour),
          subtitle: "when this chat comes alive",
          peakHour: parsed.peakHour,
          hourCounts: parsed.hourCounts,
        },
        {
          label: "Busiest Day Ever",
          type: "text",
          value: parsed.peakDate?.date || "—",
          subtitle: `${parsed.peakDate?.count} messages in a single day`,
          detail: "that was a day.",
        },
        {
          label: "Signature Emoji",
          type: "emoji",
          value: sortedPeople
            .filter((p) => p.topEmoji.length > 0)
            .map((p) => ({
              name: p.name,
              emoji: p.topEmoji[0]?.emoji,
              count: p.topEmoji[0]?.count,
            })),
        },
        {
          label: "Favourite Words",
          type: "words",
          value: sortedPeople.map((p) => ({
            name: p.name,
            words: p.topWords,
          })),
        },
        {
          label: "Slang Report",
          type: "slang",
          value: sortedPeople.map((p) => ({
            name: p.name,
            slangs: p.topSlang,
          })),
        },
        {
          label: "Most Extra",
          type: "longest",
          value: [...parsed.people]
            .sort((a, b) => b.maxMessageLength - a.maxMessageLength)
            .slice(0, 2)
            .map((p) => ({
              name: p.name,
              length: p.maxMessageLength,
              preview: p.maxMessage,
            })),
        },
        {
          label: "Who Writes Essays",
          type: "essays",
          value: [...parsed.people]
            .sort((a, b) => b.avgMessageLength - a.avgMessageLength)
            .map((p) => ({
              name: p.name,
              avgLength: p.avgMessageLength,
            })),
          subtitle: "longer = more to say",
        },
        {
          label: "Ghost Mode",
          type: "ghost",
          value: [...parsed.people]
            .filter((p) => p.avgResponseTime !== null)
            .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
            .map((p) => ({
              name: p.name,
              avgResponseTime: p.avgResponseTime,
            })),
          subtitle: "higher = takes longer to reply",
        },
        {
          label: "Longest Streak",
          type: "number",
          value: parsed.longestStreak,
          subtitle: "consecutive days of chatting",
        },
        {
          label: "Personality Report",
          type: "personality",
          value: data.personalities,
        },
        {
          label: "Final Verdict",
          type: "vibe",
          value: data.groupVibe,
        },
      ];

      setCards(builtCards);
      setCurrentCard(0);
      setPhase("reveal");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setPhase("upload");
    }
  }

  function restart() {
    setPhase("upload");
    setCards([]);
    setCurrentCard(0);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center">
      <AnimatedBackground />

      {phase === "upload" && (
        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md w-full">
          <div className="w-px h-16 mb-10 mx-auto" style={{ backgroundColor: "#25D366" }} />
          <h1 className="text-4xl font-bold tracking-tight mb-3">WhatsApp Wrapped</h1>
          <p className="text-zinc-400 text-base leading-relaxed mb-6">
            Your chat. Dissected. No messages leave your device.
          </p>

          {/* Privacy note */}
          <div className="bg-zinc-900 rounded-xl px-5 py-5 mb-8 text-left w-full">
            <p className="text-zinc-400 text-xs uppercase tracking-widest mb-4">Privacy</p>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <span style={{ color: "#25D366" }} className="mt-[2px] text-base">—</span>
                <p className="text-zinc-400 text-sm leading-relaxed">Your chat is processed entirely in your browser. It never leaves your device.</p>
              </div>
              <div className="flex items-start gap-3">
                <span style={{ color: "#25D366" }} className="mt-[2px] text-base">—</span>
                <p className="text-zinc-400 text-sm leading-relaxed">We use no cookies, no databases, and store nothing.</p>
              </div>
              <div className="flex items-start gap-3">
                <span style={{ color: "#25D366" }} className="mt-[2px] text-base">—</span>
                <p className="text-zinc-400 text-sm leading-relaxed">Only anonymized statistics — not messages — are sent for AI analysis.</p>
              </div>
              <div className="flex items-start gap-3">
                <span style={{ color: "#25D366" }} className="mt-[2px] text-base">—</span>
                <p className="text-zinc-400 text-sm leading-relaxed">When you close this tab, everything is gone.</p>
              </div>
            </div>
          </div>

          <label className="cursor-pointer w-full">
            <div className="border border-zinc-800 rounded-xl px-6 py-10 hover:border-zinc-600 transition-all duration-300 group">
              <div className="w-px h-8 mx-auto mb-4 group-hover:h-12 transition-all duration-300"
                style={{ backgroundColor: "#25D366" }} />
              <p className="text-white text-base font-medium mb-2">Drop your chat export here</p>
              <p className="text-zinc-500 text-sm leading-relaxed">
                WhatsApp → Chat → ⋮ → More → Export Chat → Without Media
              </p>
            </div>
            <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={handleFile} />
          </label>
          {error && <p className="text-red-500 text-sm mt-5">{error}</p>}
        </div>
      )}

      {phase === "loading" && (
        <div className="relative z-10"><LoadingScreen /></div>
      )}

      {phase === "reveal" && (
        <div className="relative z-10 w-full h-screen flex flex-col">
          <div className="flex gap-[3px] px-8 pt-8">
            {cards.map((_, i) => (
              <div key={i} onClick={() => setCurrentCard(i)}
                className="h-[2px] flex-1 rounded-full cursor-pointer transition-all duration-500"
                style={{ backgroundColor: i <= currentCard ? "#25D366" : "#27272a" }} />
            ))}
          </div>
          <div className="flex justify-end px-8 pt-3">
            <span className="text-zinc-600 text-sm tabular-nums">{currentCard + 1} / {cards.length}</span>
          </div>
          <div className="relative flex-1">
            {cards.map((card, i) => (
              <StatCard key={i} card={card} active={i === currentCard} />
            ))}
          </div>
          <div className="flex items-center justify-between px-8 pb-10">
            <button onClick={prev} disabled={currentCard === 0}
              className="text-zinc-500 text-base hover:text-white transition-colors disabled:opacity-20 px-4 py-2">
              ← prev
            </button>
            <button onClick={restart} className="text-zinc-700 text-sm hover:text-zinc-400 transition-colors">
              start over
            </button>
            <button onClick={next} disabled={currentCard === cards.length - 1}
              className="text-zinc-500 text-base hover:text-white transition-colors disabled:opacity-20 px-4 py-2">
              next →
            </button>
          </div>
          <p className="text-center text-zinc-700 text-sm pb-4">use arrow keys to navigate</p>
        </div>
      )}
    </main>
  );
}
