export const metadata = { title: "cal-labels privacy policy" };

export default function Privacy() {
  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 680, margin: "0 auto", padding: "32px 16px", lineHeight: 1.6 }}>
      <h1>cal-labels privacy policy</h1>
      <p>Last updated 26 October 2026.</p>
      <p>
        Calendar Themes (cal-labels) is operated by Waa Labs. Each person who connects it signs in with their own Google
        account, and it only works with that person&apos;s own calendar: it reads events and sets their colour labels.
      </p>
      <h2>What it accesses</h2>
      <p>
        With the user&apos;s permission, cal-labels reads calendar events (titles, notes, times) and calendar colour
        labels, and changes only the colour label on events. It does not change event times, titles, descriptions or
        attendees, and does not send notifications.
      </p>
      <h2>What it stores</h2>
      <p>
        cal-labels has no database. Your Google sign-in is encrypted into the access token your AI app holds; the server
        keeps no copy. It does not store, log, sell or share calendar content. Event data is
        processed in memory for the duration of a request and then discarded.
      </p>
      <h2>Use of Google data</h2>
      <p>
        cal-labels&apos; use of information received from Google APIs adheres to the Google API Services User Data
        Policy, including the Limited Use requirements.
      </p>
      <h2>Revoking access</h2>
      <p>
        Access can be revoked at any time from the Google Account &rarr; Security &rarr; Third-party connections page.
      </p>
      <h2>Contact</h2>
      <p>heycarty@gmail.com</p>
    </main>
  );
}
