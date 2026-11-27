import { useEffect, useState } from "react";
import { getLocalDraft, type LocalDraft } from "../api/local-drafts";
import "../styles/dashboard.css";
import "../styles/surprise-details.css";

function SavedPhoto({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const preview = URL.createObjectURL(file);
    setUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [file]);

  return (
    <figure className="saved-photo">
      {url && <a href={url} target="_blank" rel="noreferrer" aria-label={`Open photo: ${file.name} (new tab)`}>
        <img src={url} alt={file.name} loading="lazy" />
      </a>}
      <figcaption title={file.name}>{file.name}</figcaption>
    </figure>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function SurpriseDetails({ id }: { id: string }) {
  const [draft, setDraft] = useState<LocalDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setDraft(null);
    getLocalDraft(id).then((result) => {
      if (active) setDraft(result ?? null);
    }).catch(() => {
      if (active) setError("This surprise couldn't be loaded. Browser storage may be unavailable. Try refreshing the page.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <a className="brand dashboard-brand" href="/" aria-label="SurpriseMe home">
          <span className="brand-icon" aria-hidden="true">✦</span>SurpriseMe
        </a>
        <a className="home-link" href="/dashboard">Back to dashboard</a>
      </header>
      <main className="dashboard-main detail-main" aria-busy={loading}>
        {loading ? <p role="status">Loading surprise…</p> : error ? <>
          <h1>Couldn't load surprise</h1>
          <p className="form-error" role="alert">{error}</p>
        </> : !draft ? <>
          <h1>Surprise not found</h1>
          <p className="dashboard-description">This draft isn't saved in this browser. Open a surprise from your dashboard or create a new one.</p>
          <a className="create-button detail-new-link" href="/surprises/new">+ New surprise</a>
        </> : <>
          <div className="dashboard-heading">
            <div>
              <p className="detail-eyebrow">Surprise details</p>
              <h1 className="detail-title">{draft.title}</h1>
            </div>
            <a className="create-button" href={`/surprises/new?draft=${encodeURIComponent(draft.id)}`}>Edit surprise</a>
          </div>
          <p className="local-draft-note">Saved only in this browser. This draft isn't linked to your account or scheduled for delivery.</p>
          <section className="detail-panel" aria-labelledby="overview-title">
            <div className="detail-section-heading"><h2 id="overview-title">Overview</h2><span className="status-badge status-draft">Draft</span></div>
            <dl className="detail-grid">
              <div><dt>Recipient</dt><dd>{draft.recipientName}</dd></div>
              <div><dt>Recipient email</dt><dd>{draft.recipientEmail || "Not added"}</dd></div>
              <div><dt>Occasion</dt><dd className="detail-capitalize">{draft.eventType.replaceAll("-", " ")}</dd></div>
              <div><dt>Reveal style</dt><dd className="detail-capitalize">{draft.revealStyle.replaceAll("-", " ")}</dd></div>
              <div><dt>Reveal time</dt><dd><time dateTime={draft.deliverAt}>{formatDate(draft.deliverAt)}</time><span className="detail-timezone">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span></dd></div>
              <div><dt>Last saved</dt><dd><time dateTime={draft.updatedAt}>{formatDate(draft.updatedAt)}</time></dd></div>
            </dl>
          </section>
          <section className="detail-panel" aria-labelledby="message-title">
            <h2 id="message-title">Message</h2>
            {draft.message ? <p className="saved-message">{draft.message}</p> : <p className="detail-empty">No message added.</p>}
          </section>
          <section className="detail-panel" aria-labelledby="photos-title">
            <h2 id="photos-title">Photos <span className="list-count">{draft.photos.length}</span></h2>
            {draft.photos.length ? <div className="saved-photo-grid">{draft.photos.map((file, index) => <SavedPhoto key={`${file.name}-${index}`} file={file} />)}</div> : <p className="detail-empty">No photos added.</p>}
          </section>
          <section className="detail-panel" aria-labelledby="delivery-title">
            <h2 id="delivery-title">Delivery & sharing</h2>
            <p className="detail-empty">Email delivery, recipient links, and cancellation will be available once the backend is connected.</p>
          </section>
        </>}
      </main>
    </div>
  );
}
