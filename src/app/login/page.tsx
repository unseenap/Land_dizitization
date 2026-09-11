import Image from "next/image";
import { LoginForm } from "@/modules/identity/ui/login-form";
import { AppIcon } from "@/components/ui/app-icon";
import { AnimatedContent } from "@/components/react-bits/animated-content";
export default function LoginPage() {
  return (
    <main id="main" className="login-shell">
      <section className="login-story">
        <Image className="login-art" src="/images/land-record-digitization.png" alt="Fictional archival land maps being digitized under a document scanner" fill priority sizes="(max-width: 760px) 100vw, 58vw" />
        <div className="login-story-overlay" />
        <div className="brand login-brand">
          <span className="brand-mark"><AppIcon name="document" size={21} weight="duotone" /></span>
          <span>
            Land Records
            <span className="brand-sub">SIH26018 · Department workspace</span>
          </span>
        </div>
        <AnimatedContent className="login-message">
          <p className="eyebrow">Intelligent land record digitization</p>
          <h1>
            Preserve the source.
            <br />
            Build trusted records.
          </h1>
          <p className="story-copy">Preserve original evidence, review every extracted field and publish accountable land records.</p>
          <div className="story-principles">
            <span><AppIcon name="document" size={18} /><strong>Source evidence preserved</strong></span>
            <span><AppIcon name="users" size={18} /><strong>Human verification required</strong></span>
            <span><AppIcon name="security" size={18} /><strong>Every decision is traceable</strong></span>
          </div>
        </AnimatedContent>
        <p className="story-footer">
          Development prototype · Synthetic departments only
        </p>
      </section>
      <section className="login-panel">
        <AnimatedContent className="login-content" delay={0.08}>
          <span className="tag">Authorized access</span>
          <h2>Sign in to your workspace</h2>
          <p className="muted">
            Use the account assigned by your department administrator.
          </p>
          <LoginForm />
          <div className="help-note">
            <AppIcon name="security" size={20} />
            <div>
            <strong>Need an account?</strong>
            <p>Contact your administrator. Public registration is not available.</p>
            </div>
          </div>
        </AnimatedContent>
        <p className="login-footer">
          Access is restricted by role, department and jurisdiction.
        </p>
      </section>
    </main>
  );
}
