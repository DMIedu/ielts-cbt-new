// Lightweight helpers/components to replace shadcn/ui, lucide, framer-motion, and "cn"
const { useEffect, useMemo, useState } = React;
const cn = (...cls) => cls.filter(Boolean).join(" ");

// --- Minimal UI bits (Tailwind-styled) ---
function Button({ children, onClick, variant = "default", size = "md", className }) {
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    outline: "border border-gray-300 bg-white hover:bg-gray-50",
    ghost: "text-gray-700 hover:bg-gray-100"
  };
  const sizes = {
    sm: "px-2 py-1 text-sm",
    md: "px-3 py-2",
    lg: "px-4 py-2 text-lg"
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  );
}

function Card({ children, className }) {
  return <div className={cn("rounded-2xl border bg-white shadow-sm", className)}>{children}</div>;
}
function CardHeader({ children, className }) {
  return <div className={cn("px-4 pt-4", className)}>{children}</div>;
}
function CardTitle({ children, className }) {
  return <h3 className={cn("text-lg font-semibold", className)}>{children}</h3>;
}
function CardContent({ children, className }) {
  return <div className={cn("px-4 pb-4", className)}>{children}</div>;
}
function Progress({ value, className }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-gray-200", className)}>
      <div className="h-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
function Input(props) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
        props.className
      )}
    />
  );
}

// --- Original data/logic (trimmed to run without external libs) ---

const PASSAGE = `The development of test strategies in standardised English assessments has evolved over decades.

In the context of academic reading, candidates must quickly distinguish between facts, opinions, and author claims while negotiating unfamiliar terminology. Research suggests that learners who pre-scan headings and topic sentences can build a mental map of the passage and improve both speed and accuracy.

However, reading speed alone is not a reliable predictor of comprehension. Effective test-takers combine targeted skimming with selective close reading, and they annotate key transitions—contrast, cause-effect, concession—to track argument structure.

Finally, successful candidates actively paraphrase the question stem and locate synonyms in the passage, rather than hunting for identical words. This reduces the cognitive load created by distractors and allows for more reliable inference-making.`;

const QUESTIONS = [
  {
    id: "q1",
    type: "mcq",
    prompt: "According to the passage, what do strong readers do before detailed reading?",
    options: [
      "Memorise complex terminology",
      "Pre-scan headings and topic sentences",
      "Read the questions last",
      "Underline every sentence"
    ],
    answer: "Pre-scan headings and topic sentences",
  },
  {
    id: "q2",
    type: "tfn",
    prompt: "Reading speed is the best single predictor of comprehension.",
    options: ["True", "False", "Not Given"],
    answer: "False",
  },
  {
    id: "q3",
    type: "short",
    prompt: "Name one discourse feature candidates mark to track arguments (one word).",
    placeholder: "e.g., contrast",
    normalize: (s) => s.trim().toLowerCase(),
    answer: "contrast",
  },
  {
    id: "q4",
    type: "mcq",
    prompt: "What strategy reduces the cognitive load from distractors?",
    options: [
      "Searching for identical words",
      "Paraphrasing stems and locating synonyms",
      "Skipping challenging paragraphs",
      "Timing each paragraph strictly"
    ],
    answer: "Paraphrasing stems and locating synonyms",
  },
  {
    id: "q5",
    type: "tfn",
    prompt: "The passage recommends combining skimming with selective close reading.",
    options: ["True", "False", "Not Given"],
    answer: "True",
  },
];

const KEY = "ielts-reading-c20-demo-v1";
const DURATION_MIN = 60;

