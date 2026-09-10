import { LoginForm } from "@/modules/identity/ui/login-form";
export default function LoginPage() {
  return (
    <main id="main" className="login-shell">
      <section className="login-story">
        <div className="brand">
          <span className="brand-mark">LR</span>
          <span>
            Land Records
            <span className="brand-sub">SIH26018 · Department workspace</span>
          </span>
        </div>
        <div>
          <p className="eyebrow">Intelligent land record digitization</p>
          <h1>
            Preserve the source.
            <br />
            Build trusted records.
          </h1>
          <p className="story-copy">
            A secure workspace for the people responsible for our land records.
          </p>
          <div className="story-principles">
            <span>
              01 <strong>Source evidence</strong>
            </span>
            <span>
              02 <strong>Human verification</strong>
            </span>
            <span>
              03 <strong>Accountable decisions</strong>
            </span>
          </div>
        </div>
        <p className="story-footer">
          Development prototype · Synthetic departments only
        </p>
      </section>
      <section className="login-panel">
        <div className="login-content">
          <span className="tag">Authorized access</span>
          <h2>Sign in to your workspace</h2>
          <p className="muted">
            Use the account assigned by your department administrator.
          </p>
          <LoginForm />
          <div className="help-note">
            <strong>Need an account?</strong>
            <p>
              Contact your administrator. Public registration is not available.
            </p>
          </div>
        </div>
        <p className="login-footer">
          Access is restricted by role, department and jurisdiction.
        </p>
      </section>
    </main>
  );
}
