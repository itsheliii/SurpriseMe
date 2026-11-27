import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ALLOWED_IMAGE_TYPES, EVENT_TYPES, REVEAL_STYLES, LIMITS, createSurpriseSchema } from "@surpriseme/shared";
import { getLocalDraft, saveLocalDraft } from "../api/local-drafts";
import { validatePhotos } from "./creation-validation";
import "../styles/dashboard.css";
import "../styles/create-surprise.css";

function PhotoPreview({ file, remove }: { file: File; remove: () => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const preview = URL.createObjectURL(file);
    setUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [file]);
  return <li className="photo-preview">
    {url && <img src={url} alt={file.name} />}
    <div><span title={file.name}>{file.name}</span><button type="button" onClick={remove} aria-label={`Remove ${file.name}`}>Remove</button></div>
  </li>;
}

export default function CreateSurprise() {
  const draftId = new URLSearchParams(window.location.search).get("draft");
  const [details, setDetails] = useState({ title: "", recipientName: "", recipientEmail: "", eventType: "birthday", revealStyle: "simple-fade", deliverAt: "" });
  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(draftId));
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!draftId) return;
    let active = true;
    getLocalDraft(draftId).then((draft) => {
      if (!active) return;
      if (!draft) throw new Error("Draft not found.");
      // datetime-local shows the user's local time; storage uses UTC ISO dates.
      const date = new Date(draft.deliverAt);
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setDetails({ title: draft.title, recipientName: draft.recipientName, recipientEmail: draft.recipientEmail ?? "", eventType: draft.eventType, revealStyle: draft.revealStyle, deliverAt: localDate });
      setMessage(draft.message);
      setPhotos(draft.photos);
    }).catch(() => {
      if (active) { setError("This draft couldn't be loaded. Return to the dashboard and try again."); setLoadFailed(true); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [draftId]);

  function change(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setDetails({ ...details, [event.target.name]: event.target.value });
    setError("");
  }

  function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const problem = validatePhotos(files, photos.length);
    setPhotoError(problem ?? "");
    if (!problem) setPhotos((current) => [...current, ...files]);
    event.target.value = "";
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const date = new Date(details.deliverAt);
    if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
      setError("Choose a reveal date and time in the future."); return;
    }
    const parsed = createSurpriseSchema.safeParse({ ...details, recipientEmail: details.recipientEmail.trim() || undefined, deliverAt: date.toISOString() });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check your details."); return; }
    if (!message.trim() && photos.length === 0) { setError("Add a message or at least one photo."); return; }
    if (message.length > LIMITS.messageMaxLength) { setError("Your message is too long."); return; }
    setBusy(true);
    try {
      await saveLocalDraft({ ...parsed.data, id: draftId ?? crypto.randomUUID(), status: "draft", message: message.trim(), photos, updatedAt: new Date().toISOString() });
      window.location.assign("/dashboard");
    } catch {
      setError("Your draft couldn't be saved. Your browser storage may be full or unavailable. Keep this page open and try again.");
      setBusy(false);
    }
  }

  return <div className="dashboard">
    <header className="dashboard-header">
      <a className="brand dashboard-brand" href="/" aria-label="SurpriseMe home"><span className="brand-icon" aria-hidden="true">✦</span>SurpriseMe</a>
      <a className="home-link" href="/dashboard">Back to dashboard</a>
    </header>
    <main className="dashboard-main creation-main">
      <h1>{draftId ? "Edit surprise" : "Create a surprise"}</h1>
      <p className="dashboard-description">Add a message, photos, and a reveal time.</p>
      <p className="local-draft-note">Drafts are saved only in this browser for now. They aren't uploaded, linked to an account, or scheduled for delivery.</p>
      <form onSubmit={save} className="creation-form">
        <fieldset disabled={loading || busy || loadFailed}>
          <legend>Surprise details</legend>
          <label htmlFor="title">Title</label>
          <input id="title" name="title" value={details.title} onChange={change} maxLength={LIMITS.titleMaxLength} required placeholder="e.g. Happy birthday, Sam!" />
          <div className="form-columns">
            <div><label htmlFor="recipientName">Recipient name</label><input id="recipientName" name="recipientName" value={details.recipientName} onChange={change} maxLength={100} required /></div>
            <div><label htmlFor="recipientEmail">Recipient email <span>(optional)</span></label><input id="recipientEmail" name="recipientEmail" type="email" value={details.recipientEmail} onChange={change} /></div>
          </div>
          <div className="form-columns">
            <div><label htmlFor="eventType">Occasion</label><select id="eventType" name="eventType" value={details.eventType} onChange={change}>{EVENT_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll("-", " ")}</option>)}</select></div>
            <div><label htmlFor="revealStyle">Reveal style</label><select id="revealStyle" name="revealStyle" value={details.revealStyle} onChange={change}>{REVEAL_STYLES.map((style) => <option key={style} value={style}>{style.replaceAll("-", " ")}</option>)}</select></div>
          </div>
          <label htmlFor="deliverAt">Reveal date and time</label>
          <input id="deliverAt" name="deliverAt" type="datetime-local" value={details.deliverAt} onChange={change} required aria-describedby="time-help" />
          <p className="field-help" id="time-help">In your local time zone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).</p>
        </fieldset>
        <fieldset disabled={loading || busy || loadFailed}>
          <legend>Message & photos</legend>
          <label htmlFor="message">Your message</label>
          <textarea id="message" value={message} onChange={(event) => { setMessage(event.target.value); setError(""); }} maxLength={LIMITS.messageMaxLength} rows={7} placeholder="Write your message here…" aria-describedby="message-count" />
          <p className="field-help character-count" id="message-count">{message.length} / {LIMITS.messageMaxLength}</p>
          <label htmlFor="photos">Photos</label>
          <p className="field-help" id="photo-help">JPG, PNG, or WebP. Up to 5 MB each, {LIMITS.maxPhotosPerSurprise} photos total. Add a message, photos, or both.</p>
          <input className="photo-input" id="photos" type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} multiple onChange={addPhotos} aria-describedby="photo-help photo-count" />
          <p className="field-help" id="photo-count">{photos.length} / {LIMITS.maxPhotosPerSurprise} photos selected</p>
          {photoError && <p className="form-error" role="alert">{photoError}</p>}
          <ul className="photo-grid">{photos.map((file, index) => <PhotoPreview key={`${file.name}-${index}`} file={file} remove={() => { setPhotos(photos.filter((_, i) => i !== index)); setPhotoError(""); }} />)}</ul>
        </fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="creation-actions"><a className="home-link" href="/dashboard">Cancel</a><button type="submit" className="create-button" disabled={loading || busy || loadFailed}>{loading ? "Loading…" : busy ? "Saving…" : "Save draft"}</button></div>
      </form>
    </main>
  </div>;
}
