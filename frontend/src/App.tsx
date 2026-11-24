import { useState } from "react";
import { EVENT_TYPES, type EventType } from "@surpriseme/shared";

export default function App() {
  const [eventType, setEventType] = useState<EventType>("birthday");

  return (
    <main className="starter">
      <p className="brand">SurpriseMe</p>
      <h1>A little surprise. A big smile.</h1>
      <p>Your next thoughtful moment starts here.</p>
      <label htmlFor="event-type">What's the occasion?</label>
      <select
        id="event-type"
        value={eventType}
        onChange={(event) => setEventType(event.target.value as EventType)}
      >
        {EVENT_TYPES.map((type) => (
          <option key={type} value={type}>
            {type.replaceAll("-", " ")}
          </option>
        ))}
      </select>
      <p className="note">More surprises coming soon.</p>
    </main>
  );
}
