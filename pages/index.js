import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState({ message: '', tone: '', visible: false });

  useEffect(() => {
    if (!router.isReady) return;
    const STORAGE_PREFIX = 'ppss';
    const ACTIVE_WORKSPACE_KEY = `${STORAGE_PREFIX}-active-code`;
    const params = new URLSearchParams(window.location.search);

    const showFeedback = (message, tone = '') => {
      setFeedback({ message, tone, visible: Boolean(message) });
    };

    if (params.get('login') === 'required') {
      showFeedback('워크스페이스에 접근하려면 코드를 입력하세요.', 'error');
      params.delete('login');
      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', nextUrl);
      return;
    }

    const stored = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    if (stored) {
      setCode(stored);
      showFeedback(`최근에 열린 워크스페이스 코드 ${stored} 가 준비되어 있습니다. 새로운 코드를 입력하면 변경됩니다.`, 'info');
    }
  }, [router.isReady]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setFeedback({ message: '유효한 코드를 입력하세요.', tone: 'error', visible: true });
      return;
    }
    localStorage.setItem('ppss-active-code', trimmed);
    setFeedback({ message: '워크스페이스를 여는 중입니다...', tone: 'success', visible: true });
    router.push(`/workspace?code=${encodeURIComponent(trimmed)}`);
  };

  const feedbackClass = `login-feedback ${
    feedback.tone === 'error' ? 'error' : feedback.tone === 'success' ? 'success' : ''
  }`.trim();

  return (
    <div className="page">
      <Sidebar active="home" />
      <main className="content">
        <header>
          <h1>ChatGPT-assisted Product-Service System Platform</h1>
        </header>
        <section>
          <p>
            The home dashboard presents an overview of the proactive product-service system design workflow, summarizing the
            current project status and providing quick access to collaborative tasks described in the case study.
          </p>
          <p>
            Use the navigation on the left to explore the dedicated workspace, review generated reports, and configure platform
            preferences as outlined in the research article.
          </p>
        </section>

        <section className="workspace-login" aria-labelledby="workspace-login-heading">
          <h2 id="workspace-login-heading">Access Your Workspace</h2>
          <p>
            Enter the access code provided for your team to open a dedicated workspace. Each code stores its own dialogue,
            evidence, and summaries so that multiple teams can explore the platform independently.
          </p>
          <form id="workspace-access-form" className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="workspace-code">Workspace Access Code</label>
            <div className="login-input-group">
              <input
                id="workspace-code"
                name="workspace-code"
                type="text"
                autoComplete="off"
                required
                placeholder="Enter code (e.g., TEAM-42)"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
              <button type="submit">Open Workspace</button>
            </div>
            <p id="login-feedback" className={feedbackClass} role="alert" hidden={!feedback.visible}>
              {feedback.message}
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}
