import { useState, useRef, useCallback } from "react";

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
  .wrap { font-family: 'DM Sans', sans-serif; background: #0e0f11; color: #e8eaf0; min-height: 100vh; padding: 24px 20px; font-size: 14px; border-radius: 12px; }
  h1 { font-size: 18px; font-weight: 600; letter-spacing: -.3px; margin-bottom: 4px; }
  .sub { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
  .steps { display: flex; margin-bottom: 28px; border: 1px solid #2a2d35; border-radius: 10px; overflow: hidden; }
  .step { flex: 1; padding: 10px 8px; font-size: 11px; font-weight: 500; color: #6b7280; background: #16181c; text-align: center; border-right: 1px solid #2a2d35; transition: all .3s; font-family: 'DM Mono', monospace; }
  .step:last-child { border-right: none; }
  .step.active { background: #1e2127; color: #6ee7b7; border-bottom: 2px solid #6ee7b7; }
  .step.done { color: #6ee7b7; opacity: .6; }
  .drop-zone { border: 1.5px dashed #2a2d35; border-radius: 10px; padding: 32px 24px; text-align: center; cursor: pointer; transition: all .2s; background: #16181c; position: relative; }
  .drop-zone.drag, .drop-zone:hover { border-color: #6ee7b7; background: rgba(110,231,183,.04); }
  .drop-zone input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
  .drop-icon { font-size: 28px; margin-bottom: 10px; display: block; color: #6b7280; }
  .drop-label { font-size: 13px; color: #6b7280; }
  .drop-label strong { color: #e8eaf0; }
  .file-badge { display: inline-flex; align-items: center; gap: 8px; background: #1e2127; border: 1px solid #2a2d35; border-radius: 6px; padding: 8px 12px; margin-top: 12px; font-size: 12px; font-family: 'DM Mono', monospace; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: #6ee7b7; flex-shrink: 0; }
  .field { margin: 16px 0; }
  .field label { display: block; font-size: 11px; color: #6b7280; font-family: 'DM Mono', monospace; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .5px; }
  .field input { width: 100%; background: #16181c; border: 1px solid #2a2d35; border-radius: 6px; padding: 9px 12px; color: #e8eaf0; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color .2s; }
  .field input:focus { border-color: #a78bfa; }
  .btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; border-radius: 10px; border: none; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: all .2s; margin-top: 8px; }
  .btn-primary { background: #6ee7b7; color: #0a1a12; }
  .btn-primary:hover:not(:disabled) { background: #4ade80; transform: translateY(-1px); }
  .btn-primary:disabled { opacity: .4; cursor: not-allowed; transform: none; }
  .btn-secondary { background: #1e2127; color: #e8eaf0; border: 1px solid #2a2d35; }
  .btn-secondary:hover:not(:disabled) { border-color: #a78bfa; color: #a78bfa; }
  .progress-box { background: #16181c; border: 1px solid #2a2d35; border-radius: 10px; padding: 20px; margin-top: 16px; }
  .prog-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; font-size: 12px; color: #6b7280; }
  .prog-row.active { color: #e8eaf0; }
  .prog-row.done { color: #6ee7b7; }
  .prog-icon { width: 18px; text-align: center; flex-shrink: 0; font-size: 13px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner { width: 13px; height: 13px; border: 2px solid #2a2d35; border-top-color: #6ee7b7; border-radius: 50%; animation: spin .7s linear infinite; display: inline-block; }
  .meta-row { display: flex; gap: 8px; margin-top: 16px; margin-bottom: 4px; flex-wrap: wrap; }
  .meta-pill { font-family: 'DM Mono', monospace; font-size: 11px; padding: 4px 10px; border-radius: 999px; background: #1e2127; border: 1px solid #2a2d35; color: #e8eaf0; }
  .meta-pill.client { background: rgba(167,139,250,.15); color: #a78bfa; border-color: rgba(167,139,250,.3); }
  .meta-pill.internal { background: rgba(110,231,183,.15); color: #6ee7b7; border-color: rgba(110,231,183,.3); }
  .results { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
  .card { background: #16181c; border: 1px solid #2a2d35; border-radius: 10px; overflow: hidden; }
  .card-head { display: flex; align-items: center; gap: 8px; padding: 11px 14px; border-bottom: 1px solid #2a2d35; background: #1e2127; }
  .tag { font-family: 'DM Mono', monospace; font-size: 10px; padding: 2px 7px; border-radius: 4px; font-weight: 500; }
  .tag-slack { background: rgba(110,231,183,.15); color: #6ee7b7; }
  .tag-notion { background: rgba(167,139,250,.15); color: #a78bfa; }
  .tag-raw { background: rgba(251,191,36,.1); color: #fbbf24; }
  .card-title { font-size: 12px; font-weight: 500; color: #6b7280; }
  .card-body { padding: 14px; font-size: 13px; line-height: 1.65; color: #e8eaf0; }
  .card-body.mono { font-family: 'DM Mono', monospace; font-size: 11px; color: #6b7280; max-height: 140px; overflow-y: auto; line-height: 1.7; white-space: pre-wrap; }
  .point-row { padding: 8px 0; border-bottom: 1px solid #2a2d35; }
  .point-row:last-child { border-bottom: none; }
  .point-topic { font-weight: 600; color: #e8eaf0; margin-bottom: 2px; font-size: 13px; }
  .point-desc { color: #b0b3bd; font-size: 12px; line-height: 1.5; }
  .ai-row { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #2a2d35; }
  .ai-row:last-child { border-bottom: none; }
  .ai-person { font-family: 'DM Mono', monospace; font-size: 11px; padding: 2px 7px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; margin-top: 2px; }
  .ai-person.tagged { background: rgba(167,139,250,.15); color: #a78bfa; }
  .ai-person.team { background: rgba(110,231,183,.15); color: #6ee7b7; }
  .ai-task { font-size: 12px; line-height: 1.5; }
  .ai-deadline { font-size: 11px; color: #6b7280; margin-top: 2px; font-family: 'DM Mono', monospace; }
  .post-row { display: flex; gap: 8px; margin-top: 12px; }
  .post-row .btn { margin-top: 0; }
  .err { background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.3); border-radius: 10px; padding: 12px 14px; font-size: 12px; color: #f87171; margin-top: 12px; line-height: 1.5; }
  .empty { color: #6b7280; font-size: 12px; font-style: italic; }
`;

export default function MeetingAutomation() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [drag, setDrag] = useState(false);
  const [step, setStep] = useState(1);
  const [progStep, setProgStep] = useState(-1);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);
  const inputRef = useRef();

  const handleFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    setTitle(f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
    setStep(1);
    setError("");
    setResults(null);
  }, []);

  const onInputChange = (e) => handleFile(e.target.files[0]);
  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const run = async () => {
    if (!file) return;
    setError("");
    setResults(null);
    setStep(2);
    setProgStep(0);

    try {
      // Step 1: Direct call to Groq Whisper (no payload size limit)
      const fd = new FormData();
      fd.append("file", file);
      fd.append("model", "whisper-large-v3");
      fd.append("response_format", "text");

      const r1 = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: "Bearer " + GROQ_KEY },
        body: fd,
      });
      if (!r1.ok) throw new Error("Transcription failed: " + (await r1.text()));
      const transcript = await r1.text();

      // Step 2: Server-side summarization via /api/summarize
      setProgStep(1);
      const r2 = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || "Meeting", transcript }),
      });
      if (!r2.ok) throw new Error("Summarization failed: " + (await r2.text()));
      const d2 = await r2.json();
      const parsed = JSON.parse(d2.result);

      setProgStep(2);
      setTimeout(() => {
        setResults({ ...parsed, transcript, title: title || "Meeting", filename: file.name });
        setStep(3);
      }, 500);
    } catch (e) {
      setError(e.message);
      setStep(1);
      setProgStep(-1);
    }
  };

  const postAll = () => {
    if (!results) return;
    setPosting(true);
    if (typeof sendPrompt === "function") {
      sendPrompt("MEETING_AUTOMATION_POST:" + JSON.stringify(results));
    } else {
      navigator.clipboard.writeText(JSON.stringify(results, null, 2));
      alert("Results copied to clipboard. Paste them into Claude chat to post to Slack and Notion.");
      setPosting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setTitle("");
    setStep(1);
    setProgStep(-1);
    setResults(null);
    setError("");
    setPosting(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const stepLabels = ["01 upload", "02 transcribe", "03 summarize", "04 review"];

  return (
    <>
      <style>{styles}</style>
      <div className="wrap">
        <h1>Meeting Automation</h1>
        <p className="sub">
          Upload a recording, get a transcript, summary, action items, key decisions,
          and open questions posted to Slack and Notion automatically.
        </p>

        <div className="steps">
          {stepLabels.map((l, i) => (
            <div
              key={i}
              className={`step${
                step === i + 1 ? " active" : step > i + 1 ? " done" : ""
              }`}
            >
              {l}
            </div>
          ))}
        </div>

        {!results && progStep < 0 && (
          <>
            <div
              className={`drop-zone${drag ? " drag" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
            >
              <input
                ref={inputRef}
                type="file"
                accept="audio/*,video/*,.mp3,.mp4,.wav,.m4a,.webm,.ogg"
                onChange={onInputChange}
              />
              <span className="drop-icon">[ + ]</span>
              <div className="drop-label">
                <strong>Drop your recording here</strong>
                <br />
                or click to browse — MP3, WAV, M4A, MP4, WEBM
              </div>
              {file && (
                <div className="file-badge">
                  <span className="dot" />
                  {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </div>
              )}
            </div>

            <div className="field">
              <label>Meeting title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. W Concept CEO Meeting 2026-05-27"
              />
            </div>

            <button
              className="btn btn-primary"
              disabled={!file}
              onClick={run}
            >
              Run Automation
            </button>

            {error && <div className="err">Error: {error}</div>}
          </>
        )}

        {progStep >= 0 && !results && (
          <div className="progress-box">
            {[
              "Transcribing audio with Groq Whisper large-v3...",
              "Analyzing transcript with Llama 3.3 70B...",
              "Results ready, preparing output...",
            ].map((label, i) => (
              <div
                key={i}
                className={`prog-row${
                  progStep === i ? " active" : progStep > i ? " done" : ""
                }`}
              >
                <div className="prog-icon">
                  {progStep > i ? (
                    "+"
                  ) : progStep === i ? (
                    <span className="spinner" />
                  ) : (
                    "o"
                  )}
                </div>
                {label}
              </div>
            ))}
          </div>
        )}

        {results && (
          <>
            <div className="meta-row">
              <span className={`meta-pill ${results.meeting_type || ''}`}>
                {(results.meeting_type || 'meeting').toUpperCase()}
                {results.client_company ? ` · ${results.client_company}` : ''}
              </span>
              <span className="meta-pill">
                {(results.language || 'en').toUpperCase()}
              </span>
              {results.participants && results.participants.length > 0 && (
                <span className="meta-pill">
                  {results.participants.length} participants
                </span>
              )}
            </div>

            <div className="results">
              <div className="card">
                <div className="card-head">
                  <span className="tag tag-slack">SLACK</span>
                  <span className="card-title">Brief summary</span>
                </div>
                <div className="card-body">
                  {results.brief_summary || <span className="empty">No summary generated</span>}
                </div>
              </div>

              {results.summary_points && results.summary_points.length > 0 && (
                <div className="card">
                  <div className="card-head">
                    <span className="tag tag-notion">NOTION</span>
                    <span className="card-title">Summary points</span>
                  </div>
                  <div className="card-body">
                    {results.summary_points.map((p, i) => (
                      <div key={i} className="point-row">
                        <div className="point-topic">{p.topic}</div>
                        <div className="point-desc">{p.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card">
                <div className="card-head">
                  <span className="tag tag-slack">SLACK</span>
                  <span className="card-title">Action items</span>
                </div>
                <div className="card-body">
                  {(results.action_items || []).length === 0 ? (
                    <span className="empty">No action items</span>
                  ) : (
                    (results.action_items || []).map((item, i) => (
                      <div key={i} className="ai-row">
                        <span className={`ai-person ${item.slack_id ? 'tagged' : 'team'}`}>
                          {item.person_display || "Team"}
                        </span>
                        <div>
                          <div className="ai-task">{item.task}</div>
                          {item.deadline && (
                            <div className="ai-deadline">Due: {item.deadline}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {results.key_decisions && results.key_decisions.length > 0 && (
                <div className="card">
                  <div className="card-head">
                    <span className="tag tag-notion">NOTION</span>
                    <span className="card-title">Key decisions</span>
                  </div>
                  <div className="card-body">
                    {results.key_decisions.map((p, i) => (
                      <div key={i} className="point-row">
                        <div className="point-topic">{p.topic}</div>
                        <div className="point-desc">{p.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.open_questions && results.open_questions.length > 0 && (
                <div className="card">
                  <div className="card-head">
                    <span className="tag tag-notion">NOTION</span>
                    <span className="card-title">Open questions / follow-ups</span>
                  </div>
                  <div className="card-body">
                    {results.open_questions.map((p, i) => (
                      <div key={i} className="point-row">
                        <div className="point-topic">{p.topic}</div>
                        <div className="point-desc">{p.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card">
                <div className="card-head">
                  <span className="tag tag-raw">TRANSCRIPT</span>
                  <span className="card-title">Raw transcript (Groq Whisper)</span>
                </div>
                <div className="card-body mono">{results.transcript}</div>
              </div>
            </div>

            <div className="post-row">
              <button
                className="btn btn-primary"
                disabled={posting}
                onClick={postAll}
              >
                {posting ? "Posting..." : "Post to Slack + Create Notion Page"}
              </button>
              <button
                className="btn btn-secondary"
                style={{ width: "auto", padding: "12px 20px" }}
                onClick={reset}
              >
                Reset
              </button>
            </div>

            {error && <div className="err">Error: {error}</div>}
          </>
        )}
      </div>
    </>
  );
}

