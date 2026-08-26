'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  CATEGORY_META,
  CategoryId,
  Problem,
  createStarterProblem,
  generateProblem,
  hasParseableAnswer,
  isCorrectAnswer,
} from './problemEngine';

type AttemptStatus = 'active' | 'correct' | 'exhausted' | 'skipped';
type Theme = 'light' | 'dracula';
type FeedbackTone = 'neutral' | 'invalid' | 'incorrect' | 'correct';

type Score = {
  correct: number;
  answered: number;
  streak: number;
};

const initialScore: Score = { correct: 0, answered: 0, streak: 0 };

const themeLabel: Record<Theme, string> = {
  light: 'Light',
  dracula: 'Dracula',
};

export default function Home() {
  const [problem, setProblem] = useState<Problem>(createStarterProblem);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('mixed');
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<AttemptStatus>('active');
  const [attemptLimit, setAttemptLimit] = useState(3);
  const [currentAttemptLimit, setCurrentAttemptLimit] = useState(3);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [feedback, setFeedback] = useState('Enter your answer when you are ready.');
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>('neutral');
  const [score, setScore] = useState<Score>(initialScore);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [theme, setTheme] = useState<Theme>('light');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('doselab-theme');
    const savedAttempts = Number(window.localStorage.getItem('doselab-attempts'));
    const preferredTheme: Theme = savedTheme === 'dracula' || savedTheme === 'light'
      ? savedTheme
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dracula'
        : 'light';
    const safeAttempts = Number.isInteger(savedAttempts) && savedAttempts >= 1 && savedAttempts <= 5
      ? savedAttempts
      : 3;

    setTheme(preferredTheme);
    setAttemptLimit(safeAttempts);
    setCurrentAttemptLimit(safeAttempts);
    setProblem(generateProblem('mixed', 'starter-units-volume'));
    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === 'dracula' ? 'dark' : 'light';
    if (preferencesLoaded) window.localStorage.setItem('doselab-theme', theme);
  }, [theme, preferencesLoaded]);

  useEffect(() => {
    if (preferencesLoaded) window.localStorage.setItem('doselab-attempts', String(attemptLimit));
  }, [attemptLimit, preferencesLoaded]);

  useEffect(() => {
    if (!settingsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSettingsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [settingsOpen]);

  const attemptsRemaining = Math.max(0, currentAttemptLimit - attemptsUsed);
  const solutionVisible = status !== 'active';
  const accuracy = score.answered ? Math.round((score.correct / score.answered) * 100) : null;
  const selectedMeta = CATEGORY_META.find((category) => category.id === selectedCategory) ?? CATEGORY_META[0];

  const heading = status === 'correct'
    ? 'Nicely calculated.'
    : solutionVisible
      ? 'Study the setup.'
      : 'Work the units.';

  const statusMessage = useMemo(() => {
    if (status === 'correct') return `Correct — ${problem.finalAnswer}.`;
    if (status === 'exhausted') return `Attempts used. The answer is ${problem.finalAnswer}.`;
    if (status === 'skipped') return `Solution revealed. The answer is ${problem.finalAnswer}.`;
    return feedback;
  }, [feedback, problem.finalAnswer, status]);

  const resetProblemState = () => {
    setAnswer('');
    setStatus('active');
    setAttemptsUsed(0);
    setCurrentAttemptLimit(attemptLimit);
    setFeedback('Enter your answer when you are ready.');
    setFeedbackTone('neutral');
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const startFreshProblem = (category: CategoryId = selectedCategory, increment = true) => {
    setProblem((current) => generateProblem(category, current.kind));
    if (increment) setQuestionNumber((current) => current + 1);
    resetProblemState();
  };

  const chooseCategory = (category: CategoryId) => {
    setSelectedCategory(category);
    setSettingsOpen(false);
    startFreshProblem(category);
  };

  const recordAnswer = (wasCorrect: boolean) => {
    setScore((current) => ({
      correct: current.correct + (wasCorrect ? 1 : 0),
      answered: current.answered + 1,
      streak: wasCorrect ? current.streak + 1 : 0,
    }));
  };

  const checkAnswer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status !== 'active') return;

    if (!hasParseableAnswer(problem, answer)) {
      setFeedback(problem.answerKind === 'ratio'
        ? 'Enter both parts of the ratio with a colon, such as 1:50.'
        : 'Enter a number before checking your answer.');
      setFeedbackTone('invalid');
      return;
    }

    if (isCorrectAnswer(problem, answer)) {
      setStatus('correct');
      setFeedbackTone('correct');
      recordAnswer(true);
      return;
    }

    const nextAttemptsUsed = attemptsUsed + 1;
    setAttemptsUsed(nextAttemptsUsed);
    if (nextAttemptsUsed >= currentAttemptLimit) {
      setStatus('exhausted');
      setFeedbackTone('incorrect');
      recordAnswer(false);
    } else {
      setFeedback(`Not quite. ${problem.hint}`);
      setFeedbackTone('incorrect');
      window.requestAnimationFrame(() => inputRef.current?.select());
    }
  };

  const revealSolution = () => {
    if (status !== 'active') return;
    setStatus('skipped');
    setFeedbackTone('neutral');
    recordAnswer(false);
  };

  const changeAttemptLimit = (value: number) => {
    setAttemptLimit(value);
    if (status === 'active' && attemptsUsed === 0) setCurrentAttemptLimit(value);
  };

  const resetSession = () => {
    setScore(initialScore);
    setQuestionNumber(1);
    setProblem((current) => generateProblem(selectedCategory, current.kind));
    resetProblemState();
    setSettingsOpen(false);
  };

  const settings = (drawer = false) => (
    <>
      <div className="setting-block">
        <div className="setting-heading">
          <label htmlFor={drawer ? 'drawer-attempts' : 'attempts'}>Attempts per problem</label>
          <span>{attemptLimit}</span>
        </div>
        <select
          id={drawer ? 'drawer-attempts' : 'attempts'}
          value={attemptLimit}
          onChange={(event) => changeAttemptLimit(Number(event.target.value))}
        >
          {[1, 2, 3, 4, 5].map((count) => (
            <option key={count} value={count}>{count} {count === 1 ? 'attempt' : 'attempts'}</option>
          ))}
        </select>
        {attemptsUsed > 0 && status === 'active' && (
          <small>The new limit starts with the next problem.</small>
        )}
      </div>

      <fieldset className="setting-block theme-setting">
        <legend>Theme</legend>
        <div className="theme-options">
          {(['light', 'dracula'] as Theme[]).map((option) => (
            <button
              key={option}
              type="button"
              className={theme === option ? 'selected' : ''}
              aria-pressed={theme === option}
              onClick={() => setTheme(option)}
            >
              <span aria-hidden="true">{option === 'light' ? '☀' : '☾'}</span>
              {themeLabel[option]}
            </button>
          ))}
        </div>
      </fieldset>

      <button className="reset-button" type="button" onClick={resetSession}>
        Reset session stats
      </button>
    </>
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-lockup" type="button" onClick={() => startFreshProblem('mixed')} aria-label="DoseLab — start a new mixed problem">
          <span className="brand-mark" aria-hidden="true"><i /></span>
          <span className="brand-copy">
            <strong>DoseLab</strong>
            <span>calculation practice</span>
          </span>
        </button>
        <div className="topbar-actions">
          <span className="status-dot">Practice mode</span>
          <button
            className="icon-button theme-cycle"
            type="button"
            onClick={() => setTheme(theme === 'light' ? 'dracula' : 'light')}
            aria-label={`Switch to ${theme === 'light' ? 'Dracula dark' : 'light'} theme`}
            title={`Current theme: ${themeLabel[theme]}`}
          >
            <span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
          </button>
          <button className="settings-button" type="button" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <p className="eyebrow">Problem sets</p>
          <nav aria-label="Practice categories">
            {CATEGORY_META.map((category) => (
              <button
                key={category.id}
                className={selectedCategory === category.id ? 'nav-item active' : 'nav-item'}
                type="button"
                aria-pressed={selectedCategory === category.id}
                onClick={() => chooseCategory(category.id)}
              >
                <span>{category.label}</span><b>{category.count}</b>
              </button>
            ))}
          </nav>
          <div className="sidebar-note">
            <span aria-hidden="true">✦</span>
            <p><strong>Fresh every time</strong>Values are randomly generated from the same problem families as your examples.</p>
          </div>
          <p className="sidebar-disclaimer">Educational math practice only.<br />Not clinical decision support.</p>
        </aside>

        <section className="practice-stage">
          <div className="mobile-category">
            <label htmlFor="mobile-category">Problem set</label>
            <select id="mobile-category" value={selectedCategory} onChange={(event) => chooseCategory(event.target.value as CategoryId)}>
              {CATEGORY_META.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
          </div>

          <div className="stage-heading">
            <div>
              <p className="eyebrow">Question {questionNumber} · {problem.categoryLabel}</p>
              <h1>{heading}</h1>
            </div>
            <div className="progress-pill" aria-label={`${score.correct} correct answers in this session`}>
              <span aria-hidden="true">✓</span> {score.correct} correct
            </div>
          </div>

          <article className={`problem-card status-${status}`}>
            <div className="problem-meta">
              <span className="number-tile">{String(questionNumber).padStart(2, '0')}</span>
              <div className="meta-tags">
                {problem.legacyRatio && <span className="legacy-tag">Legacy notation</span>}
                <span className="difficulty">{problem.difficulty}</span>
              </div>
            </div>

            <p className="problem-text">{problem.prompt}</p>

            {problem.legacyRatio && (
              <p className="ratio-context">
                Ratio notation is included because it appears in coursework. The worked answer also uses metric strength when relevant.
              </p>
            )}

            <form className="answer-area" onSubmit={checkAnswer} noValidate>
              <label htmlFor="answer">Your answer</label>
              <div className="answer-row">
                <input
                  ref={inputRef}
                  id="answer"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  inputMode={problem.answerKind === 'ratio' ? 'text' : 'decimal'}
                  placeholder={problem.placeholder}
                  disabled={solutionVisible}
                  aria-describedby="answer-help answer-feedback"
                  autoComplete="off"
                />
                {problem.unit && <span className="answer-unit">{problem.unit}</span>}
                <button type="submit" disabled={solutionVisible}>
                  Check answer <b aria-hidden="true">→</b>
                </button>
              </div>

              <div className="answer-support">
                <p id="answer-help">
                  {problem.answerKind === 'ratio' ? 'Use a colon between both terms.' : 'Enter a number without the unit.'}
                </p>
                <div className="attempt-dots" aria-label={`${attemptsRemaining} of ${currentAttemptLimit} attempts remaining`}>
                  {Array.from({ length: currentAttemptLimit }, (_, index) => (
                    <span key={index} className={index < attemptsUsed ? 'used' : ''} />
                  ))}
                </div>
              </div>

              <p id="answer-feedback" className={`feedback feedback-${feedbackTone}`} role="status" aria-live="polite">
                <span aria-hidden="true">{feedbackTone === 'correct' ? '✓' : feedbackTone === 'incorrect' ? '↺' : feedbackTone === 'invalid' ? '!' : 'i'}</span>
                {statusMessage}
              </p>
            </form>

            {solutionVisible && (
              <section className="solution-card" aria-labelledby="solution-heading" aria-live="polite">
                <div className="solution-heading">
                  <div>
                    <p className="eyebrow">Worked solution</p>
                    <h2 id="solution-heading">Follow the units.</h2>
                  </div>
                  <span className="final-answer">{problem.finalAnswer}</span>
                </div>

                <div className="formula-strip">
                  <span>Rule</span>
                  <code>{problem.formula}</code>
                </div>

                <ol className="solution-steps">
                  {problem.steps.map((step, index) => (
                    <li key={`${step.label}-${index}`}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <strong>{step.label}</strong>
                        <code>{step.expression}</code>
                        {step.note && <p>{step.note}</p>}
                      </div>
                    </li>
                  ))}
                </ol>

                {problem.legacyRatio && (
                  <div className="legacy-note">
                    <strong>Safety context</strong>
                    Current medication labels favor metric strength such as mg/mL because ratio notation can be misread. Here it is conversion practice only.
                  </div>
                )}

                <button className="next-button" type="button" onClick={() => startFreshProblem()}>
                  Next random problem <span aria-hidden="true">→</span>
                </button>
              </section>
            )}
          </article>

          <div className="stage-footer">
            <span>Attempts remaining <b>{attemptsRemaining}</b></span>
            {status === 'active' ? (
              <button type="button" onClick={revealSolution}>Skip & show solution</button>
            ) : (
              <button type="button" onClick={() => startFreshProblem()}>New problem</button>
            )}
          </div>
        </section>

        <aside className="session-panel">
          <p className="eyebrow">This session</p>
          <div className="score-card">
            <span>Accuracy</span>
            <strong>{accuracy === null ? '—' : `${accuracy}%`}</strong>
            <small>{score.answered ? `${score.correct} correct of ${score.answered} completed` : 'Start with the problem at left'}</small>
          </div>

          <div className="stat-row">
            <div><span>Streak</span><strong>{score.streak}</strong></div>
            <div><span>Completed</span><strong>{score.answered}</strong></div>
          </div>

          {settings(false)}

          <div className="mini-guide">
            <span className="guide-index">01</span>
            <p><strong>Study rule</strong>{problem.formula}</p>
          </div>

          <details className="source-note">
            <summary>Math conventions</summary>
            <p>% w/v means grams per 100 mL. Simple dilution uses V₁C₁ = V₂C₂. Weight exercises use 1 kg = 2.2 lb.</p>
            <a href="https://www.ncbi.nlm.nih.gov/books/NBK593207/" target="_blank" rel="noreferrer">Review the nursing reference</a>
          </details>

          <p className="safety-note">For learning and skills practice only. Verify real medication calculations using your institution’s policy and a qualified clinician.</p>
        </aside>
      </div>

      {settingsOpen && (
        <div className="drawer-layer">
          <button className="drawer-backdrop" type="button" aria-label="Close settings" onClick={() => setSettingsOpen(false)} />
          <aside className="settings-drawer" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className="drawer-heading">
              <div>
                <p className="eyebrow">Preferences</p>
                <h2 id="settings-title">Practice settings</h2>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">×</button>
            </div>
            {settings(true)}
            <div className="drawer-category">
              <label htmlFor="drawer-category">Problem set</label>
              <select id="drawer-category" value={selectedCategory} onChange={(event) => chooseCategory(event.target.value as CategoryId)}>
                {CATEGORY_META.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
              </select>
              <small>Current set: {selectedMeta.shortLabel}</small>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
