"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileCheck2,
  Globe2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "./common";
import { Button } from "./ui/button";
import { JourneyForm } from "./journey-form";
import { CountrySelect, validCountries } from "./country-select";
import { useDemo } from "@/lib/store";
import { identityProviders } from "@/lib/identity-providers";
import {
  createVerificationChallenge,
  maskSensitiveIdentifier,
  verifyChallenge,
  type VerificationChallenge,
} from "@/lib/verification";

export function Onboarding() {
  const { update, ready } = useDemo();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [createJourney, setCreateJourney] = useState(false);
  const [form, setForm] = useState({
    name: "",
    nationality: "",
    issuing: "",
    residence: "",
    identifier: "",
    expiry: "",
    passportType: "Ordinary",
    dateOfBirth: "",
    residencePermit: "",
    residencePermitExpiry: "",
  });
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<VerificationChallenge | null>(null);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [provider, setProvider] = useState("local-session");
  const [error, setError] = useState("");
  const change = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  function identity(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !maskSensitiveIdentifier(form.identifier)) {
      setError("Enter the traveler’s full legal name and a passport number with at least four characters.");
      return;
    }
    if (![form.nationality, form.issuing, form.residence].every((value) => validCountries.includes(value))) {
      setError("Choose each country from the suggestions.");
      return;
    }
    setError("");
    setChallenge(null);
    setVerified(false);
    setCode("");
    setStep(2);
  }

  function requestCode() {
    setRequesting(true);
    setError("");
    setVerified(false);
    setCode("");
    setDeliveryOpen(false);
    setChallenge(null);
    window.setTimeout(() => {
      setChallenge(createVerificationChallenge(Date.now(), challenge?.code));
      setRequesting(false);
    }, 350);
  }

  function verifyCode() {
    setVerifying(true);
    setError("");
    window.setTimeout(() => {
      const valid = verifyChallenge(challenge, code);
      setVerified(valid);
      setVerifying(false);
      if (!valid) setError("That code is invalid or expired. Request a new code.");
    }, 250);
  }

  function finish() {
    if (!verified || !challenge || !verifyChallenge(challenge, code)) {
      setError("Verify a current code before continuing.");
      setVerified(false);
      return;
    }
    const id = `traveler-${Date.now()}`;
    update((current) => ({
      ...current,
      pendingTravelerId: id,
      travelers: [
        ...current.travelers,
        {
          id,
          name: form.name.trim(),
          initials: form.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join(""),
          role: "Primary traveler",
          nationality: form.nationality,
          residence: form.residence,
          color: "blue",
          passportIssuingCountry: form.issuing,
          passportMasked: maskSensitiveIdentifier(form.identifier),
          passportExpiry: form.expiry,
          passportType: form.passportType,
          dateOfBirth: form.dateOfBirth || undefined,
          ...(form.residencePermit.trim()
            ? {
                residencePermitMasked: maskSensitiveIdentifier(form.residencePermit),
                residencePermitExpiry: form.residencePermitExpiry || undefined,
              }
            : {}),
        },
      ],
    }));
    setForm((current) => ({
      ...current,
      identifier: "",
      residencePermit: "",
    }));
    setChallenge(null);
    setCode("");
    setVerified(true);
    setStep(3);
    setError("");
  }

  return (
    <div className="onboarding">
      <header className="onboarding-header">
        <Brand />
        <span className="muted small">Private local workspace</span>
      </header>
      <main className="onboarding-layout">
        <aside className="onboarding-story">
          <div className="service-mark"><Globe2 size={25} /><span>Travel readiness</span></div>
          <h2 className="onboarding-display">{step === 0 ? <>Travel plans,<br />made clear.</> : "One traveler.\nOne clear plan."}</h2>
          <p>Documents, entry requirements and travel preparation, organised around you.</p>
          <div className="service-features">
            <span><FileCheck2 size={17} /> Prepare your documents</span>
            <span><Globe2 size={17} /> Review official requirements</span>
            <span><LockKeyhole size={17} /> Keep your information on this device</span>
          </div>
          <small>Independent cross-border preparation.</small>
        </aside>
        <section className="onboarding-card">
          {step > 0 && <ol className="onboarding-progress">
            {["Personal information", "Identity verification", "Journey"].map((label, index) => <li key={label} className={step >= index + 1 ? "active" : ""}><span>{step > index + 1 ? <Check size={12} /> : index + 1}</span>{label}</li>)}
          </ol>}
          {step === 0 ? <form className="welcome-content" onSubmit={(event) => { event.preventDefault(); router.push("/app"); }}>
            <span className="welcome-icon"><ShieldCheck size={29} /></span>
            <h1>Sign in</h1>
            <p>Open your saved Meridian workspace on this device.</p>
            <label className="auth-field">Email address<input type="email" required autoComplete="email" placeholder="you@example.com" /></label>
            <label className="auth-field">Password<input type="password" required minLength={4} autoComplete="current-password" placeholder="Password" /></label>
            <Button type="submit" variant="default" disabled={!ready}>Sign in <ArrowRight size={15} /></Button>
            <p className="auth-create">New to Meridian? <button type="button" className="text-link" onClick={() => setStep(1)}>Create account</button></p>
            <div className="onboarding-privacy"><LockKeyhole size={14} /><span>Account data remains in this browser. Government identity services are not connected.</span></div>
          </form> : step === 1 ? <form onSubmit={identity}>
            <div className="between"><h2>Personal information</h2></div>
            <div className="form-grid">
              <label className="full">Full legal name<input required value={form.name} placeholder="Full legal name" onChange={(event) => change("name", event.target.value)} /></label>
              <CountrySelect id="nationality" label="Nationality" value={form.nationality} onChange={(value) => change("nationality", value)} />
              <CountrySelect id="residence" label="Country of residence" value={form.residence} onChange={(value) => change("residence", value)} />
              <CountrySelect id="issuing-country" label="Passport issuing country" value={form.issuing} onChange={(value) => change("issuing", value)} />
              <label>Passport expiry date<input type="date" required value={form.expiry} onChange={(event) => change("expiry", event.target.value)} /></label>
              <label>Passport type<select value={form.passportType} onChange={(event) => change("passportType", event.target.value)}><option>Ordinary</option><option>Diplomatic</option><option>Official / service</option><option>Other travel document</option></select></label>
              <label>Date of birth (optional)<input type="date" value={form.dateOfBirth} onChange={(event) => change("dateOfBirth", event.target.value)} /></label>
              <label className="full">Passport number<input type="password" aria-label="Passport number" required minLength={4} placeholder="Enter passport number" value={form.identifier} onChange={(event) => change("identifier", event.target.value)} autoComplete="new-password" /><small>Only a masked number is saved.</small></label>
              <label className="full">Residence permit number (optional)<input type="password" minLength={4} placeholder="Enter residence permit number" value={form.residencePermit} onChange={(event) => change("residencePermit", event.target.value)} autoComplete="new-password" /><small>Only a masked number is saved.</small></label>
              <label>Residence permit expiry date (optional)<input type="date" value={form.residencePermitExpiry} onChange={(event) => change("residencePermitExpiry", event.target.value)} /></label>
            </div>
            <div className="dialog-footer"><Button type="button" onClick={() => setStep(0)}><ArrowLeft size={14} /> Back</Button><Button variant="default" type="submit">Continue <ArrowRight size={14} /></Button></div>
          </form> : step === 2 ? <div>
            <h2>Confirm traveler details</h2>
            <div className="identity-summary"><strong>{form.name}</strong><span>{form.nationality} · Resident in {form.residence}</span><span>{maskSensitiveIdentifier(form.identifier)} · Expires {form.expiry}</span>{form.residencePermit && <span>Residence permit {maskSensitiveIdentifier(form.residencePermit)}{form.residencePermitExpiry ? ` · Expires ${form.residencePermitExpiry}` : ""}</span>}</div>
            <div className="form-grid">
               <label className="full">Verification method<select value={provider} onChange={(event) => setProvider(event.target.value)}><option value="local-session">Local session code</option>{identityProviders.map((item) => <option key={item.id} value={item.id} disabled>{item.name}</option>)}</select><small>This locally generated code confirms this browser session only. It is not government identity authentication.</small></label>
              <label className="full">Six-digit local verification code<input className="verification-code" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, "")); setVerified(false); }} onPaste={(event) => { event.preventDefault(); setCode(event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)); setVerified(false); }} autoComplete="one-time-code" aria-invalid={!!error} /></label>
            </div>
            <div className="dialog-footer">
              <Button type="button" onClick={() => setStep(1)}>Back</Button>
              <Button type="button" disabled={requesting} onClick={requestCode}>{requesting ? "Requesting…" : challenge ? "Resend local code" : "Request code"}</Button>
              <Button type="button" disabled={verifying || requesting || !challenge} onClick={verifyCode}>{verifying ? "Verifying…" : "Verify code"}</Button>
              {verified && <Button type="button" variant="default" onClick={finish}>Continue <ArrowRight size={14} /></Button>}
            </div>
            {challenge && <details className="verification-delivery-panel" open={deliveryOpen} onToggle={(event) => setDeliveryOpen(event.currentTarget.open)}><summary>Open local delivery panel · Expires {new Date(challenge.expiresAt).toLocaleTimeString()}</summary><p>Locally generated preview code:</p><strong>{challenge.code}</strong></details>}
             {verified && <p role="status" className="verification-status">Local session code accepted.</p>}
          </div> : <div className="welcome-content">
            <span className="welcome-icon"><Check size={28} /></span><h2>Plan your journey</h2>
            <p>Your traveler profile is ready. Add a route and dates; nationality and residence are saved.</p>
            <div className="identity-summary"><strong>{form.name}</strong><span>Continue to travel planning</span></div>
             <Button variant="default" onClick={() => setCreateJourney(true)}>Create a journey <ArrowRight size={14} /></Button>
          </div>}
          {error && <p className="form-error" role="alert">{error}</p>}
        </section>
      </main>
       {createJourney && <JourneyForm open onOpenChange={setCreateJourney} />}
    </div>
  );
}
