import { useState } from "react";
import type { Surprise } from "@surpriseme/shared";
import "../styles/dashboard.css";

// Replace with GET /surprises when the API is connected.
const allSurprises: Surprise[] = [];

export default function Dashboard() {
  const [filter, setFilter] = useState("all");
  const surprises = allSurprises.filter((surprise) => filter === "all" || surprise.status === filter);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <a className="brand dashboard-brand" href="/" aria-label="SurpriseMe home">
          <span className="brand-icon" aria-hidden="true">✦</span>SurpriseMe
        </a>
        <a className="home-link" href="/">Back to home</a>
      </header>
      <main className="dashboard-main">
        <div className="dashboard-heading">
          <div>
            <h1>Your surprises</h1>
            <p className="dashboard-description">View and manage your surprises.</p>
          </div>
          <div className="create-placeholder">
            <button type="button" className="create-button" disabled aria-describedby="create-note">+ New surprise</button>
            <span id="create-note">Creation page coming soon</span>
          </div>
        </div>
        <section className="surprises-panel" aria-label="Surprises">
          <div className="list-toolbar">
            <h2>All surprises <span className="list-count">{allSurprises.length}</span></h2>
            <label className="status-filter">
              Status
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th scope="col">Surprise</th><th scope="col">Recipient</th><th scope="col">Delivery date</th><th scope="col">Status</th></tr></thead>
              <tbody>
                {surprises.map((surprise) => (
                  <tr key={surprise.id}>
                    <th scope="row">{surprise.title}<span className="event-type">{surprise.eventType.replaceAll("-", " ")}</span></th>
                    <td>{surprise.recipientName}</td>
                    <td>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(surprise.deliverAt))}</td>
                    <td><span className={`status-badge status-${surprise.status}`}>{surprise.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {surprises.length === 0 && <p className="empty-list" role="status">{filter === "all" ? "No surprises yet." : "No surprises with this status."}</p>}
        </section>
      </main>
    </div>
  );
}