function loadState() {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}
function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}
function formatTime(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
function estimateBand(score, max) {
  const pct = score / max;
  if (pct >= 0.88) return 8.5;
  if (pct >= 0.80) return 8.0;
  if (pct >= 0.72) return 7.5;
  if (pct >= 0.64) return 7.0;
  if (pct >= 0.56) return 6.5;
  if (pct >= 0.48) return 6.0;
  if (pct >= 0.40) return 5.5;
  return 5.0;
}

// --- App ---
function IELTSReadingPractice() {
  const init = loadState() || {};
  const [answers, setAnswers] = useState(init.answers || {});
  const [secondsLeft, setSecondsLeft] = useState(init.secondsLeft ?? DURATION_MIN * 60);
  const [paused, setPaused] = useState(init.paused ?? false);
  const [stage, setStage] = useState(init.stage || "read"); // "read" | "questions" | "review"

  // autosave
  useEffect(() => {
    saveState({ answers, secondsLeft, paused, stage });
  }, [answers, secondsLeft, paused, stage]);

  // timer
  useEffect(() => {
    if (paused || stage === "review") return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [paused, stage]);

  useEffect(() => {
    if (secondsLeft === 0 && stage !== "review") {
      setStage("review");
      setPaused(true);
    }
  }, [secondsLeft, stage]);

  const total = QUESTIONS.length;
  const attempted = Object.keys(answers).filter((k) => answers[k] && answers[k].trim() !== "").length;
  const progress = Math.round((attempted / total) * 100);

  const memo = useMemo(() => {
    let s = 0;
    const r = QUESTIONS.map((q) => {
      const user = (answers[q.id] || "").toString();
      const normUser = q.normalize ? q.normalize(user) : user;
      const normAns = q.normalize ? q.normalize(q.answer) : q.answer;
      const correct = normUser === normAns;
      if (correct) s += 1;
      return { id: q.id, correct, expected: q.answer, user };
    });
    return { score: s, results: r };
  }, [answers]);

  const score = memo.score;
  const results = memo.results;
  const band = estimateBand(score, total);

  function setAnswer(id, value) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function resetAll() {
    setAnswers({});
    setSecondsLeft(DURATION_MIN * 60);
    setPaused(false);
    setStage("read");
    saveState({});
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              {/* book icon replacement */}
              <span className="text-xl">📘</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">IELTS Academic</p>
              <h1 className="text-lg font-semibold">Reading Practice – C20 style</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2">
              <span className="text-gray-600">⏱</span>
              <span className={cn("font-mono text-base", secondsLeft <= 300 && "text-red-600 font-semibold")}>
                {formatTime(secondsLeft)}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setPaused((p) => !p)} className="ml-2">
                {paused ? "Resume" : "Pause"}
              </Button>
            </div>
            <Button variant="secondary" onClick={resetAll} className="gap-2">↻ Reset</Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-12">
        {/* Sidebar */}
        <aside className="md:col-span-3">
          <Card className="sticky top-20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Course Outline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SyllabusItem title="Reading – Passage 1" active={stage === "read"} onClick={() => setStage("read")} />
              <SyllabusItem title="Questions 1–5" count={`${attempted}/${total}`} active={stage === "questions"} onClick={() => setStage("questions")} />
              <SyllabusItem title="Review & Score" active={stage === "review"} onClick={() => setStage("review")} />

              <div className="pt-3">
                <p className="mb-2 text-sm text-gray-600">Progress</p>
                <Progress value={progress} className="h-2" />
                <p className="mt-2 text-xs text-gray-500">{progress}% attempted</p>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Main area */}
        <main className="md:col-span-9 space-y-6">
          {stage === "read" && (
            <div className="animate-fade-in">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Passage 1</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 leading-7">
                  {PASSAGE.split("\n\n").map((p, i) => (
                    <p key={i} className="text-gray-800">{p}</p>
                  ))}

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <Button onClick={() => setStage("questions")} className="gap-2">
                      Go to Questions →
                    </Button>
                    <p className="text-sm text-gray-500">Tip: Skim headings, then scan for keywords.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {stage === "questions" && (
            <div className="space-y-4 animate-fade-in">
              {QUESTIONS.map((q, idx) => (
                <QuestionCard
                  key={q.id}
                  index={idx + 1}
                  question={q}
                  value={answers[q.id] || ""}
                  onChange={(v) => setAnswer(q.id, v)}
                />
              ))}

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setStage("read")} className="gap-2">← Back to Passage</Button>
                <Button onClick={() => setStage("review")} className="gap-2">
                  Submit & Review →
                </Button>
              </div>
            </div>
          )}

          {stage === "review" && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Your Results</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <ScoreTile label="Score" value={`${score}/${total}`} icon="✅" />
                  <ScoreTile label="Progress" value={`${progress}%`} icon="💾" />
                  <ScoreTile label="Estimated Band" value={`${band.toFixed(1)}`} icon="📘" />
                </CardContent>
              </Card>

              {results.map((r, i) => (
                <Card key={r.id} className={cn("border-l-4", r.correct ? "border-l-green-500" : "border-l-red-500") }>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-base">Q{i + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><span className="font-medium">Your answer:</span> {r.user || <em className="text-gray-500">No answer</em>}</p>
                    <p><span className="font-medium">Correct answer:</span> {r.expected}</p>
                    <div className="pt-1 text-xs text-gray-500">{r.correct ? "Well done." : "Review the relevant sentence in the passage and paraphrase the stem."}</div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setStage("questions")} className="gap-2">← Back to Questions</Button>
                <Button onClick={resetAll} variant="secondary" className="gap-2">↻ Try Another</Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// --- Subcomponents from your original UI, simplified ---
function SyllabusItem({ title, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition",
        active ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
      )}
    >
      <span className="text-sm font-medium">{title}</span>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {count && <span>{count}</span>}
        <span>{active ? "▾" : "▸"}</span>
      </div>
    </button>
  );
}

function QuestionCard({ index, question, value, onChange }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Question {index}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-800">{question.prompt}</p>

        {question.type === "mcq" && (
          <div className="grid gap-2">
            {question.options.map((opt) => (
              <label
                key={opt}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-3",
                  value === opt ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                )}
              >
                <input
                  type="radio"
                  name={question.id}
                  className="h-4 w-4"
                  checked={value === opt}
                  onChange={() => onChange(opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        )}

        {question.type === "tfn" && (
          <div className="flex flex-wrap gap-2">
            {question.options.map((opt) => (
              <Button key={opt} variant={value === opt ? "default" : "outline"} onClick={() => onChange(opt)}>
                {opt}
              </Button>
            ))}
          </div>
        )}

        {question.type === "short" && (
          <div className="max-w-md">
            <Input
              placeholder={question.placeholder || "Type your answer"}
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">Spelling matters. One word only.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreTile({ label, value, icon }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl">{icon}</div>
      <div>
        <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </div>
  );
}

// --- Small fade-in animation via Tailwind + keyframes ---
const style = document.createElement("style");
style.innerHTML = `
@keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in { animation: fade-in .25s ease-out; }
`;
document.head.appendChild(style);

// Mount
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<IELTSReadingPractice />);
